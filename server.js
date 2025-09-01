const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 메모리 저장소 (Upstash 없을 경우)
let personas = {};

// 페르소나 목록
app.get('/api/personas-list', (req, res) => {
  res.json(Object.values(personas));
});

// 페르소나 추가
app.post('/api/persona', (req, res) => {
  const id = uuidv4();
  const persona = { id, ...req.body };
  personas[id] = persona;
  res.json({ ok: true, persona });
});

// 페르소나 수정
app.put('/api/persona/:id', (req, res) => {
  const { id } = req.params;
  if (!personas[id]) return res.status(404).json({ error: 'not found' });
  personas[id] = { ...personas[id], ...req.body };
  res.json({ ok: true, persona: personas[id] });
});

// 페르소나 삭제
app.delete('/api/persona/:id', (req, res) => {
  const { id } = req.params;
  if (!personas[id]) return res.status(404).json({ error: 'not found' });
  delete personas[id];
  res.json({ ok: true });
});

// 솔로 대화 (데모)
app.post('/api/chat-solo', (req, res) => {
  const { personaId, question } = req.body;
  const persona = personas[personaId];
  if (!persona) return res.json({ error: 'persona_not_found' });
  res.json({ answer: `[DEMO] ${persona.name} 입장에서: ${question}` });
});

// 그룹 대화 (데모)
app.post('/api/chat-group', (req, res) => {
  const { personaIds, question } = req.body;
  const answers = personaIds.map(id => {
    const p = personas[id];
    return `${p.name}: [DEMO 응답] ${question}`;
  });
  res.json({ transcript: answers });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
