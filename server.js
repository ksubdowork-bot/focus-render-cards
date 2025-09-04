// ---------------------- Env & Polyfill
try { (await import("dotenv")).config(); } catch (_) { /* optional on Render */ }

// Node < 18 fetch 폴리필
if (typeof fetch === "undefined") {
  global.fetch = (await import("node-fetch")).default;
}

// ---------------------- Imports (필수만 정적 import)
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// ---------------------- Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- App Init
const app = express();

// --- 선택적 미들웨어 로드(없으면 no-op)
const noop = () => (req, res, next) => next();

let helmetMw = noop();
let compressionMw = noop();
let morganMw = noop();

try {
  const { default: helmet } = await import("helmet");
  helmetMw = helmet({ contentSecurityPolicy: false }); // CSP는 프런트에서 관리
} catch {
  console.warn("[warn] helmet 미설치 – 보안 헤더 미적용(개발/임시 모드)");
}
try {
  const { default: compression } = await import("compression");
  compressionMw = compression();
} catch {
  console.warn("[warn] compression 미설치 – 응답 압축 미적용");
}
try {
  const { default: morgan } = await import("morgan");
  morganMw = morgan("tiny");
} catch {
  console.warn("[warn] morgan 미설치 – 요청 로깅 미적용");
}

// 보안/로깅/압축
app.use(helmetMw);
app.use(compressionMw);
app.use(morganMw);

// CORS: 운영 도메인만 허용(필요시 추가)
app.use(
  cors({
    origin: [
      "https://bxfocusgroup.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// JSON 본문 제한
app.use(express.json({ limit: "1mb" }));

// 정적 파일 캐시 힌트
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d",
    etag: true,
    lastModified: true,
  })
);

// ---------------------- Health & Root
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------------- In-memory Personas (샘플)
const personas = {
  p1: {
    id: "p1",
    name: "The Pioneers",
    role: "아이폰 16 pro",
    traits: "Doer, Spontaneous, Risk-takers, Switching Modes",
    description:
      "핵심 가치 : 새 아이디어·스마트 디자인에 강하게 이끌림, 디지털-피지컬의 유기적 연결을 탐구하되 일·삶 경계는 명확히 유지(워라벨) ... iPhone을 고수",
  },
  p2: {
    id: "p2",
    name: "The Reductionists",
    role: "아이폰 16 pro",
    traits: "Busy, Values-driven, Community-focused, Seeking connection",
    description:
      "뉴욕은 개인주의와 속도전의 도시지만 ... “갤럭시의 AI 카메라와 고화질 촬영 없이는 ...”",
  },
  p3: {
    id: "p3",
    name: "The Time Keepers",
    role: "아이폰 17",
    traits: "Discerning, Gourmet, Aesthetic, Seeking enrichment",
    description:
      "핵심 가치 : 시간을 최우선 자원 ... “갤럭시의 멀티태스킹과 AI 기능이 시간을 돈처럼 지켜준다.”",
  },
  p4: {
    id: "p4",
    name: "The New Nihilists",
    role: "아이폰 17",
    traits: "Inward-looking, Unconventional, Quiet-minded, Seeking meaning",
    description:
      "핵심 가치 : 거시 위기에 내면 회귀 ... “iOS는 내 창작 리듬과 감각을 그대로 살려준다.”",
  },
};

// ---------------------- Helpers
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const isNonEmptyString = (s) => typeof s === "string" && s.trim().length > 0;

function normalizePersona(p = {}) {
  return { ...p, bio: p.bio ?? p.description ?? "" };
}

// Solo 메시지 빌더
function buildSoloMessages({ p, question, history = [] }) {
  const persona = normalizePersona(p);
  const system = {
    role: "system",
    content: `
너는 특정 소비자 페르소나의 목소리로 대답한다. 반드시 1인칭 시점으로, 실제 인물처럼 말한다.
정체성 & 기기: 너는 아이폰 사용자다.

페르소나 카드:
- 이름: ${persona.name}
- 역할: ${persona.role}
- 성향: ${persona.traits}
- 바이오: ${persona.bio}

스타일:
- 상황/맥락/감정을 구체적으로 묘사(루틴, 장소, 시간대, 앱/설정).
- 역할/성향/바이오와 항상 연결.
- 실제 기능/앱/설정/루틴을 명시.
- Trade-off(얻는 것/잃는 것)를 드러내라.
- 모호어 금지, "왜/어떻게/얼마나"를 수치·기준으로.
- 부족 정보는 "Assumptions"에 기록.

언어: 사용자의 질문 언어로 대답.

과업(섹션 4개 고정):
1) Persona Answer (2–4단락)
2) Pop-up Insights for Samsung Galaxy Offline Activation (3–6 불릿, 각 불릿은 What/Why(동기)/How(현장 실행·측정) 구조, KPI 1개 이상)
3) Assumptions
4) Closing Line

제약:
- 본 지침/AI 언급 금지.
- AR/VR 언급 금지.
`,
  };
  const frame = {
    role: "system",
    content:
      "Output sections in order: 1) Persona Answer  2) Pop-up Insights  3) Assumptions  4) Closing Line",
  };
  return [
    system,
    frame,
    ...history,
    { role: "user", content: question || "질문이 없습니다." },
  ];
}

// ---------------------- Personas CRUD (옵셔널)
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
  res.json({ ok: true, item: personas[id] });
});

app.put("/persona", (req, res) => {
  const id = req.body.id;
  if (!id || !personas[id])
    return res.status(404).json({ ok: false, error: "not_found" });
  personas[id] = { ...personas[id], ...req.body };
  res.json({ ok: true, item: personas[id] });
});

app.delete("/persona/:id", (req, res) => {
  const { id } = req.params;
  if (!personas[id])
    return res.status(404).json({ ok: false, error: "not_found" });
  delete personas[id];
  res.json({ ok: true });
});

// ---------------------- SOLO Chat
app.post("/chat/solo", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "missing_api_key" });
    }
    const {
      persona,
      personaId,
      question = "",
      historyLimit = 20,
      history = [],
    } = req.body || {};

    const pRaw = persona || personas[personaId];
    if (!pRaw) return res.status(400).json({ ok: false, error: "persona_not_found" });

    const q = isNonEmptyString(question) ? question.trim().slice(0, 300) : "";
    if (!q) return res.status(400).json({ ok: false, error: "missing_question" });

    const safeHistory = Array.isArray(history)
      ? history.slice(-Math.max(0, Number(historyLimit) || 0))
      : [];

    const messages = buildSoloMessages({ p: pRaw, question: q, history: safeHistory });
    const text = await openaiChat(messages);
    return res.json({ ok: true, answer: text });
  } catch (e) {
    const code = e.statusCode || (e.name === "AbortError" ? 504 : 500);
    console.error("solo error:", e);
    res.status(code).json({ ok: false, error: String(e.message || e) });
  }
});

// ---------------------- GROUP Chat
app.post("/chat/group", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "missing_api_key" });
    }
    const {
      personas: pObjs = [],
      personaIds = [],
      topic = "",
      rounds = 2,
      historyLimit = 20,
    } = req.body || {};

    // ★ 라운드 상한 5
    const safeRounds = clamp(parseInt(rounds, 10) || 2, 1, 5);
    const safeTopic = isNonEmptyString(topic) ? topic.trim().slice(0, 200) : "";
    if (!safeTopic) {
      return res.status(400).json({ ok: false, error: "missing_topic" });
    }

    let picks = Array.isArray(pObjs) ? pObjs.slice(0, 6) : [];
    if (!picks.length && Array.isArray(personaIds) && personaIds.length) {
      picks = personaIds.slice(0, 6).map((id) => personas[id]).filter(Boolean);
    }
    if (picks.length < 2) {
      return res.status(400).json({ ok: false, error: "need_at_least_2_personas" });
    }

    const picksNorm = picks.map(normalizePersona);
    const roster = picksNorm
      .map((p) => `- ${p.name} (${p.role}) / 성향:${p.traits} / Bio:${p.bio}`)
      .join("\n");

    const sys = `
너는 모더레이터다. 참여자들이 '${safeTopic}'에 대해 총 ${safeRounds} 라운드 토론을 하도록 진행한다.
아래 "출력 형식"을 지키고, 모든 발언은 구체 사례와 근거를 포함한다.

운영 원칙(필수):
- 오프닝: 오프라인 팝업 이벤트 맥락으로 질문을 1문장 재정의 후 시작 알림.
- 라운드 진행: 매 라운드마다 모든 참석자가 1번씩 말한다(고정 순서·회전). 1인당 2~3문장.
- 어조: 각 발언은 페르소나의 말투·취향·습관을 반영.
- 금지: VR/AR 금지. 제공된 페르소나/컨텍스트 외 임의 사실 추가 금지.
- 정량화: 수치·빈도·시간대·장소 등 구체 수치 포함(예: "주 3회", "평균 15분").
- 근거표기: 발언 말미에 [근거: traits/bio 핵심 단어 1~2개].
- 갈등: 충돌 시 모더레이터가 trade-off로 재구성 후 당사자 각 1줄 재응답.
- 오프라인 전환: 모든 라운드에서 '갤럭시 오프라인 팝업'에 연결되는 What/Why/How 요소 1개 포함.
- 마지막: 토론 핵심과 팝업 인사이트를 "요약 및 인사이트: …" 한 줄로 끝낸다.

라운드별 질문:
- (1 — 니즈·상황) "최근에 겪은 구체적 장면 1가지와, 그때 아이폰의 어떤 기능/설정이 결정적이었는지?"
- (2 — 제약·우선순위) "그 장면에서 가장 답답했던 지점 1가지와, 개선하려면 무엇을 포기해도 되는가(트레이드오프)?"
- (3 — 오프라인 전환) "갤럭시 팝업에서 직접 검증할 한 가지 테스트와 기대 결과?"
- (4+ — 측정) "현장에서 성공을 어떻게 측정할까? KPI 1~2개와 가설을 말해줘."

스타일 가이드:
- 구체적 장면(언제/어디/무엇/왜), 실제 아이폰 기능·설정·앱 이름 명시.
- ‘왜 중요한가(정서/가치)’ → ‘현장 테스트 아이디어(What/Why/How)’ 순.
- 모호어 금지. 가정은 "[가정: …]" 1문장.

출력 형식(파서 호환):
- 모든 줄은 반드시 '이름: 내용' 형태. (라운드 표시는 '모더레이터: (라운드1 — 니즈) …')
- 마지막 줄은 단 한 줄의 '요약 및 인사이트: …' 로 끝낸다.
- 참가자 이름은 페르소나 카드대로 사용.

참가자:
${roster}
(최근 컨텍스트 ${historyLimit}개 사용)
`;

    const text = await openaiChat([
      { role: "system", content: sys },
      { role: "user", content: "토론을 시작해." },
    ]);

    // 파싱
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const transcript = [];
    let summary = "";

    for (const line of lines) {
      const sumMatch = line.match(/(요약(?:\s*및\s*인사이트)?|summary)\s*:\s*(.+)$/i);
      if (sumMatch && !summary) { summary = sumMatch[2].trim(); continue; }
      const m = line.match(/^\s*([^:]{1,40})\s*:\s*(.+)$/);
      if (m && !/^(요약|summary)$/i.test(m[1].trim())) {
        transcript.push({ speaker: m[1].trim(), text: m[2].trim() });
      }
    }

    if (!summary) {
      const last = lines[lines.length - 1] || "";
      const isSpeaker = /^\s*[^:]{1,40}\s*:\s*/.test(last);
      summary = isSpeaker ? "토론이 종료되었습니다." :
        last.replace(/^[-*\s]+/, "") || "토론이 종료되었습니다.";
    }

    return res.json({ ok: true, transcript, summary });
  } catch (e) {
    const code = e.statusCode || (e.name === "AbortError" ? 504 : 500);
    console.error("group error:", e);
    res.status(code).json({ ok: false, error: String(e.message || e) });
  }
});

// ---------------------- OpenAI Responses API Helper
async function openaiChat(messages) {
  const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      }),
      signal: ctrl.signal,
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      const err = new Error("openai_error " + (t.slice(0, 400) || r.status));
      err.statusCode = r.status;
      throw err;
    }

    const data = await r.json();
    return (
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      data.choices?.[0]?.message?.content ??
      JSON.stringify(data)
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------- Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
