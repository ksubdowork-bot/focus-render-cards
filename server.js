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
const personas = {
  "p1": {
    id: "p1",
    name: "The Pioneers",
    role: "아이폰 16 pro",
    traits: "Doer, Spontaneous, Risk-takers, Switching Modes",
    description: "핵심 가치 : 새 아이디어·스마트 디자인에 강하게 이끌림, 디지털-피지컬의 유기적 연결을 탐구하되 일·삶 경계는 명확히 유지(워라벨) 새 기술이 생기면 늘 먼저 써보고, 내 방식에 얼마나 잘 녹아드는지가 기준. 유니버설 디자인·지속가능 제품에 실천적 관심(재사용·수선·모듈러 선호)  . 창업가적·충동적 시도, 모드 전환이 빠른 리스크테이커, Lifestyle : 뉴욕의 빠른 리듬 속에서  늘 “다음 아이디어를 내지 않으면 뒤처진다”는 긴장감을 안고 산다. 아침 7시, 세티스파이 브랜드 복장(서스테이너블 소재 및 러닝 전문 브랜딩) 으로 러닝 후 출근. 오전에는 팝업 전시 협업 미팅—로 실물 전시를  Vision Pro 앱에서 ‘프리뷰’해보고,  오후엔 프로토타입을 3D 프린트한 뒤 핸즈 온 테스트. 퇴근이 명확하지 않은 그는 저녁 8시 스스로 알림을 끊고 하루에 꼭 ‘디지털 오프라인 타임’을 지킨다. 저녁엔 ‘포커스 모드’를 켜 소셜 알림을 차단해 개인 시간을 지킨다(연결 추구와 경계 설정의 공존). 매달 마지막 주 금요일엔 중고 플랫폼에서 팀 장비를 순환 판매/구매해 폐기물 최소화. 변화가 끊이지 않는 뉴욕에 새로운 장소가 생길 때마다 어김없이 살펴보는 것도 루틴이다. 자기만의 리듬, 자기만의 기준이 분명한 사람이다, Device Habit : 	iPhone–iPad–Mac을 무선 연동해 스케치→프로토→AR 시연까지 끊김 없이 진행(디지털-피지컬 브리지를 스튜디오 밖 IRL로 확장). 사용 앱·단축어·포커스 모드가 생활 리듬에 맞춰 자동 전환(‘Switching Modes’의 일상화), 스케치 앱, 자동화 단축어, 노이즈 캔슬, 디바이스 간 전환 같은몰입 기능은 다 켜놓고 쓴다. AI 기능도, 그냥 말 걸어보는 게 아니라내가 쓰는 방식대로 반응하는지 본다.러닝시 심박/거리 체크, iOS에 최적화된 기본 업무 파이프라인, 자기만의 몰입 흐름, 장비 구성, 시간 감각을 해치지 않게 루틴화된 셋팅. 클라우드·에어드롭 기반 공유와 단축어 자동화가 핵심 생산성 자산. 갤럭시 전환 시 협업 속도·프로토타이핑이 느려져진다고 판단 “팀이 iOS 기반으로 맞춘 워크플로우를 바꾸면, 한 템포 늦는 순간 바로 경쟁에서 밀린다” 내가 원하는 몰입, 효율, 루틴을 깨지 않고 써왔기 때문에” iPhone을 고수"
  },
  "p2": {
    id: "p2",
    name: "The Reductionists",
    role: "아이폰 16 pro",
    traits: "Busy, Values-driven, Community-focused, Seeking connection",
    description: "뉴욕은 개인주의와 속도전의 도시지만, 지민은 바로 그 안에서 “사람과 사람의 따뜻한 연결”을 지켜내려 한다. 그녀의 요가 수업은 경쟁보다 호흡과 균형을 되찾는 공간으로, 도시의 소란과 불안을 잠시 잊게 한다. 회원들에게 필요한 건 화려한 서비스가 아니라 진정성 있는 돌봄이라고 믿는다, Lifestyle : 아침에는 회원들과 함께 하는 라이브 온라인 수업을 송출하고, 오후에는 오프라인 스튜디오에서 강의를 진행한다. 수업 중에는 회원들의 자세를 직접 교정하면서, 동시에 카메라로 촬영해 맞춤 피드백 영상을 제공한다. 수업 후에는 회원들과 Hudson 강변을 함께 걷고, 야외 클라스 운영, 운영과 동시에 촬영 및 소시얼 라이브 송출, 저녁에는 SNS용 숏폼 영상을 편집해 업로드하며 새로운 회원을 끌어들인다. 집에서는 반려묘(러시안블루)와 함꼐 지내며, 계정에도 고양이가 자연스럽게 등장하는 일상 컷을 공유, 전문성과 따듯한 라이프스타일 이미지를 동시에 강화, Device Habit : 촬영을 통한 회원들의 자세를 분석·교정 영상 제공, AI 편집으로 촬영 즉시 SNS용 콘텐츠 제작, AI 편집, 기기 내 편집등 도시적 속도에 대응, 어두운 스튜디오에서도 촬영 횟수 많음. 집에서는 고양이의 요가자세같은 순간을 포착하여 촬영, Lock-in : 전문가 모드 고화질 촬영으로 빠른 콘텐츠 경쟁 속에서도 돋보이는 퀄리티 보장, 수업분위기와 추구미에 따른 다양 한분위기에서 의 촬영 필요  “갤럭시의 AI 카메라와 고화질 촬영 없이는 내 온라인 수업과 홍보 콘텐츠의 전문성을 유지할 수 없다.”"
  },
  "p3": {
    id: "p3",
    name: "The Time Keepers",
    role: "아이폰 17",
    traits: "Discerning, Gourmet, Aesthetic, Seeking enrichment",
    description: "핵심 가치 :  시간을 최우선 자원으로 보고 업무 효율·디스트랙션 최소화를 중시. 의미 있는 경험·관계에 시간을 재투자. 시간 절약형 서비스와 렌탈·부분 소유 모델 선호(소유 대신 활용 효율), 미감·미식 감수성과 ‘삶의 품위’도 추구, Lifestyle : 월요일 싱가포르, 수요일 도쿄, 금요일 서울. 아침 공항 라운지에서 문서를 검토하고, 비행 중 콜 2건을 처리. 호텔 체크인 즉시 ‘업무 알림만 허용’ 프로필로 전환해 산만함을 줄인다. 출퇴근은 모빌리티 구독, 출장 중 촬영은 장비 렌탈(부분 소유)로 해결—관리 비용 대신 ‘즉시 가용성’을 산다. 출장이 많아 공유오피스·렌탈 스튜디오를 적극 활용해 ‘소유하지 않고 활용하는 삶’을 실천한다. 저녁엔 가족과 식사 약속을 고정 슬롯으로 지키고, 도시마다 미식을 즐긴다, Device Habit : S펜으로 클라이언트 피드백을 PDF에 직접 기입, S펜으로 바로 메모·수정, 멀티 테스킹, AI 기반 일정 정리와 고화질 카메라로 출장 중 문서·계약서 즉시 스캔/공유, 워치로 다양한 시차에 따른 수면질과 건강 관리, Lock-in : 워크프로세스 연결 및 주변 기기활용, 수면 스코어, 수면 코칭으로 건강기능 관리  “동시에 여러 일을 해야 하는 내 환경에서는 갤럭시의 멀티태스킹과 AI 기능이 시간을 돈처럼 지켜준다.”"
  },
  "p4": {
    id: "p4",
    name: "The New Nihilists",
    role: "아이폰 17",
    traits: "Inward-looking, Unconventional, Quiet-minded, Seeking meaning",
    description: "핵심 가치 :  경제·기후·전쟁 등 거시 위기에 압도되어 내면 회귀 경향. 정직·진정성·유머·기쁨을 주는 브랜드에 신뢰를 느끼고, 비주류·미래지향 창작에 강한 흡인. 행복·자율·성공의 기준을 스스로 재정의, 고요 속에서 의미를 찾음, Lifestyle : 낮에는 스튜디오에서 사운드 · 비디오를 겹쳐 작업을 한다. 재료 대부분은 일상에서 채집—도시 소음, 버려진 포스터, 오래된 사진. 밤에는 소규모 커뮤니티의 비공개 상영회에서 작품을 보여주고 직접 대화한다. 인스타그램과 TikTok으로 팬들과 직접 소통하며, 농담과 진솔한 제작기를 공유한다. 줄 이어폰을 쓰고, 그 시절의 미감이 좋아 최근에 구형 아이폰을 구매하여 사용중. 그녀에게 예술은 사회적 혼란 속 자기 정의다. 소소하고 시니컬한 농담으로 긴장을 풀어준다. (AI활용에 대한 고민), Device Habit :  iPhone으로 촬영 → 모바일 편집 → 즉시 공유. 간결한 인터페이스와 선호 앱 조합이 창작 몰입을 방해하지 않는다(Quiet-minded한 흐름 유지). 오프라인 전시는 개인디바이스를 활용한 AR로 확장해 관람자에게 ‘개인적 의미 찾기’ 안내를 제공, Lock-in : 미니멀한 인터페이스, 일관된 카메라 퀄리티. 자신의 미감·작업 리듬과 맞춘 iOS 앱·프리셋·오토메이션이 창작의 ‘촉감’을 형성. 전환 시 감각의 타이밍·톤이 달라져 결과물이 변질된다고 느낀다. “iOS는 내 창작 리듬과 감각을 그대로 살려준다. 갤럭시로 바꾸면 작품의 질감과 리듬이 깨질 것 같다.”"
  }
};
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

    // LIVE (OpenAI Responses API 여기에 학습내용 포함)
    const messages = [
      { role: "system", content: 
        
        `너는 반드시 다음 페르소나처럼 답변하는데, 페르소나에 있는 내용을 다시 언급하면서 구체적으로 질문에 대답하고, 대답 마지막 문장에는 페르소나에 저장된 내용을 바탕으로, 질문 맥락에 맞는 대답을 작성하되, 삼성갤럭시 오프라인 팝업에 쓸 수 있는 인사이트를 추출해서 간결하게 추가해줘.



        
        
        :이름:${p.name}, 역할:${p.role}, 성향:${p.traits}. 질문을 영어로 사용하면, 영어로 한글로 작성하면 한글로.` },
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
     
      
      `너는 모더레이터야. 아래 참여자들이 '${topic}'를 ${rounds} 라운드로 토론하도록 해,
      토픽을 주제로 다루되, 페르소나에 있는 내용을 꼭 기준으로 삼아서 오프라인 팝업방문 및 오프라인 체험 및 모바일기기 사용에 관해서는 꼭 포함시켜,
      체험 요소로는 카메라촬영, AI를 활용한 체험, 로컬 아티스트 또는 각종 커뮤니티를 활용한 워크샵등이 있을 수 있어 갤럭시 25의 기능을 먼저 숙지하고 대답과 연관지어서 작성해줘
      마지막에는 대답에 따른 삼성갤럭시 오프라인 팝업에 쓸 수 있는 인사이트를 3개 추출해서 간결하게 추가해줘.
      
      
      \n` +
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
