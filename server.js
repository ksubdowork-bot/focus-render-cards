// server.js  — ESM only (import만 사용)
// Render 환경변수 사용(OPENAI_API_KEY). 로컬 .env는 선택.
try { (await import('dotenv')).config(); } catch (_) {}

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- 기본 설정
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // public/index.html 제공

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------------- 임시 메모리 저장소 (Upstash 미사용 시)
const personas = {}; // { id: { id, name, role, traits, description } }

// ===== 페르소나 CRUD (프런트에서 필요하면 사용) =====
app.get("/personas-list", (req, res) => {
  res.json({ ok: true, items: Object.values(personas) });
});

app.post("/persona", (req, res) => {
  const id = req.body.id || uuidv4();
  const persona = {
    id,
    name: req.body.name || "",
    role: req.body.role || "",
    traits: req.body.traits || "",
    description: req.body.description || "",
  };
  personas[id] = persona;
  res.json({ ok: true, item: persona });
});

app.put("/persona", (req, res) => {
  const id = req.body.id;
  if (!id || !personas[id]) return res.status(404).json({ ok: false, error: "not_found" });
  personas[id] = { ...personas[id], ...req.body };
  res.json({ ok: true, item: personas[id] });
});

app.delete("/persona/:id", (req, res) => {
  const { id } = req.params;
  if (!personas[id]) return res.status(404).json({ ok: false, error: "not_found" });
  delete personas[id];
  res.json({ ok: true });
});

// ---------------------- SOLO 대화 (프런트: /chat/solo)
app.post("/chat/solo", async (req, res) => {
  try {
    const { persona, personaId, question = "", historyLimit = 20, forceDemo } = req.body || {};
    const p = persona || personas[personaId]; // 객체 or ID 조회
    if (!p) return res.status(400).json({ ok: false, error: "persona_not_found" });

    const isDemo = forceDemo || !process.env.OPENAI_API_KEY;
    if (isDemo) {
      return res.json({
        ok: true,
        answer: `[DEMO] ${p.name} 입장에서: ${question} (historyLimit=${historyLimit})`,
      });
    }

    // LIVE (OpenAI Responses API)
    const messages = [
      { role: "system", content: `너는 다음 페르소나처럼 답변해: 이름:${p.name}, 역할:${p.role}, 성향:${p.traits}. 한글로 간결히.` },
      { role: "user", content: question || "질문이 없습니다." },
    ];
    const text = await openaiChat(messages);
    return res.json({ ok: true, answer: text });
  } catch (e) {
    console.error("solo error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---------------------- GROUP 대화 (프런트: /chat/group)
app.post("/chat/group", async (req, res) => {
  try {
    const { personas: pObjs = [], personaIds = [], topic = "", rounds = 2, historyLimit = 20, forceDemo } = req.body || {};

    // 선택된 참가자 확정
    let picks = Array.isArray(pObjs) && pObjs.length ? pObjs : [];
    if (!picks.length && Array.isArray(personaIds) && personaIds.length) {
      picks = personaIds.map(id => personas[id]).filter(Boolean);
    }
    if (picks.length < 2) return res.status(400).json({ ok: false, error: "need_at_least_2_personas" });
    if (!topic) return res.status(400).json({ ok: false, error: "missing_topic" });

    const isDemo = forceDemo || !process.env.OPENAI_API_KEY;
    if (isDemo) {
      const lines = [];
      for (let r = 1; r <= Number(rounds || 2); r++) {
        for (const p of picks) lines.push(`${p.name}: [DEMO r${r}] ${topic}에 대한 의견`);
      }
      return res.json({
        ok: true,
        transcript: lines.map(l => ({ speaker: l.split(":")[0], text: l.split(":").slice(1).join(":").trim() })),
        summary: `[DEMO] 참가자들이 ${rounds}라운드 동안 '${topic}'에 대해 의견을 교환했습니다. (historyLimit=${historyLimit})`,
      });
    }

    // LIVE (OpenAI Responses API) — '이름: 발언' 형식으로 유도
    const roster = picks.map(p => `- ${p.name} (${p.role}) / 성향:${p.traits}`).join("\n");
    const sys =
      `너는 모더레이터야. 아래 참여자들이 '${topic}'를 ${rounds} 라운드로 토론하도록 해.\n` +
      `각 발언은 반드시 "이름: 내용" 형식으로 한 줄씩 출력해. 마지막엔 '요약:' 한 줄을 붙여.\n` +
      `참여자:\n${roster}\n(최근 컨텍스트 ${historyLimit}개 사용)`;

    const text = await openaiChat([
      { role: "system", content: sys },
      { role: "user", content: "토론을 시작해." },
    ]);

    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const transcript = [];
    let summary = "";
    for (const line of lines) {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (m) transcript.push({ speaker: m[1], text: m[2] });
      if (/^요약\s*:/.test(line)) summary = line.replace(/^요약\s*:\s*/,"");
    }
    if (!summary) summary = "토론이 종료되었습니다.";

    return res.json({ ok: true, transcript, summary });
  } catch (e) {
    console.error("group error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---------------------- OpenAI helper (Responses API)
async function openaiChat(messages) {
  // messages = [{ role: "system"|"user"|"assistant", content: "..." }, ...]
  const prompt = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",    // ← 필수: text가 아니라 input_text
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error("openai_error " + t);
  }

  const data = await r.json();

  // 응답 파싱: 최신 Responses API 우선 → 과거 포맷 보조
  const txt =
    data.output_text ??
    data.output?.[0]?.content?.[0]?.text ??
    data.choices?.[0]?.message?.content ??
    JSON.stringify(data);

  return txt;
}

// ---------------------- 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
