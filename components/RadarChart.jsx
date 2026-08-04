'use client';

const AXES = [
  { key: 'diagnosis',      label: 'Diagnosis' },
  { key: 'independence',   label: 'Independence' },
  { key: 'precision',      label: 'Precision' },
  { key: 'verification',   label: 'Verification' },
  { key: 'recovery',       label: 'Recovery' },
  { key: 'test_ownership', label: 'Test Ownership' },
];
const N = AXES.length, CX = 160, CY = 160, R = 105, W = 320, H = 320;
const GRID_FRACS = [0.25, 0.5, 0.75, 1];

function pt(i, frac = 1) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
  return [CX + frac * R * Math.cos(a), CY + frac * R * Math.sin(a)];
}
function polyPoints(fracs) { return fracs.map((f, i) => pt(i, f).join(',')).join(' '); }
function labelAnchor(i) {
  const cos = Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / N);
  return cos > 0.1 ? 'start' : cos < -0.1 ? 'end' : 'middle';
}
function labelOffset(i) {
  const sin = Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / N);
  return sin > 0.1 ? 14 : sin < -0.1 ? -6 : 0;
}

export default function RadarChart({ scores = {} }) {
  const fracs = AXES.map(({ key }) => (scores[key] ?? 0) / 100);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {GRID_FRACS.map((f) => (
        <polygon key={f} points={polyPoints(AXES.map(() => f))} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={f === 1 ? 1.5 : 1} />
      ))}
      {AXES.map((_, i) => { const [x, y] = pt(i); return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />; })}
      <polygon points={polyPoints(fracs)} fill="rgba(232,119,74,0.18)" stroke="#e8774a" strokeWidth={2} strokeLinejoin="round" />
      {fracs.map((f, i) => { const [x, y] = pt(i, f); return <circle key={i} cx={x} cy={y} r={4} fill="#e8774a" />; })}
      {AXES.map(({ label }, i) => {
        const [x, y] = pt(i, 1.22);
        return <text key={i} x={x} y={y + labelOffset(i)} textAnchor={labelAnchor(i)} fontSize={10} fill="#8a7f72" fontFamily="inherit">{label}</text>;
      })}
      {[25, 50, 75].map((v) => { const [x, y] = pt(0, v / 100); return <text key={v} x={x + 4} y={y} fontSize={8} fill="#555" fontFamily="inherit">{v}</text>; })}
    </svg>
  );
}
