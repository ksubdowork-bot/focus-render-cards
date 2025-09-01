
import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";

// Helper: Upstash Redis
async function redisCommand(command, ...args) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const url = REDIS_URL + "/" + command + "/" + args.map(a => encodeURIComponent(a)).join("/");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  return res.json();
}

// --- Persona APIs ---
app.post("/api/persona", async (req, res) => {
  const { id, name, role, traits, description } = req.body;
  const persona = { id, name, role, traits, description };
  if (!REDIS_URL) return res.json({ ok: true, demo: true, persona });
  await redisCommand("SET", `persona:${id}`, JSON.stringify(persona));
  res.json({ ok: true, persona });
});

app.get("/api/personas-list", async (req, res) => {
  if (!REDIS_URL) return res.json({ ok: true, items: [] });
  const keys = await redisCommand("KEYS", "persona:*");
  if (!keys || !keys.result) return res.json({ ok: true, items: [] });

  let items = [];
  for (const key of keys.result) {
    const raw = await redisCommand("GET", key);
    try {
      let val = raw.result || raw.value || raw.data || raw;
      if (typeof val === "string") val = JSON.parse(val);
      items.push(val);
    } catch {
      await redisCommand("DEL", key);
    }
  }
  res.json({ ok: true, items });
});

app.delete("/api/persona/:id", async (req, res) => {
  const { id } = req.params;
  if (!REDIS_URL) return res.json({ ok: true, demo: true });
  await redisCommand("DEL", `persona:${id}`);
  res.json({ ok: true });
});

// --- Chat (Solo + Group) ---
async function chatWithOpenAI(messages, forceDemo = false) {
  if (forceDemo || !OPENAI_KEY) {
    return { role: "assistant", content: "DEMO 응답: " + messages[messages.length-1].content };
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages
    })
  });
  const j = await r.json();
  return j.choices?.[0]?.message || { role: "assistant", content: "에러 발생" };
}

app.post("/api/chat-solo", async (req, res) => {
  const { persona, question, forceDemo } = req.body;
  const messages = [
    { role: "system", content: `당신은 ${persona.name} (${persona.role}, ${persona.traits})입니다. 설명: ${persona.description}` },
    { role: "user", content: question }
  ];
  const answer = await chatWithOpenAI(messages, forceDemo);
  res.json({ ok: true, answer });
});

app.post("/api/chat-group", async (req, res) => {
  const { personas, question, rounds = 2, forceDemo } = req.body;
  let transcript = [];
  let context = `질문: ${question}`;

  for (let r = 1; r <= rounds; r++) {
    for (const p of personas) {
      const messages = [
        { role: "system", content: `당신은 ${p.name} (${p.role}, ${p.traits})입니다. 설명: ${p.description}. 그룹 토론 중 ${r}라운드에서 발언합니다. 이전 대화:${context}` },
        { role: "user", content: question }
      ];
      const answer = await chatWithOpenAI(messages, forceDemo);
      transcript.push({ speaker: p.name, text: answer.content });
      context += `\n${p.name}: ${answer.content}`;
    }
  }

  const mod = await chatWithOpenAI(
    [{ role: "system", content: "너는 모더레이터다. 아래 토론을 요약해줘:\n" + context }],
    forceDemo
  );
  res.json({ ok: true, transcript, summary: mod.content });
});

app.listen(PORT, () => console.log("Server running on " + PORT));
