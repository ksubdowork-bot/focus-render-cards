// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ====== 메모리 저장소 (Upstash 없을 때 임시 저장) ======
const personas = {}; // { id: {id,name,role,traits,description} }

// ====== 페르소나 CRUD ======
app.get('/api/personas-list', (req, res) => {
  res.json({ ok: true, items: Object.values(personas) });
});

app.post('/api/persona', (req, res) => {
  const id = req.body.id || uuidv4();
  const persona = {
    id,
    name: req.body.name || '',
    role: req.body.role || '',
    traits: req.body.traits || '',
    description: req.body.description || '',
  };
  personas[id] = persona;
  res.json({ ok: true, item: persona });
});

app.put('/api/persona', (req, res) => {
  const id = req.body.id;
  if (!id || !personas[id]) return res.status(404).json({ ok:false, error: 'not_found' });
  personas[id] = { ...personas[id], ...req.body };
  res.json({ ok: true, item: personas[id] });
});

app.delete('/api/persona/:id', (req, res) => {
  const { id } = req.params;
  if (!personas[id]) return res.status(404).json({ ok:false, error: 'not_found' });
  delete personas[id];
  res.json({ ok: true });
});

// ====== 솔로 대화 ======
app.post('/api/chat-solo', async (req, res) => {
  try {
    const { persona, personaId, question = '', forceDemo } = req.body || {};
    // persona 객체가 오면 그대로, 아니면 id로 조회
    const p = persona || personas[personaId];
    if (!p) return res.json({ ok:false, error:'persona_not_found' });

    const isDemo = forceDemo || !process.env.OPENAI_API_KEY;
    if (isDemo) {
      return res.json({
        ok: true,
        answer: { role: 'assistant', content: `[DEMO] ${p.name} 입장에서: ${question}` }
      });
    }

    // LIVE (OpenAI Responses API)
    const messages = [
      { role: 'system', content: `너는 다음 페르소나처럼 답변해: 이름:${p.name}, 역할:${p.role}, 성향:${p.traits}. 한글로 답해.` },
      { role: 'user', content: question || '질문이 없습니다.' }
    ];
    const out = await openaiChat(messages);
    return res.json({ ok:true, answer:{ role:'assistant', content: out }});
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ====== 그룹 대화 (두 페이로드 모두 지원) ======
app.post('/api/chat-group', async (req, res) => {
  try {
    const { personas: pObjs = [], personaIds = [], question = '', rounds = 2, forceDemo } = req.body || {};

    // 1) personas 배열로 왔을 때
    let picks = Array.isArray(pObjs) && pObjs.length ? pObjs : [];

    // 2) personaIds 배열로 왔을 때
    if (!picks.length && Array.isArray(personaIds) && personaIds.length) {
      picks = personaIds.map(id => personas[id]).filter(Boolean);
    }

    if (picks.length < 2) {
      return res.status(400).json({ ok:false, error:'need_at_least_2_personas' });
    }

    const isDemo = forceDemo || !process.env.OPENAI_API_KEY;
    if (isDemo) {
      const transcript = [];
      for (let r = 1; r <= Number(rounds || 2); r++) {
        for (const p of picks) {
          transcript.push({ speaker: p.name || '익명', text: `[DEMO r${r}] ${question}` });
        }
      }
      return res.json({ ok:true, transcript, summary:'[DEMO] 참가자들이 각자의 관점에서 의견을 제시했습니다.' });
    }

    // LIVE (OpenAI Responses API) — '이름: 발언' 라인 파싱
    const roster = picks.map(p => `- ${p.name} (${p.role}) / 성향: ${p.traits}`).join('\n');
    const sys = `너는 모더레이터야. 아래 참여자들이 라운드 방식으로 토론하도록 '이름: 발언' 형식으로 만들어줘.
참여자:
${roster}
규칙: 라운드 ${rounds}회, 서로 짧은 리액션 포함, 마지막에 한 문단 요약.`;

    const messages = [
      { role:'system', content: sys },
      { role:'user', content: `토론 주제: ${question}` }
    ];
    const raw = await openaiChat(messages);

    const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const transcript = [];
    let summary = '';
    for (const line of lines) {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (m) transcript.push({ speaker: m[1], text: m[2] });
      if (/요약|결론/.test(line)) summary += line + '\n';
    }
    if (!summary) summary = '토론이 종료되었습니다.';
    res.json({ ok:true, transcript, summary });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ====== OpenAI helper (Responses API) ======
async function openaiChat(messages){
  const r = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: messages.map(m => ({ role: m.role, content: [{ type:'text', text: m.content }] }))
    })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error('openai_error ' + t);
  }
  const data = await r.json();
  try {
    const block = data.output?.[0];
    const txt = block?.content?.[0]?.text;
    return txt || JSON.stringify(data);
  } catch {
    return JSON.stringify(data);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
