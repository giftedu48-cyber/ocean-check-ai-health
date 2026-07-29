"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isFirebaseReady,
  loadHealthChecks,
  saveHealthCheck,
  type SavedHealthCheck,
} from "./firebase-health-records";

type Screen = "home" | "check" | "records" | "xray" | "chat";

const assetBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const navItems: { id: Screen; label: string; icon: string }[] = [
  { id: "home", label: "홈", icon: "⌂" },
  { id: "check", label: "건강검진", icon: "✚" },
  { id: "records", label: "건강기록", icon: "▥" },
  { id: "xray", label: "바다 X-ray", icon: "⌁" },
  { id: "chat", label: "AI 상담", icon: "◌" },
];

const regions = {
  "임랑 해역": { score: 93, status: "좋음", change: "+1.6" },
  "일광 해역": { score: 70, status: "주의", change: "-4.2" },
  "송정 해역": { score: 97, status: "좋음", change: "+2.4" },
  "해운대 해역": { score: 98, status: "좋음", change: "+2.8" },
  "광안리 해역": { score: 93, status: "좋음", change: "+1.2" },
  "송도 해역": { score: 89, status: "양호", change: "-0.6" },
  "다대포 해역": { score: 57, status: "위험", change: "-6.8" },
};

const metrics = [
  { label: "생물다양성", score: 88, icon: "♧", tone: "mint" },
  { label: "수질 상태", score: 84, icon: "◒", tone: "blue" },
  { label: "해양 오염도", score: 72, icon: "◇", tone: "amber" },
  { label: "생태계 활력", score: 86, icon: "↗", tone: "purple" },
];

const monthly = [74, 77, 76, 79, 78, 80, 79, 81, 80, 83, 81, 82];
const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

const yearlyRecords = {
  2026: { values: monthly, score: 82, delta: "전년 대비 +4.8%", previous: 79, previousMonth: "04", currentMonth: "07", trend: "회복 추세", biodiversity: "+6점", pollution: "-3점", date: "2026. 07. 24" },
  2025: { values: [69, 70, 72, 71, 73, 74, 72, 75, 76, 77, 77, 78], score: 78, delta: "전년 대비 +5.4%", previous: 73, previousMonth: "04", currentMonth: "12", trend: "완만한 회복", biodiversity: "+4점", pollution: "-2점", date: "2025. 12. 18" },
  2024: { values: [76, 75, 74, 72, 71, 70, 72, 71, 73, 72, 73, 74], score: 74, delta: "전년 대비 -2.6%", previous: 72, previousMonth: "04", currentMonth: "12", trend: "주의 관찰", biodiversity: "-2점", pollution: "-5점", date: "2024. 12. 20" },
};

const xrayRegions = {
  "임랑 해역": {
    slug: "imrang", score: 93, status: "좋음",
    spots: [
      { name: "임랑 해수욕장 앞", x: 60, y: 75, tone: "good", text: "2025년 7회 수질평가에서 부적합 0회였습니다." },
      { name: "임랑 연안", x: 70, y: 70, tone: "warn", text: "일부 시료에서 장구균·대장균 기준 초과가 확인돼 강우 뒤 관찰이 필요합니다." },
    ],
    details: ["수질평가 7회 모두 적합", "장구균 중앙값 10 MPN/100mL", "COD 평균 0.9 mg/L"],
  },
  "일광 해역": {
    slug: "ilgwang", score: 70, status: "주의",
    spots: [
      { name: "일광 해수욕장 앞", x: 61, y: 54, tone: "danger", text: "2025년 수질평가에서 2회 부적합이 확인됐습니다." },
      { name: "일광 연안 남측", x: 56, y: 62, tone: "warn", text: "강우 뒤 오염물질 정체가 수질 악화 원인으로 추정됐습니다." },
    ],
    details: ["수질평가 9회 중 2회 부적합", "장구균 최대 2,080 MPN/100mL", "대장균 중앙값 69 MPN/100mL"],
  },
  "송정 해역": {
    slug: "songjeong", score: 97, status: "좋음",
    spots: [
      { name: "송정 해수욕장 앞", x: 50, y: 63, tone: "good", text: "2025년 7회 수질평가에서 부적합 0회이며 세균 기준 초과 시료도 없었습니다." },
    ],
    details: ["수질평가 7회 모두 적합", "장구균 중앙값 0 MPN/100mL", "부유물질 평균 9.7 mg/L"],
  },
  "해운대 해역": {
    slug: "haeundae", score: 98, status: "좋음",
    spots: [
      { name: "해운대 해수욕장 앞", x: 55, y: 75, tone: "good", text: "2025년 8회 수질평가에서 부적합 0회이며 외해 물질교환이 원활한 것으로 조사됐습니다." },
    ],
    details: ["수질평가 8회 모두 적합", "장구균 중앙값 0 MPN/100mL", "암모니아성질소 평균 0.0295 mg/L"],
  },
  "광안리 해역": {
    slug: "gwangalli", score: 93, status: "좋음",
    spots: [
      { name: "광안리 해수욕장 앞", x: 55, y: 51, tone: "good", text: "2025년 7회 수질평가에서 부적합은 없었습니다." },
      { name: "광안리 연안", x: 58, y: 60, tone: "warn", text: "일부 시료에서 장구균·대장균 기준 초과가 각각 3건 확인됐습니다." },
    ],
    details: ["수질평가 7회 모두 적합", "총인 평균 0.0583 mg/L", "일부 세균 시료 기준 초과"],
  },
  "송도 해역": {
    slug: "songdo", score: 89, status: "양호",
    spots: [
      { name: "송도 해수욕장 앞", x: 70, y: 33, tone: "warn", text: "총인과 암모니아성질소 평균값이 7개 해수욕장 중 가장 높았습니다." },
      { name: "송도 연안", x: 50, y: 60, tone: "good", text: "2025년 7회 수질평가에서는 모두 적합 판정을 받았습니다." },
    ],
    details: ["수질평가 7회 모두 적합", "총인 평균 0.1608 mg/L", "암모니아성질소 평균 0.0598 mg/L"],
  },
  "다대포 해역": {
    slug: "dadaepo", score: 57, status: "위험",
    spots: [
      { name: "다대포 서측 앞바다", x: 48, y: 48, tone: "danger", text: "낙동강 유입 영향으로 1회 부적합, COD·부유물질 평균이 가장 높았습니다." },
      { name: "다대포 동측 앞바다", x: 71, y: 27, tone: "danger", text: "집중호우 때 중앙 우수관을 통한 비점오염 유입으로 2회 부적합했습니다." },
      { name: "낙동강 하구 연안", x: 43, y: 46, tone: "warn", text: "서측 염분 평균이 31.57 psu로 가장 낮아 하천수 영향이 확인됐습니다." },
    ],
    details: ["동·서측 합계 3회 부적합", "서측 COD 1.3·SS 18.5 mg/L", "강우·낙동강 유입 영향"],
  },
} as const;

function Logo() {
  return (
    <div className="brand">
      <div className="logoMark"><span /><span /><span /></div>
      <div><strong>OCEAN CHECK</strong><small>AI OCEAN HEALTHCARE</small></div>
    </div>
  );
}

const getHealthTone = (score: number) => score >= 80 ? "good" : score >= 60 ? "caution" : "danger";

function ScoreRing({ score, compact = false }: { score: number; compact?: boolean }) {
  return (
    <div className={`scoreRing tone-${getHealthTone(score)} ${compact ? "compact" : ""}`} style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
      <div className="scoreInner">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function StatusPill({ children = "양호", score = 90 }: { children?: React.ReactNode; score?: number }) {
  return <span className={`statusPill tone-${getHealthTone(score)}`}><i /> {children}</span>;
}

function MiniBars({ values = monthly }: { values?: number[] }) {
  return (
    <div className="miniBars" aria-label="월별 건강점수 그래프">
      {values.map((v, i) => (
        <div className="barColumn" key={i}>
          <span className="barValue">{v}</span>
          <i style={{ height: `${Math.max(18, (v - 65) * 3.2)}px` }} className={i === values.length - 1 ? "active" : ""} />
          <small>{months[i]}</small>
        </div>
      ))}
    </div>
  );
}

const getMetricValues = (total: number) => {
  const highScore = total >= 96;
  return [
    { ...metrics[0], score: highScore ? 100 : Math.min(100, total + 4), weight: 30, description: "관측 생물종·서식지·외래종 위험" },
    { ...metrics[1], score: Math.min(100, total + (highScore ? 1 : 2)), weight: 30, description: "용존산소·탁도·영양염류" },
    { ...metrics[2], score: Math.max(0, total - (highScore ? 3 : 6)), weight: 25, description: "미세플라스틱·해양 쓰레기·중금속" },
    { ...metrics[3], score: Math.max(0, total - (highScore ? 1 : 2)), weight: 15, description: "잘피숲 회복·생태 생산성·회복력" },
  ];
};

function MetricGrid({ score = 82 }: { score?: number }) {
  const values = getMetricValues(score);
  return (
    <div className="metricGrid">
      {values.map((item) => (
        <article className="metricCard" key={item.label}>
          <div className={`metricIcon ${item.tone}`}>{item.icon}</div>
          <div className="metricTitle"><span>{item.label}</span><strong>{item.score}<small>점</small></strong></div>
          <div className="progress"><i className={item.tone} style={{ width: `${item.score}%` }} /></div>
          <small className="metricNote">종합점수 반영 {item.weight}%</small>
        </article>
      ))}
    </div>
  );
}

function ScoreBreakdown({ region, score, onClose }: { region: string; score: number; onClose: () => void }) {
  const values = getMetricValues(score);
  return (
    <div className="reportModalOverlay" role="presentation" onClick={onClose}>
      <article className="reportModal scoreBreakdownModal" role="dialog" aria-modal="true" aria-labelledby="score-breakdown-title" onClick={(e) => e.stopPropagation()}>
        <button className="modalClose" onClick={onClose} aria-label="점수 구성 닫기">×</button>
        <p className="eyebrow">SCORE BREAKDOWN</p>
        <h3 id="score-breakdown-title">{region} 종합점수 {score}점 구성</h3>
        <p className="breakdownIntro">각 지표를 100점으로 평가한 뒤 중요도에 따라 가중 합산합니다.</p>
        <div className="breakdownRows">
          {values.map((item) => (
            <div key={item.label}>
              <span className={`metricIcon ${item.tone}`}>{item.icon}</span>
              <p><strong>{item.label}</strong><small>{item.description}</small></p>
              <b>{item.score} × {item.weight}%</b>
              <em>{(item.score * item.weight / 100).toFixed(1)}점</em>
            </div>
          ))}
        </div>
        <div className="breakdownTotal"><span>가중점수 합계</span><strong>{values.reduce((sum, item) => sum + item.score * item.weight / 100, 0).toFixed(1)}점</strong><b>→ {score}점</b></div>
        <p className="prototypeNote">수질·오염 지표는 부산시 보건환경연구원의 2025년 조사 결과를 환산했습니다. 생물다양성·생태활력은 시제품용 보정지수입니다.</p>
        <button className="primaryBtn modalDone" onClick={onClose}>확인</button>
      </article>
    </div>
  );
}

function Header({ region, setRegion }: { region: keyof typeof regions; setRegion: (r: keyof typeof regions) => void }) {
  const notifications = [
    { id: 1, tone: "danger", title: "다대포 수질 주의", text: "2025년 조사에서 동·서측 합계 3회 부적합이 확인됐습니다.", region: "다대포 해역" as const },
    { id: 2, tone: "warn", title: "일광 추적 관찰 필요", text: "강우 뒤 오염물질 정체로 수질평가 2회 부적합이 기록됐습니다.", region: "일광 해역" as const },
    { id: 3, tone: "good", title: "해운대 검사 결과 갱신", text: "8회 수질평가 모두 적합으로 최신 리포트가 업데이트됐습니다.", region: "해운대 해역" as const },
  ];
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<number[]>([]);
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;
  const toggleNotifications = () => {
    if (!showNotifications) setReadIds(notifications.map((item) => item.id));
    setShowNotifications((value) => !value);
  };
  const openNotification = (item: typeof notifications[number]) => {
    setReadIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    setRegion(item.region);
    setShowNotifications(false);
  };
  return (
    <header className="topbar">
      <div className="mobileLogo"><Logo /></div>
      <div>
        <p className="eyebrow">TODAY&apos;S OCEAN VITALS</p>
        <h1>바다도, 정기검진이 필요하니까요.</h1>
      </div>
      <div className="topActions">
        <label className="regionSelect">
          <span>⌖</span>
          <select value={region} onChange={(e) => setRegion(e.target.value as keyof typeof regions)} aria-label="검진 해역 선택">
            {Object.keys(regions).map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <button
          className="iconButton"
          aria-label={`알림 ${unreadCount}개`}
          aria-expanded={showNotifications}
          onClick={toggleNotifications}
        >
          {unreadCount > 0 && <span className="notifyDot">{unreadCount}</span>}
          ♢
        </button>
        {showNotifications && (
          <aside className="notificationPanel" aria-label="해양 건강 알림">
            <div className="notificationHead"><div><small>OCEAN ALERT</small><strong>새 알림 {unreadCount}개</strong></div><button onClick={() => setReadIds(notifications.map((item) => item.id))}>모두 읽음</button></div>
            <div className="notificationList">
              {notifications.map((item) => (
                <button key={item.id} className={readIds.includes(item.id) ? "read" : ""} onClick={() => openNotification(item)}>
                  <i className={item.tone} />
                  <span><strong>{item.title}</strong><small>{item.text}</small><em>해역 보기 →</em></span>
                </button>
              ))}
            </div>
          </aside>
        )}
        <div className="profile">OC</div>
      </div>
    </header>
  );
}

function HomeScreen({ region, go }: { region: keyof typeof regions; go: (s: Screen) => void }) {
  const info = regions[region];
  const [showBreakdown, setShowBreakdown] = useState(false);
  return (
    <div className="screenContent enter">
      <section className="heroCard">
        <div className="heroGlow" />
        <div className="heroCopy">
          <div className="statusLine"><StatusPill score={info.score}>{info.status}</StatusPill><span>마지막 검사 · 2026. 07. 24</span></div>
          <h2>{region}의<br /><em>건강 신호</em>를 확인했어요.</h2>
          <p>해양 관측 데이터와 AI 분석 결과, 현재 전반적인 생태계 상태는 안정적입니다.</p>
          <div className="heroButtons">
            <button className="primaryBtn" onClick={() => go("check")}>건강검진 시작 <b>→</b></button>
            <button className="ghostBtn" onClick={() => go("xray")}>⌁ 바다 X-ray 보기</button>
          </div>
        </div>
        <button className="heroScore heroScoreButton" onClick={() => setShowBreakdown(true)} aria-label={`${region} 종합 건강점수 ${info.score}점 구성 보기`}>
          <ScoreRing score={info.score} />
          <div><strong>{region} 종합 건강점수</strong><span>눌러서 점수 구성 보기</span></div>
        </button>
      </section>

      <section>
        <div className="sectionHead"><div><p className="eyebrow">HEALTH INDICATORS</p><h3>핵심 건강지표</h3></div><button onClick={() => go("check")}>상세 분석 보기 →</button></div>
        <MetricGrid score={info.score} />
      </section>

      <section className="homeBottom">
        <article className="insightCard">
          <div className="cardTop"><div><p className="eyebrow">AI INSIGHT</p><h3>오늘의 AI 진단</h3></div><span className="aiBadge">AI</span></div>
          <div className="doctorRow"><div className="doctorIcon">✦</div><div><strong>전반적으로 양호해요</strong><p>다만, 최근 3개월간 미세플라스틱 농도가 <b>8.4% 증가</b>했습니다. 연안 북동부를 중심으로 추적 관찰이 필요합니다.</p></div></div>
          <button className="textButton" onClick={() => go("records")}>AI 처방전 확인하기 <span>→</span></button>
        </article>
        <article className="xrayPreview" onClick={() => go("xray")}>
          <div className="xrayGrid" /><div className="island islandA" /><div className="island islandB" /><div className="hotspot warn" /><div className="hotspot danger" />
          <div className="scanLine" />
          <div className="xrayOverlay"><p className="eyebrow">OCEAN X-RAY</p><h3>바다 속 이상 신호를<br />한눈에 확인하세요</h3><button>스캔 열기 ↗</button></div>
          <div className="liveBadge"><i /> LIVE SCAN</div>
        </article>
      </section>
      {showBreakdown && <ScoreBreakdown region={region} score={info.score} onClose={() => setShowBreakdown(false)} />}
    </div>
  );
}

function CheckScreen({ region }: { region: keyof typeof regions }) {
  const info = regions[region];
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveReport = () => {
    const originalTitle = document.title;
    document.title = `Ocean Check_${region}_건강검진리포트`;
    window.print();
    window.setTimeout(() => { document.title = originalTitle; }, 500);
  };
  const saveRecord = async () => {
    setSaveState("saving");
    try {
      await saveHealthCheck({
        region,
        score: info.score,
        status: info.status,
        checkedAt: new Date().toISOString(),
        metrics: getMetricValues(info.score).map(({ label, score, weight }) => ({ label, score, weight })),
        notes: ["미세플라스틱 농도 증가", "연안 해양 쓰레기 발견", "산호·저서생물 회복세"],
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };
  return (
    <div className="screenContent enter">
      <div className="pageIntro">
        <div><p className="eyebrow">OCEAN HEALTH CHECK</p><h2>해양 건강검진 결과</h2><p>{region} · 2026년 7월 정기검진</p></div>
        <div className="reportActions">
          <button className="primaryBtn cloudSaveBtn" onClick={saveRecord} disabled={!isFirebaseReady || saveState === "saving"}>
            {saveState === "saving" ? "저장 중…" : saveState === "saved" ? "저장 완료 ✓" : "검사 기록 저장"}
          </button>
          <button className="outlineBtn saveReportBtn" onClick={saveReport}>PDF로 저장 ↓</button>
        </div>
      </div>
      {saveState === "error" && <p className="saveNotice error">저장하지 못했습니다. Firebase 연결 상태를 확인해주세요.</p>}
      {!isFirebaseReady && <p className="saveNotice">Firebase 프로젝트 연결 후 검사 기록을 안전하게 저장할 수 있습니다.</p>}
      <div className="reportDocument" id="health-report">
        <section className="reportHeader">
          <div className="reportIdentity"><span className="reportNo">검진번호 OC-260724-017</span><h3>{region} 해양 건강진단서</h3><p>AI가 42개 해양 관측 지표를 종합 분석했습니다.</p><StatusPill score={info.score}>{info.status} · 추적 관찰</StatusPill></div>
          <div className="reportScore"><ScoreRing score={info.score} compact /><div><span>종합 건강점수</span><strong>{info.status}</strong><small>동일 해역 평균 76점</small></div></div>
        </section>
        <MetricGrid score={info.score} />
        <section className="diagnosisCard">
          <div className="diagnosisLabel"><span>AI</span><div><p>AI 종합 소견</p><small>OCEAN CHECK MEDICAL REPORT</small></div></div>
          <div className="diagnosisBody">
            <h3>전반적인 생태계 활력은 양호하나, 일부 오염 지표에 관찰이 필요합니다.</h3>
            <p>{region}의 생물다양성과 수질은 정상 범위입니다. 다만 북동 연안에서 미세플라스틱과 부유 해양 쓰레기가 증가하여 오염도 점수가 다른 항목보다 낮게 측정되었습니다.</p>
            <div className="findingRow"><div><span className="dot amber" /><small>주의 소견 01</small><strong>미세플라스틱 농도 증가</strong></div><div><span className="dot coral" /><small>주의 소견 02</small><strong>연안 해양 쓰레기 발견</strong></div><div><span className="dot cyan" /><small>양호 소견 03</small><strong>산호·저서생물 회복세</strong></div></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RecordsScreen({ region }: { region: keyof typeof regions }) {
  const [year, setYear] = useState<keyof typeof yearlyRecords>(2026);
  const [savedChecks, setSavedChecks] = useState<SavedHealthCheck[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(isFirebaseReady);
  const record = yearlyRecords[year];
  useEffect(() => {
    if (!isFirebaseReady) return;
    loadHealthChecks()
      .then(setSavedChecks)
      .catch(() => setSavedChecks([]))
      .finally(() => setLoadingChecks(false));
  }, []);
  return (
    <div className="screenContent enter">
      <div className="pageIntro"><div><p className="eyebrow">OCEAN HEALTH RECORD</p><h2>건강기록부</h2><p>부산 연안의 장기 건강 변화를 추적합니다.</p></div><div className="yearTabs">{([2026, 2025, 2024] as const).map((item) => <button key={item} className={year === item ? "active" : ""} onClick={() => setYear(item)} aria-pressed={year === item}>{item}</button>)}</div></div>
      <section className="chartCard">
        <div className="cardTop"><div><p className="eyebrow">MONTHLY SCORE · {year}</p><h3>{year}년 월별 건강점수 변화</h3></div><div className="scoreDelta"><strong>{record.score}점</strong><span>{record.delta}</span></div></div>
        <MiniBars values={record.values} />
        <div className="chartLegend"><span><i className="cyan" /> 건강점수</span><span><i className="dashed" /> 동일 해역 평균 76점</span></div>
      </section>
      <section className="savedRecordsCard">
        <div className="cardTop"><div><p className="eyebrow">FIREBASE RECORDS</p><h3>저장된 검사 기록</h3></div><span className="cloudBadge">☁ {savedChecks.length}건</span></div>
        {loadingChecks && <p className="emptySaved">저장된 기록을 불러오는 중입니다.</p>}
        {!loadingChecks && savedChecks.length === 0 && <p className="emptySaved">{isFirebaseReady ? "아직 저장된 검사가 없습니다. 건강검진 결과에서 첫 기록을 저장해보세요." : "Firebase 프로젝트를 연결하면 검사 기록이 여기에 표시됩니다."}</p>}
        {savedChecks.length > 0 && <div className="savedRecordList">{savedChecks.map((check) => (
          <article key={check.id}>
            <div><strong>{check.region}</strong><small>{new Date(check.checkedAt).toLocaleDateString("ko-KR")} · {check.status}</small></div>
            <b>{check.score}<small>점</small></b>
          </article>
        ))}</div>}
        {savedChecks.length > 0 && <small className="recordDeviceNote">현재 브라우저에 연결된 비공개 저장함입니다. 선택 해역: {region}</small>}
      </section>
      <section className="recordBottom">
        <article className="compareCard">
          <div className="cardTop"><div><p className="eyebrow">COMPARISON</p><h3>이전 검사 비교</h3></div><span className="goodTag">{record.trend}</span></div>
          <div className="compareScore"><div><small>{year}.{record.previousMonth}</small><strong>{record.previous}</strong><span>점</span></div><b>→</b><div className="current"><small>{year}.{record.currentMonth}</small><strong>{record.score}</strong><span>점</span></div></div>
          <ul className="causeList"><li><span>↗</span><div><strong>생물다양성 {record.biodiversity}</strong><small>서식지 면적과 관측 종수 변화</small></div></li><li className="down"><span>↘</span><div><strong>오염도 {record.pollution}</strong><small>미세플라스틱과 부유물 영향</small></div></li></ul>
        </article>
        <article className="prescription">
          <div className="rxHead"><div className="rx">Rx</div><div><p>OCEAN CHECK AI</p><h3>{year}년 바다 처방전</h3></div><span>{record.date}</span></div>
          <div className="problem"><small>주요 문제</small><strong>플라스틱 오염 증가</strong><p>북동 연안 미세플라스틱 농도 8.4% 증가</p></div>
          <ol><li><span>01</span><div><strong>잘피숲 복원</strong><small>오염 흡수와 생태 회복을 위한 핵심 처방</small></div></li><li><span>02</span><div><strong>해변 정화 활동</strong><small>월 2회 집중 수거 활동을 권장합니다</small></div></li><li><span>03</span><div><strong>플라스틱 감소 캠페인</strong><small>지역 상권과 연계한 사용 저감 프로그램</small></div></li></ol>
          <div className="signature">AI Ocean Doctor <b>O·C</b></div>
        </article>
      </section>
    </div>
  );
}

function XrayScreen({ region, setRegion }: { region: keyof typeof regions; setRegion: (region: keyof typeof regions) => void }) {
  const geo = xrayRegions[region];
  const [selected, setSelected] = useState<string>(region);
  const [showReport, setShowReport] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState<"collapsed" | "default" | "expanded">("default");
  const [mapAlert, setMapAlert] = useState<{ tone: string; title: string; text: string } | null>(null);
  const dragState = useRef({ active: false, x: 0, y: 0, panX: 0, panY: 0, zoom: 1, mode: "pan" as "pan" | "zoom" });
  const details = geo.details;
  const isHealthy = geo.score >= 80;
  const changeZoom = (amount: number) => setZoom((value) => Math.min(1.8, Math.max(0.7, Number((value + amount).toFixed(1)))));
  const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { active: true, x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, zoom, mode: e.shiftKey ? "zoom" : "pan" };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragState.current.mode === "zoom") {
      const dragZoom = dragState.current.zoom + (dragState.current.y - e.clientY) / 220;
      setZoom(Math.min(1.8, Math.max(0.7, Number(dragZoom.toFixed(2)))));
      return;
    }
    const nextX = dragState.current.panX + e.clientX - dragState.current.x;
    const nextY = dragState.current.panY + e.clientY - dragState.current.y;
    setPan({ x: Math.max(-260, Math.min(260, nextX)), y: Math.max(-180, Math.min(180, nextY)) });
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); dragState.current.active = false; setDragging(false); };
  const changeRegion = (next: keyof typeof regions) => {
    setRegion(next);
    setSelected(next);
    setMapAlert(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };
  return (
    <div className="screenContent enter xrayPage">
      <div className="pageIntro light"><div><p className="eyebrow">OCEAN X-RAY SYSTEM</p><h2>바다 X-ray</h2><p>2025년 부산시 공식 수질·토양 조사값을 100점으로 환산한 참고 지수입니다.</p></div><div className="xrayIntroActions"><label><span>분석 해역</span><select value={region} onChange={(e) => changeRegion(e.target.value as keyof typeof regions)}>{Object.keys(xrayRegions).map((name) => <option key={name}>{name}</option>)}</select></label><div className="scanStatus"><i /> 2025 OFFICIAL DATA</div></div></div>
      <section className="xrayWorkspace">
        <div className="xrayTools">
          <button className="active" aria-label="지도 이동 모드" title="드래그: 이동 · Shift+드래그: 확대/축소">⌖</button>
          <button onClick={() => changeZoom(0.2)} aria-label="지도 확대" title="확대">＋</button>
          <button onClick={() => changeZoom(-0.2)} aria-label="지도 축소" title="축소">−</button>
          <div className="zoomReadout" tabIndex={0} aria-label={`현재 지도 확대 비율 ${Math.round(zoom * 100)}퍼센트`}>
            <small>{Math.round(zoom * 100)}%</small>
            <span>현재 지도 확대 비율입니다.<br />Shift+드래그 또는 휠로 조절하세요.</span>
          </div>
        </div>
        <div
          className={`mapViewport geo-${geo.slug} ${dragging ? "dragging" : ""}`}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={(e) => { e.preventDefault(); e.stopPropagation(); changeZoom(e.deltaY < 0 ? 0.1 : -0.1); }}
          onDragStart={(e) => e.preventDefault()}
          aria-label={`${region} 해양 X-ray 지도. 드래그로 이동하고 Shift 드래그 또는 휠로 확대 축소`}
        >
          <img
            className="coastMap"
            src={`${assetBasePath}/maps/${geo.slug}.png`}
            alt={`${region} 실제 해안선 지도`}
            draggable={false}
          />
          {geo.spots.map((spot) => (
            <button
              key={spot.name}
              className={`zone ${spot.tone === "good" ? "zoneGood" : spot.tone === "danger" ? "zoneDanger" : "zoneWarn"}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { setSelected(spot.name); setMapAlert({ tone: spot.tone, title: spot.name, text: spot.text }); }}
              aria-label={`${spot.name} ${spot.tone === "good" ? "건강" : spot.tone === "danger" ? "위험" : "주의"} 신호`}
            ><span /><i>{spot.tone === "good" ? "✓" : "!"}</i></button>
          ))}
        </div>
        <a className="mapAttribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · 실제 지리 데이터</a>
        <div className="xrayLegend"><strong>HEALTH SIGNAL</strong><span><i className="healthy" /> 건강</span><span><i className="caution" /> 주의</span><span><i className="polluted" /> 오염</span></div>
        {mapAlert && <div className={`mapAlertCard ${mapAlert.tone}`}><button onClick={() => setMapAlert(null)} aria-label="설명 닫기">×</button><span>{mapAlert.tone === "good" ? "✓" : "!"}</span><div><strong>{mapAlert.title}</strong><p>{mapAlert.text}</p></div></div>}
        <article className={`scanPanel ${panelPosition}`}>
          <div className="panelDrag" aria-label="판독 패널 높이 조절">
            <button
              onClick={() => setPanelPosition((value) => value === "collapsed" ? "default" : "expanded")}
              disabled={panelPosition === "expanded"}
              aria-label="판독 패널 올리기"
              title="패널 올리기"
            >⌃</button>
            <button
              onClick={() => setPanelPosition((value) => value === "expanded" ? "default" : "collapsed")}
              disabled={panelPosition === "collapsed"}
              aria-label="판독 패널 내리기"
              title="패널 내리기"
            >⌄</button>
          </div>
          <div className="scanPanelHead"><div><small>선택 지역</small><h3>{selected}</h3></div><span className={isHealthy ? "safe" : ""}>{geo.status}</span></div>
          <div className="locationScore"><ScoreRing score={geo.score} compact /><div><small>지역 건강점수</small><strong>{isHealthy ? "정상 범위" : "추적 관찰 필요"}</strong></div></div>
          <h4>이 지역 문제</h4>
          <ul>{details.map((d, i) => <li key={d}><span className={`severity s${i}`} />{d}<b>{isHealthy ? "양호" : ["높음", "주의", "관찰"][i]}</b></li>)}</ul>
          <div className="dataBasis"><span>점수 산식</span><b>적합평가 50% · 세균 30% · 이화학 20%</b></div>
          <a className="dataSource" href="https://www.busan.go.kr/humanframe/theme/ihe/assets/file/20260508busan_research_60.pdf" target="_blank" rel="noreferrer">2025 부산시 공식 조사자료 보기 ↗</a>
          <button className="primaryBtn" onClick={() => setShowReport(true)}>상세 판독 리포트 보기 →</button>
        </article>
      </section>
      {showReport && (
        <div className="reportModalOverlay" role="presentation" onClick={() => setShowReport(false)}>
          <article className="reportModal" role="dialog" aria-modal="true" aria-labelledby="xray-report-title" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setShowReport(false)} aria-label="리포트 닫기">×</button>
            <div className="modalReportHead">
              <div className="modalAi">AI</div>
              <div><p className="eyebrow">OCEAN X-RAY REPORT</p><h3 id="xray-report-title">{selected} 상세 판독 리포트</h3><span>자료 기준 · 2025년 6~9월 부산시 조사</span></div>
            </div>
            <div className="modalScoreRow">
              <ScoreRing score={geo.score} compact />
              <div><small>지역 건강점수</small><strong>{geo.status} · {isHealthy ? "정상 범위" : "추적 관찰 필요"}</strong><p>{isHealthy ? "생태 회복 신호가 안정적으로 관측됩니다." : `${region}의 일부 오염 관련 지표에 관찰이 필요합니다.`}</p></div>
            </div>
            <div className="modalFindings">
              <h4>AI 영상 판독 소견</h4>
              {details.map((item, i) => (
                <div key={item}><span>{String(i + 1).padStart(2, "0")}</span><p><strong>{item}</strong><small>{isHealthy ? "현재 정상 범위이며 정기 관찰을 권장합니다." : [`${region}의 탁도와 부유물 농도에 추적 관찰이 필요합니다.`, "검출 농도가 이전 검사보다 증가했습니다.", "생태 서식지 관측값이 이전 검사보다 감소했습니다."][i]}</small></p></div>
              ))}
            </div>
            <div className="modalPrescription"><span>Rx</span><p><small>AI 권고 처방</small><strong>{isHealthy ? "생태 보호구역 유지 및 분기별 추적 검사" : "연안 정화 활동, 오염원 유입 차단, 잘피숲 복원"}</strong></p></div>
            <button className="primaryBtn modalDone" onClick={() => setShowReport(false)}>확인</button>
          </article>
        </div>
      )}
    </div>
  );
}

function ChatScreen() {
  const [messages, setMessages] = useState([
    { from: "ai", text: "안녕하세요. Ocean Check 바다 전문 AI입니다. 부산 연안의 최근 검진 결과에 대해 무엇이 궁금하신가요?" },
    { from: "user", text: "왜 이 지역 건강점수가 낮나요?" },
    { from: "ai", text: "최근 수질 변화와 플라스틱 오염 증가가 주요 원인입니다. 특히 북동 연안의 미세플라스틱 농도가 3개월간 8.4% 증가했어요. 해양 정화 활동과 잘피숲 복원을 우선 추천합니다." },
  ]);
  const [input, setInput] = useState("");
  const getAiReply = (question: string) => {
    const q = question.replace(/\s/g, "").toLowerCase();
    const place = Object.keys(regions).find((name) => q.includes(name.replace(/\s/g, "").replace("해역", "").replace("앞바다", "")));
    if (q.includes("점수") || q.includes("낮")) return `${place ?? "부산 연안"}의 건강점수는 수질, 오염도, 생물다양성, 생태계 활력을 함께 계산합니다. 현재 점수를 낮추는 주요 요인은 미세플라스틱과 부유 쓰레기 증가이며, 수질과 서식지 회복 여부를 함께 추적해야 합니다.`;
    if (q.includes("플라스틱") || q.includes("오염") || q.includes("쓰레기")) return `${place ?? "부산 연안"}에서는 미세플라스틱과 부유 쓰레기가 핵심 오염 지표입니다. 해변 정화, 하천 유입 차단, 일회용 플라스틱 감축을 동시에 시행하는 것이 가장 효과적입니다.`;
    if (q.includes("수질") || q.includes("탁도") || q.includes("물")) return `${place ?? "부산 연안"}의 수질은 탁도, 용존산소, 영양염류를 중심으로 판단합니다. 비가 온 뒤 하천 유입이 늘면 탁도가 일시 상승할 수 있어 24~48시간 추가 관측이 필요합니다.`;
    if (q.includes("생물") || q.includes("다양성") || q.includes("잘피") || q.includes("물고기")) return `${place ?? "부산 연안"}의 생물다양성 회복에는 잘피숲과 저서생물 서식지 보호가 중요합니다. 잘피숲 복원과 산란기 보호구역 운영을 우선 추천합니다.`;
    if (q.includes("방법") || q.includes("도울") || q.includes("해결") || q.includes("처방")) return "가장 직접적인 방법은 해변 정화 활동 참여, 일회용 플라스틱 감축, 해양 쓰레기 발견 위치 신고입니다. 지역 단위로는 잘피숲 복원과 오염원 유입 차단이 우선입니다.";
    if (q.includes("시급") || q.includes("문제")) return `${place ?? "부산 연안"}에서 가장 시급한 문제는 미세플라스틱과 육상 유입 부유물입니다. 오염원 차단을 먼저 시행하고, 수질과 생물다양성 지표를 매월 비교해야 합니다.`;
    return `“${question.trim()}”에 정확히 답하려면 해역과 확인하려는 지표가 필요합니다. 해운대·송정·광안리·송도·다대포 중 한 곳과 수질·오염·생물다양성 중 한 항목을 함께 알려주시면 관측 자료에 맞춰 답변드릴게요.`;
  };
  const send = () => {
    if (!input.trim()) return;
    const question = input;
    setMessages((m) => [...m, { from: "user", text: question }, { from: "ai", text: getAiReply(question) }]);
    setInput("");
  };
  return (
    <div className="screenContent enter chatPage">
      <div className="chatHeader"><div className="aiAvatar">AI<i /></div><div><p className="eyebrow">OCEAN SPECIALIST</p><h2>바다 전문가 AI</h2><span><i /> 분석 시스템 온라인</span></div></div>
      <div className="quickQuestions"><button onClick={() => setInput("건강점수가 낮은 이유는?")}>건강점수가 낮은 이유는?</button><button onClick={() => setInput("가장 시급한 문제는?")}>가장 시급한 문제는?</button><button onClick={() => setInput("내가 도울 수 있는 방법은?")}>내가 도울 수 있는 방법은?</button></div>
      <div className="chatWindow">
        <div className="chatDate"><span>오늘</span></div>
        {messages.map((msg, i) => <div className={`message ${msg.from}`} key={i}>{msg.from === "ai" && <div className="tinyAi">AI</div>}<div><p>{msg.text}</p><small>{msg.from === "ai" ? "AI 분석 답변" : "오후 2:34"}</small></div></div>)}
      </div>
      <div className="chatInput"><span>＋</span><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="바다 건강에 대해 무엇이든 물어보세요" aria-label="AI에게 질문하기" /><button onClick={send}>↑</button></div>
      <p className="chatDisclaimer">AI 분석은 해양 관측 데이터를 기반으로 하며, 전문 조사의 참고 자료로 활용됩니다.</p>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [region, setRegion] = useState<keyof typeof regions>("해운대 해역");
  const title = useMemo(() => navItems.find((n) => n.id === screen)?.label, [screen]);

  return (
    <main className={screen === "xray" ? "appShell xrayMode" : "appShell"}>
      <aside className="sidebar">
        <Logo />
        <nav>{navItems.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
        <div className="sideCheck"><div className="pulseIcon">⌁</div><strong>다음 정기검진</strong><span>2026. 08. 24</span><small>D-27</small></div>
        <div className="sideFooter"><span>i</span><p><strong>Ocean Check</strong><small>데이터 업데이트 14:32</small></p></div>
      </aside>
      <section className="appMain">
        {screen !== "xray" && <Header region={region} setRegion={setRegion} />}
        {screen !== "home" && <div className={`backRow ${screen === "xray" ? "onDark" : ""}`}><button className="backHome" onClick={() => setScreen("home")}>⬅ 홈으로 돌아가기</button></div>}
        <div className="mobileTitle">{title}</div>
        {screen === "home" && <HomeScreen region={region} go={setScreen} />}
        {screen === "check" && <CheckScreen region={region} />}
        {screen === "records" && <RecordsScreen region={region} />}
        {screen === "xray" && <XrayScreen region={region} setRegion={setRegion} />}
        {screen === "chat" && <ChatScreen />}
      </section>
      <nav className="bottomNav">
        {navItems.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}
      </nav>
    </main>
  );
}
