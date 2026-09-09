import React, { useState, useMemo } from "react";
 
/**
 * TRACE — Transaction-based Risk & Affordability Confidence Engine
 * Frontend-only. No real backend, no real bank calls. Contracts 1-5 unchanged
 * from schemas/contracts.py. Fixed: stray citation artifacts removed from all
 * user-facing copy; palette restored to the locked brand tokens (the generic
 * slate/Tailwind-default palette was a regression); bank list expanded.
 */
 
// ---- Design tokens (locked brand palette, not generic slate defaults) ----
const COLORS = {
  ink: "#1B2A4A",
  paper: "#F7F5F0",
  surface: "#FFFFFF",
  gold: "#B8862E",
  sage: "#5F7A5A",
  clay: "#A6503E",
  border: "#D8D3C6",
  bodyText: "#3D4A5C",
  faint: "#8A93A3",
  accentBg: "#F1EFE7",
};
 
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,500;0,600;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');";
 
const STEPS = ["Connect", "Review", "Consent", "Score", "Offer", "Revoke"];
 
// Real Nigerian banks/fintechs, round-robin mapped to the 3 mock datasets
// so every entry is functional, not decorative.
const PROVIDERS = [
  "OPay", "GTBank", "PalmPay", "Access Bank", "Zenith Bank",
  "UBA", "Kuda", "Moniepoint", "First Bank",
];
const DATASET_CYCLE = ["salaried", "seasonal", "gig"];
const CONNECT_OPTIONS = PROVIDERS.map((name, i) => ({
  provider: { id: name.toLowerCase().replace(/\s+/g, "-"), name },
  datasetKey: DATASET_CYCLE[i % DATASET_CYCLE.length],
}));
 
// ---------------------------------------------------------------------------
// CONTRACT 2 DATASETS
// ---------------------------------------------------------------------------
function buildTransactions(spec) {
  return spec.map((t, i) => ({
    txn_id: `T${String(i + 1).padStart(3, "0")}`,
    date: t.date,
    type: t.type,
    amount: t.amount,
    category: t.category,
    recurring_pattern_score: t.score,
  }));
}
 
export const DATASETS = {
  salaried: {
    label: "Salaried — Office Worker",
    payload: {
      consent_id: "consent_pending",
      account_ref: "ACCT-****2210",
      period_start: "2026-03-11",
      period_end: "2026-09-11",
      income_seasonality_flag: "SALARIED",
      transactions: buildTransactions([
        { date: "2026-03-14", type: "INFLOW", amount: 150000, category: "SALARY", score: 0.95 },
        { date: "2026-03-28", type: "OUTFLOW", amount: 40000, category: "RENT", score: 0.9 },
        { date: "2026-04-14", type: "INFLOW", amount: 150000, category: "SALARY", score: 0.95 },
        { date: "2026-04-28", type: "OUTFLOW", amount: 40000, category: "RENT", score: 0.9 },
        { date: "2026-05-14", type: "INFLOW", amount: 150000, category: "SALARY", score: 0.95 },
        { date: "2026-06-14", type: "INFLOW", amount: 150000, category: "SALARY", score: 0.94 },
        { date: "2026-07-14", type: "INFLOW", amount: 152000, category: "SALARY", score: 0.93 },
        { date: "2026-08-14", type: "INFLOW", amount: 150000, category: "SALARY", score: 0.95 },
        { date: "2026-09-01", type: "OUTFLOW", amount: 15000, category: "UTILITIES", score: 0.7 },
      ]),
    },
  },
  seasonal: {
    label: "Seasonal — Market Trader",
    payload: {
      consent_id: "consent_pending",
      account_ref: "ACCT-****7734",
      period_start: "2026-03-11",
      period_end: "2026-09-11",
      income_seasonality_flag: "SEASONAL_TRADER",
      transactions: buildTransactions([
        { date: "2026-03-15", type: "INFLOW", amount: 60000, category: "TRADE_SALES", score: 0.7 },
        { date: "2026-03-22", type: "INFLOW", amount: 55000, category: "TRADE_SALES", score: 0.7 },
        { date: "2026-04-12", type: "OUTFLOW", amount: 20000, category: "SUPPLIER_PAYMENT", score: 0.6 },
        { date: "2026-06-05", type: "INFLOW", amount: 210000, category: "TRADE_SALES", score: 0.82 },
        { date: "2026-06-19", type: "INFLOW", amount: 195000, category: "TRADE_SALES", score: 0.82 },
        { date: "2026-06-26", type: "OUTFLOW", amount: 80000, category: "SUPPLIER_PAYMENT", score: 0.65 },
        { date: "2026-08-02", type: "INFLOW", amount: 240000, category: "TRADE_SALES", score: 0.85 },
        { date: "2026-08-16", type: "INFLOW", amount: 225000, category: "TRADE_SALES", score: 0.85 },
      ]),
    },
  },
  gig: {
    label: "Gig — Irregular Freelance",
    payload: {
      consent_id: "consent_pending",
      account_ref: "ACCT-****5502",
      period_start: "2026-03-11",
      period_end: "2026-09-11",
      income_seasonality_flag: "GIG_IRREGULAR",
      transactions: buildTransactions([
        { date: "2026-03-18", type: "INFLOW", amount: 35000, category: "GIG_PAYMENT", score: 0.55 },
        { date: "2026-04-02", type: "INFLOW", amount: 18000, category: "GIG_PAYMENT", score: 0.5 },
        { date: "2026-04-25", type: "INFLOW", amount: 42000, category: "GIG_PAYMENT", score: 0.58 },
        { date: "2026-05-30", type: "INFLOW", amount: 22000, category: "GIG_PAYMENT", score: 0.52 },
        { date: "2026-07-08", type: "INFLOW", amount: 51000, category: "GIG_PAYMENT", score: 0.6 },
        { date: "2026-08-20", type: "INFLOW", amount: 29000, category: "GIG_PAYMENT", score: 0.55 },
      ]),
    },
  },
  suspicious: {
    label: "Demo — Sudden Large Inflow",
    payload: {
      consent_id: "consent_pending",
      account_ref: "ACCT-****9981",
      period_start: "2026-03-11",
      period_end: "2026-09-11",
      income_seasonality_flag: "UNCLASSIFIED",
      transactions: buildTransactions([
        { date: "2026-03-20", type: "INFLOW", amount: 15000, category: "TRANSFER", score: 0.3 },
        { date: "2026-05-11", type: "INFLOW", amount: 12000, category: "TRANSFER", score: 0.28 },
        { date: "2026-09-05", type: "INFLOW", amount: 500000, category: "TRANSFER", score: 0.15 },
      ]),
    },
  },
};
 
// ---------------------------------------------------------------------------
// RULE-BASED SCORING & FRAUD ENGINES (Contract 3 & 5 generators)
// ---------------------------------------------------------------------------
export function computeAffordabilitySignal(payload) {
  const inflows = payload.transactions.filter((t) => t.type === "INFLOW");
  const totalInflow = inflows.reduce((s, t) => s + t.amount, 0);
  const avgPatternScore =
    inflows.reduce((s, t) => s + t.recurring_pattern_score, 0) / (inflows.length || 1);
 
  const maxInflow = Math.max(...inflows.map((t) => t.amount));
  const dominanceRatio = maxInflow / (totalInflow || 1);
  const dominantTxn = inflows.find((t) => t.amount === maxInflow);
  const isGamed = dominanceRatio > 0.5 && dominantTxn.recurring_pattern_score < 0.4;
 
  let band;
  let confidence = avgPatternScore;
  const explanation = [];
 
  if (isGamed) {
    band = "LOW";
    confidence = Math.min(confidence, 0.35);
    explanation.push("One inflow accounts for most of the total with no supporting recurring pattern");
  } else if (avgPatternScore >= 0.8) {
    band = "HIGH";
    explanation.push("Recurring inflow pattern is strong and consistent across the window");
  } else if (avgPatternScore >= 0.5) {
    band = "MEDIUM";
    explanation.push("Inflow pattern is present but shows some irregularity");
  } else {
    band = "LOW";
    explanation.push("Inflow pattern is too sparse or irregular to support a strong signal");
  }
 
  if (payload.income_seasonality_flag === "SEASONAL_TRADER") {
    explanation.push("Seasonal seller pattern recognized — not penalized for month-to-month variance");
  } else if (payload.income_seasonality_flag === "GIG_IRREGULAR") {
    explanation.push("Irregular gig-income timing recognized — judged on pattern strength, not frequency");
  } else if (payload.income_seasonality_flag === "SALARIED") {
    explanation.push("Regular bi-weekly/monthly salary deposits detected");
  }
 
  const outflows = payload.transactions.filter((t) => t.type === "OUTFLOW");
  if (outflows.length > 0) {
    explanation.push(`${outflows.length} outflow${outflows.length > 1 ? "s" : ""} recorded, no overdraft events`);
  }
 
  return {
    consent_id: payload.consent_id,
    signal_id: `SIG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    generated_at: new Date().toISOString(),
    affordability_band: band,
    confidence: Math.round(confidence * 100) / 100,
    explanation: explanation.slice(0, 4),
    is_lending_decision: false,
  };
}
 
export function computeFraudSignal(payload) {
  const inflows = payload.transactions.filter((t) => t.type === "INFLOW");
  const explanation = [];
  let riskPoints = 0;
 
  const roundCount = inflows.filter((t) => t.amount % 1000 === 0).length;
  const roundRatio = roundCount / (inflows.length || 1);
  if (roundRatio >= 0.8 && inflows.length >= 3) {
    riskPoints += 1;
    explanation.push("Unusually high share of round-number transactions");
  }
 
  const totalInflow = inflows.reduce((s, t) => s + t.amount, 0);
  const maxInflow = Math.max(...inflows.map((t) => t.amount));
  const dominantTxn = inflows.find((t) => t.amount === maxInflow);
  if (maxInflow / (totalInflow || 1) > 0.5 && dominantTxn.recurring_pattern_score < 0.4) {
    riskPoints += 2;
    explanation.push("Single large inflow with no supporting transaction history");
  }
 
  const avgScore = inflows.reduce((s, t) => s + t.recurring_pattern_score, 0) / (inflows.length || 1);
  if (avgScore < 0.35) {
    riskPoints += 1;
    explanation.push("Overall transaction pattern shows low structural consistency");
  }
 
  if (explanation.length === 0) {
    explanation.push("No anomaly indicators triggered on this transaction history");
  }
 
  const band = riskPoints >= 3 ? "HIGH" : riskPoints >= 1 ? "MEDIUM" : "LOW";
  const confidence = Math.min(0.55 + riskPoints * 0.15, 0.95);
 
  return {
    consent_id: payload.consent_id,
    fraud_signal_id: `FRD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    generated_at: new Date().toISOString(),
    risk_band: band,
    confidence: Math.round(confidence * 100) / 100,
    explanation: explanation.slice(0, 4),
    is_fraud_decision: false,
  };
}
 
// Pre-computed mock lender dashboard dataset
const MOCK_APPLICANTS = [
  { displayName: "Amaka O.", datasetKey: "salaried" },
  { displayName: "Chidi E.", datasetKey: "seasonal" },
  { displayName: "Blessing T.", datasetKey: "gig" },
  { displayName: "Tunde K.", datasetKey: "suspicious" },
].map(({ displayName, datasetKey }) => {
  const payload = { ...DATASETS[datasetKey].payload, consent_id: `consent_demo_${datasetKey}` };
  return {
    displayName,
    transactions: payload.transactions,
    signal: computeAffordabilitySignal(payload),
    fraud: computeFraudSignal(payload),
  };
});
 
// ---------------------------------------------------------------------------
// SPARKLINE — small inline SVG chart of inflow amounts over time. No chart
// library dependency; hand-built to keep the frontend build lean.
// ---------------------------------------------------------------------------
function Sparkline({ transactions, color, width = 96, height = 32 }) {
  const inflows = transactions.filter((t) => t.type === "INFLOW");
  if (inflows.length < 2) return null;
 
  const amounts = inflows.map((t) => t.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const range = max - min || 1;
  const pad = 3;
 
  const points = inflows.map((t, i) => {
    const x = pad + (i / (inflows.length - 1)) * (width - pad * 2);
    const y = height - pad - ((t.amount - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
 
  const areaPoints = `${points.join(" ")} ${width - pad},${height} ${pad},${height}`;
 
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {inflows.map((t, i) => {
        const x = pad + (i / (inflows.length - 1)) * (width - pad * 2);
        const y = height - pad - ((t.amount - min) / range) * (height - pad * 2);
        return <circle key={i} cx={x} cy={y} r="1.6" fill={color} />;
      })}
    </svg>
  );
}
 
// A simple horizontal band-distribution strip — width per segment reflects
// share of applicants, no external chart library needed.
function BandDistributionBar({ counts, total }) {
  const segments = [
    { key: "HIGH", color: COLORS.sage, count: counts.HIGH },
    { key: "MEDIUM", color: COLORS.gold, count: counts.MEDIUM },
    { key: "LOW", color: COLORS.clay, count: counts.LOW },
  ];
  return (
    <div style={styles.distBarTrack}>
      {segments.map((s) => (
        s.count > 0 && (
          <div key={s.key} style={{ ...styles.distBarSegment, background: s.color, flexGrow: s.count / (total || 1) }} title={`${s.key}: ${s.count}`} />
        )
      ))}
    </div>
  );
}
 
function genId(prefix) { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }
function nowIso() { return new Date().toISOString(); }
function addDaysIso(days) { return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(); }
function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function bandColor(band) { return band === "HIGH" ? COLORS.sage : band === "LOW" ? COLORS.clay : COLORS.gold; }
function riskColor(band) { return band === "LOW" ? COLORS.sage : band === "HIGH" ? COLORS.clay : COLORS.gold; }
 
// ---------------------------------------------------------------------------
// MAIN APPLICATION
// ---------------------------------------------------------------------------
export default function Trace() {
  const [view, setView] = useState("applicant");
  const [stepIndex, setStepIndex] = useState(0);
  const [provider, setProvider] = useState(null);
  const [datasetKey, setDatasetKey] = useState("salaried");
  const [consent, setConsent] = useState(null);
  const [signal, setSignal] = useState(null);
  const [fraud, setFraud] = useState(null);
  const [revocation, setRevocation] = useState(null);
  const [grantAnimating, setGrantAnimating] = useState(false);
  const [revokeAnimating, setRevokeAnimating] = useState(false);
  const [scoring, setScoring] = useState(false);
 
  function handleGrant() {
    const newConsent = {
      consent_id: genId("consent"),
      user_id: "user_demo01",
      granted_at: nowIso(),
      expires_at: addDaysIso(30),
      scope: ["TRANSACTION_HISTORY"],
      requesting_party: { type: "LENDER", id: "lender_sim_mfb01", name: "Simulated MFB Partner" },
      status: "ACTIVE",
      lookback_window_days: 180,
    };
    setConsent(newConsent);
    setGrantAnimating(true);
    setTimeout(() => {
      setGrantAnimating(false);
      setStepIndex(3);
      setScoring(true);
      setTimeout(() => {
        const payload = { ...DATASETS[datasetKey].payload, consent_id: newConsent.consent_id };
        setSignal(computeAffordabilitySignal(payload));
        setFraud(computeFraudSignal(payload));
        setScoring(false);
        setStepIndex(4);
      }, 1100);
    }, 900);
  }
 
  function handleRevoke() {
    const event = {
      consent_id: consent.consent_id,
      revoked_at: nowIso(),
      revoked_by: "USER",
      access_cutoff: "IMMEDIATE",
      existing_data_note:
        "Previously shared data may still be held by the requesting party per their own retention policy; this platform cannot retroactively delete data already transferred.",
    };
    setRevocation(event);
    setRevokeAnimating(true);
    setTimeout(() => setRevokeAnimating(false), 900);
  }
 
  return (
    <div style={styles.page}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        @keyframes ringExpand { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes checkDraw { 0%{stroke-dashoffset:24} 100%{stroke-dashoffset:0} }
        @keyframes stampSlam {
          0% { transform: scale(2.6) rotate(-18deg); opacity: 0; }
          45% { transform: scale(0.92) rotate(-6deg); opacity: 1; }
          65% { transform: scale(1.06) rotate(-9deg); opacity: 1; }
          100% { transform: scale(1) rotate(-8deg); opacity: 1; }
        }
        @keyframes stampFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeRise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fillLine { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        button { font-family: inherit; cursor: pointer; transition: opacity 0.15s ease; }
        button:hover { opacity: 0.85; }
        button:focus-visible, [tabindex]:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid ${COLORS.ink}; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; } }
        @media (max-width: 480px) { .cta-full { width: 100%; text-align: center; } }
        input::placeholder { color: ${COLORS.faint}; }
      `}</style>
 
      <div style={styles.shell}>
        <Header stepIndex={stepIndex} view={view} onToggleView={setView} />
 
        <div key={`${view}-${stepIndex}-${scoring}`} style={{ ...styles.body, animation: "fadeRise 0.35s ease-out" }}>
          {view === "lender" ? (
            <LenderDashboard />
          ) : (
            <>
              {stepIndex === 0 && (
                <ConnectScreen onSelect={(p, dk) => { setProvider(p); setDatasetKey(dk); setStepIndex(1); }} />
              )}
              {stepIndex === 1 && <ReviewScreen provider={provider} onContinue={() => setStepIndex(2)} />}
              {stepIndex === 2 && <ConsentScreen provider={provider} onGrant={handleGrant} animating={grantAnimating} />}
              {stepIndex === 3 && <ScoreScreen />}
              {stepIndex === 4 && signal && (
                <OfferScreen signal={signal} fraud={fraud} transactions={DATASETS[datasetKey].payload.transactions} onManage={() => setStepIndex(5)} />
              )}
              {stepIndex === 5 && consent && (
                <RevokeScreen consent={consent} revocation={revocation} onRevoke={handleRevoke} animating={revokeAnimating} />
              )}
            </>
          )}
        </div>
 
        {view === "applicant" && stepIndex > 0 && stepIndex !== 3 && !revocation && (
          <div style={styles.leaveAnytime}>You can revoke TRACE's access at any time — access is never permanent.</div>
        )}
      </div>
    </div>
  );
}
 
function Header({ stepIndex, view, onToggleView }) {
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  return (
    <div style={styles.header}>
      <div style={styles.headerTop}>
        <div>
          <div style={styles.wordmark}>TRACE</div>
          <div style={styles.tagline}>Every signal, traced to real evidence.</div>
        </div>
        <button style={styles.viewToggle} onClick={() => onToggleView(view === "applicant" ? "lender" : "applicant")}>
          {view === "applicant" ? "Switch to lender view" : "Switch to applicant view"}
        </button>
      </div>
      {view === "applicant" && (
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%`, animation: "fillLine 0.4s ease-out", transformOrigin: "left" }} />
          </div>
          <div style={styles.progressLabel}>Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex]}</div>
        </div>
      )}
    </div>
  );
}
 
function ConnectScreen({ onSelect }) {
  return (
    <div>
      <h1 style={styles.h1}>Connect an account</h1>
      <p style={styles.lead}>Pick where your income shows up. TRACE only reads what you approve in the next step — nothing happens until then.</p>
      <div style={styles.list}>
        {CONNECT_OPTIONS.map(({ provider, datasetKey }) => (
          <button key={provider.id} onClick={() => onSelect(provider, datasetKey)} style={styles.listRow}>
            <span style={styles.listRowLabel}>{provider.name}</span>
            <span style={styles.listRowAction}>{DATASETS[datasetKey].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
 
function ReviewScreen({ provider, onContinue }) {
  return (
    <div>
      <h1 style={styles.h1}>Review what you'd share</h1>
      <p style={styles.lead}>Nothing is shared yet. This is exactly what the requesting partner would see if you grant access from {provider?.name}.</p>
      <div style={styles.detailBlock}>
        <DetailRow label="What" value="Transaction history only" />
        <DetailRow label="Lookback window" value="180 days" />
        <DetailRow label="Access lasts" value="30 days" />
        <DetailRow label="Requested by" value="Simulated MFB Partner" />
      </div>
      <button className="cta-full" style={styles.primaryButton} onClick={onContinue}>Continue to consent</button>
    </div>
  );
}
 
function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}
 
function ConsentScreen({ provider, onGrant, animating }) {
  return (
    <div>
      <h1 style={styles.h1}>Grant access</h1>
      <p style={styles.lead}>This is the only step that shares anything. The Simulated MFB Partner will be able to read {provider?.name}'s transaction history from the last 180 days, for the next 30 days.</p>
      {!animating ? (
        <button className="cta-full" style={styles.goldButton} onClick={onGrant}>Grant access</button>
      ) : (
        <GrantConfirmation />
      )}
      <p style={styles.finePrint}>TRACE is not a lender, credit bureau, or accredited financial institution. It only carries your consent and the resulting signals.</p>
    </div>
  );
}
 
function GrantConfirmation() {
  return (
    <div style={styles.confirmWrap}>
      <div style={styles.stampWrap}>
        <div style={{ ...styles.stamp, animation: "stampSlam 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}>
          <div style={styles.stampRingOuter}>
            <div style={styles.stampRingInner}>
              <span style={styles.stampWord}>Vouched</span>
              <span style={styles.stampSub}>Access Granted</span>
            </div>
          </div>
        </div>
      </div>
      <span style={{ ...styles.detailLabel, color: COLORS.sage, fontWeight: 600, animation: "stampFade 0.3s ease-out 0.5s both" }}>Access granted</span>
    </div>
  );
}
 
function ScoreScreen() {
  return (
    <div>
      <h1 style={styles.h1}>Reading transaction history</h1>
      <p style={styles.lead}>The scoring engine is computing an affordability and fraud signal from the shared history. This step is explicit — it never hangs indefinitely.</p>
      <div style={styles.scoreProgress}>
        <span style={{ ...styles.scoreDot, animation: "pulse 1s ease-in-out infinite" }} />
        <span style={{ ...styles.scoreDot, animation: "pulse 1s ease-in-out infinite 0.2s" }} />
        <span style={{ ...styles.scoreDot, animation: "pulse 1s ease-in-out infinite 0.4s" }} />
      </div>
    </div>
  );
}
 
function SignalBlock({ title, bandLabel, color, confidence, explanation, meta }) {
  return (
    <div style={styles.signalBlock}>
      <div style={styles.signalKicker}>{title}</div>
      <div style={styles.signalTop}>
        <span style={{ ...styles.bandLabel, color }}>{bandLabel}</span>
        <span style={styles.confidenceValue}>{Math.round(confidence * 100)}% confidence</span>
      </div>
      <ul style={styles.explanationList}>
        {explanation.map((line, i) => <li key={i} style={styles.explanationItem}>{line}</li>)}
      </ul>
      <div style={styles.signalMeta}>{meta}</div>
    </div>
  );
}
 
function OfferScreen({ signal, fraud, transactions, onManage }) {
  return (
    <div>
      <h1 style={styles.h1}>Signals</h1>
      <p style={styles.noteBanner}>These are signals, not lending or fraud decisions. The requesting partner still makes its own call.</p>
 
      <div style={styles.chartBlock}>
        <div style={styles.signalKicker}>Inflow pattern (180 days)</div>
        <Sparkline transactions={transactions} color={bandColor(signal.affordability_band)} width={380} height={64} />
        <div style={styles.signalMeta}>This is the traced evidence the signal below is computed from.</div>
      </div>
 
      <SignalBlock title="Affordability signal" bandLabel={signal.affordability_band} color={bandColor(signal.affordability_band)} confidence={signal.confidence} explanation={signal.explanation} meta={`Generated ${fmtDate(signal.generated_at)}`} />
      <div style={{ height: 18 }} />
      <SignalBlock title="Fraud signal" bandLabel={fraud.risk_band} color={riskColor(fraud.risk_band)} confidence={fraud.confidence} explanation={fraud.explanation} meta={`Generated ${fmtDate(fraud.generated_at)}`} />
      <div style={{ height: 20 }} />
      <button className="cta-full" style={styles.primaryButton} onClick={onManage}>Manage access</button>
    </div>
  );
}
 
function RevokeScreen({ consent, revocation, onRevoke, animating }) {
  return (
    <div>
      <h1 style={styles.h1}>Manage access</h1>
      {!revocation && (
        <>
          <p style={styles.lead}>The Simulated MFB Partner currently has access to your transaction history, granted on {fmtDate(consent.granted_at)}. It expires automatically on {fmtDate(consent.expires_at)} — or you can end it now.</p>
          {!animating ? (
            <button className="cta-full" style={styles.clayButton} onClick={onRevoke}>Revoke access</button>
          ) : (
            <div style={styles.confirmWrap}>
              <div style={{ ...styles.ring, borderColor: COLORS.clay, animation: "ringExpand 0.5s ease-out" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6L18 18M18 6L6 18" stroke={COLORS.clay} strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ ...styles.detailLabel, color: COLORS.clay, fontWeight: 600 }}>Revoking access…</span>
            </div>
          )}
        </>
      )}
      {revocation && (
        <div>
          <div style={styles.revokedBadge}>Access revoked, effective immediately</div>
          <div style={styles.detailBlock}>
            <DetailRow label="Revoked at" value={fmtDate(revocation.revoked_at)} />
            <DetailRow label="Revoked by" value="You" />
          </div>
          <p style={styles.existingDataNote}>{revocation.existing_data_note}</p>
        </div>
      )}
    </div>
  );
}
 
function LenderDashboard() {
  const [expandedId, setExpandedId] = useState(null);
  const [query, setQuery] = useState("");
  const [bandFilter, setBandFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("confidence");
 
  const counts = useMemo(() => {
    const c = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    MOCK_APPLICANTS.forEach((a) => c[a.signal.affordability_band]++);
    return c;
  }, []);
 
  const filtered = useMemo(() => {
    let rows = MOCK_APPLICANTS.filter((a) => a.displayName.toLowerCase().includes(query.toLowerCase()));
    if (bandFilter !== "ALL") rows = rows.filter((a) => a.signal.affordability_band === bandFilter);
    rows = [...rows].sort((a, b) => sortBy === "confidence" ? b.signal.confidence - a.signal.confidence : a.displayName.localeCompare(b.displayName));
    return rows;
  }, [query, bandFilter, sortBy]);
 
  return (
    <div>
      <h1 style={styles.h1}>Applicants</h1>
      <p style={styles.lead}>Each row carries both signals computed from the engines used in the applicant flow. Neither is a decision.</p>
      <div style={styles.summaryLine}>
        {MOCK_APPLICANTS.length} applicants · <span style={{ color: COLORS.sage, fontWeight: 600 }}>{counts.HIGH} high</span> · <span style={{ color: COLORS.gold, fontWeight: 600 }}>{counts.MEDIUM} medium</span> · <span style={{ color: COLORS.clay, fontWeight: 600 }}>{counts.LOW} low</span>
      </div>
      <BandDistributionBar counts={counts} total={MOCK_APPLICANTS.length} />
      <div style={{ height: 18 }} />
      <div style={styles.controlsRow}>
        <input style={styles.searchInput} type="text" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select style={styles.selectInput} value={bandFilter} onChange={(e) => setBandFilter(e.target.value)}>
          <option value="ALL">All bands</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select style={styles.selectInput} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="confidence">Sort: confidence</option>
          <option value="name">Sort: name</option>
        </select>
      </div>
      <div style={styles.list}>
        {filtered.length === 0 && <div style={styles.emptyState}>No applicants match that search.</div>}
        {filtered.map(({ displayName, transactions, signal, fraud }) => {
          const isOpen = expandedId === signal.signal_id;
          const color = bandColor(signal.affordability_band);
          const fColor = riskColor(fraud.risk_band);
          return (
            <div key={signal.signal_id}>
              <button style={styles.listRow} onClick={() => setExpandedId(isOpen ? null : signal.signal_id)}>
                <span style={styles.listRowLabel}>{displayName}</span>
                <span style={styles.applicantRight}>
                  <Sparkline transactions={transactions} color={color} width={64} height={24} />
                  <span style={{ ...styles.bandLabel, color, fontSize: 16 }}>{signal.affordability_band}</span>
                  <span style={{ ...styles.bandLabel, color: fColor, fontSize: 12 }}>fraud: {fraud.risk_band}</span>
                  <span style={styles.confidenceValue}>{Math.round(signal.confidence * 100)}%</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ ...styles.applicantDetail, animation: "fadeRise 0.25s ease-out" }}>
                  <div style={styles.signalKicker}>Inflow pattern (180 days)</div>
                  <Sparkline transactions={transactions} color={color} width={340} height={56} />
                  <div style={{ height: 12 }} />
                  <div style={styles.signalKicker}>Affordability</div>
                  <ul style={styles.explanationList}>{signal.explanation.map((line, i) => <li key={`s${i}`} style={styles.explanationItem}>{line}</li>)}</ul>
                  <div style={{ height: 12 }} />
                  <div style={styles.signalKicker}>Fraud</div>
                  <ul style={styles.explanationList}>{fraud.explanation.map((line, i) => <li key={`f${i}`} style={styles.explanationItem}>{line}</li>)}</ul>
                  <div style={styles.signalMeta}>Generated {fmtDate(signal.generated_at)} · signals only, not decisions</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
const styles = {
  page: { minHeight: "100vh", background: COLORS.paper, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: COLORS.bodyText, display: "flex", justifyContent: "center", padding: "clamp(28px, 8vw, 48px) clamp(16px, 5vw, 20px)" },
  shell: { width: "min(460px, 100%)" },
  header: { marginBottom: 32 },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 },
  wordmark: { fontFamily: "'Newsreader', serif", fontStyle: "italic", fontSize: "clamp(26px, 6vw, 30px)", fontWeight: 600, color: COLORS.ink, lineHeight: 1 },
  tagline: { fontSize: 12.5, color: COLORS.faint, marginTop: 4 },
  viewToggle: { background: "none", border: "none", padding: 0, fontSize: 12, color: COLORS.ink, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: "3px", whiteSpace: "nowrap" },
  progressWrap: {},
  progressTrack: { height: 2, background: COLORS.border, marginBottom: 8 },
  progressFill: { height: "100%", background: COLORS.ink },
  progressLabel: { fontSize: 12, color: COLORS.faint, fontWeight: 500 },
  body: { minHeight: 360 },
  h1: { fontFamily: "'Newsreader', serif", fontSize: "clamp(24px, 6vw, 28px)", fontWeight: 600, color: COLORS.ink, lineHeight: 1.25, margin: "0 0 12px" },
  lead: { fontSize: 14.5, lineHeight: 1.6, color: COLORS.bodyText, maxWidth: 400, margin: "0 0 24px" },
  list: { display: "flex", flexDirection: "column" },
  listRow: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`, padding: "16px 0", textAlign: "left" },
  listRowLabel: { fontSize: 15, color: COLORS.ink, fontWeight: 600 },
  listRowAction: { fontSize: 12.5, color: COLORS.faint, fontWeight: 500 },
  detailBlock: { borderTop: `1px solid ${COLORS.border}`, marginBottom: 24 },
  detailRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` },
  detailLabel: { fontSize: 13.5, color: COLORS.faint },
  detailValue: { fontSize: 14, color: COLORS.ink, fontWeight: 600, textAlign: "right" },
  primaryButton: { width: "100%", background: COLORS.ink, color: COLORS.paper, border: "none", borderRadius: 4, padding: "13px 26px", fontSize: 14.5, fontWeight: 600 },
  goldButton: { width: "100%", background: COLORS.gold, color: COLORS.surface, border: "none", borderRadius: 4, padding: "13px 26px", fontSize: 14.5, fontWeight: 600 },
  clayButton: { width: "100%", background: "transparent", color: COLORS.clay, border: `1.5px solid ${COLORS.clay}`, borderRadius: 4, padding: "12px 26px", fontSize: 14.5, fontWeight: 600 },
  finePrint: { fontSize: 12, color: COLORS.faint, marginTop: 20, lineHeight: 1.5, maxWidth: 360 },
  confirmWrap: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, padding: "8px 0" },
  ring: { width: 44, height: 44, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center" },
  stampWrap: { padding: "12px 0 6px", display: "flex", justifyContent: "center", width: "100%" },
  stamp: { display: "inline-block", transformOrigin: "center" },
  stampRingOuter: {
    border: `3px solid ${COLORS.sage}`,
    borderRadius: "10px",
    padding: 4,
  },
  stampRingInner: {
    border: `1.5px solid ${COLORS.sage}`,
    borderRadius: "6px",
    padding: "10px 22px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  stampWord: {
    fontFamily: "'Newsreader', serif",
    fontStyle: "italic",
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: "0.04em",
    color: COLORS.sage,
    textTransform: "uppercase",
  },
  stampSub: {
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: COLORS.sage,
    fontWeight: 600,
  },
  scoreProgress: { display: "flex", gap: 8, padding: "12px 0" },
  scoreDot: { width: 8, height: 8, borderRadius: "50%", background: COLORS.ink, display: "inline-block" },
  noteBanner: { fontSize: 13, fontStyle: "italic", fontFamily: "'Newsreader', serif", color: COLORS.ink, borderLeft: `3px solid ${COLORS.gold}`, padding: "4px 0 4px 12px", marginBottom: 24, maxWidth: 380 },
  signalBlock: { borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 0" },
  signalKicker: { fontSize: 11, color: COLORS.faint, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 8 },
  signalTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  bandLabel: { fontFamily: "'Newsreader', serif", fontStyle: "italic", fontSize: 20, fontWeight: 600 },
  confidenceValue: { fontSize: 13, color: COLORS.faint, fontWeight: 500 },
  explanationList: { margin: 0, padding: "0 0 0 16px" },
  explanationItem: { fontSize: 13.5, lineHeight: 1.6, color: COLORS.bodyText },
  signalMeta: { fontSize: 11.5, color: COLORS.faint, marginTop: 12 },
  revokedBadge: { fontSize: 14, fontWeight: 600, color: COLORS.clay, marginBottom: 18 },
  existingDataNote: { fontSize: 13, lineHeight: 1.6, color: COLORS.faint, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, maxWidth: 380 },
  summaryLine: { fontSize: 13.5, color: COLORS.bodyText, marginBottom: 16 },
  controlsRow: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  searchInput: { flex: "1 1 140px", background: COLORS.accentBg, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "8px 10px", fontSize: 13, color: COLORS.ink, fontFamily: "inherit" },
  selectInput: { background: COLORS.accentBg, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "8px 10px", fontSize: 13, color: COLORS.ink, fontFamily: "inherit" },
  applicantRight: { display: "flex", alignItems: "center", gap: 10 },
  chartBlock: { borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginBottom: 18 },
  distBarTrack: { display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: COLORS.border, marginBottom: 4 },
  distBarSegment: { height: "100%" },
  applicantDetail: { padding: "12px 0 16px", borderBottom: `1px solid ${COLORS.border}` },
  emptyState: { fontSize: 13.5, color: COLORS.faint, padding: "16px 0" },
  leaveAnytime: { marginTop: 24, fontSize: 12, color: COLORS.faint, textAlign: "center" },
};
 