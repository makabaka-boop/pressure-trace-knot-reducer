const WIDTH = 780;
const HEIGHT = 360;
const PAD = 48;

function fmt(n) {
  return Number(n.toFixed(1));
}

/** SVG 对照图：灰色为原始轨迹，红色为约简折线（保留点加圆点标记）。 */
export default function TrajectoryChart({ original, kept }) {
  const times = original.map((p) => p.time);
  const values = original.map((p) => p.value);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  let vMin = Math.min(...values);
  let vMax = Math.max(...values);
  if (vMin === vMax) {
    vMin -= 1;
    vMax += 1;
  }
  const sx = (t) => PAD + ((t - tMin) / (tMax - tMin || 1)) * (WIDTH - 2 * PAD);
  const sy = (v) => HEIGHT - PAD - ((v - vMin) / (vMax - vMin)) * (HEIGHT - 2 * PAD);
  const toPoints = (pts) => pts.map((p) => `${fmt(sx(p.time))},${fmt(sy(p.value))}`).join(" ");

  return (
    <svg
      data-testid="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="轨迹对照图"
      className="chart"
    >
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#fbfcfe" stroke="#d0d7de" />
      {/* 坐标轴端点标注 */}
      <text x={PAD} y={HEIGHT - 14} fontSize="12" fill="#57606a" textAnchor="middle">
        t={tMin}
      </text>
      <text x={WIDTH - PAD} y={HEIGHT - 14} fontSize="12" fill="#57606a" textAnchor="middle">
        t={tMax}
      </text>
      <text x={8} y={PAD + 4} fontSize="12" fill="#57606a">
        v={vMax}
      </text>
      <text x={8} y={HEIGHT - PAD + 4} fontSize="12" fill="#57606a">
        v={vMin}
      </text>
      {/* 原始轨迹 */}
      <polyline
        data-testid="original-polyline"
        points={toPoints(original)}
        fill="none"
        stroke="#8c959f"
        strokeWidth="1.5"
      />
      {original.map((p, i) => (
        <circle key={`o-${i}`} cx={fmt(sx(p.time))} cy={fmt(sy(p.value))} r={2.5} fill="#8c959f" />
      ))}
      {/* 约简折线 */}
      <polyline
        data-testid="simplified-polyline"
        points={toPoints(kept)}
        fill="none"
        stroke="#cf222e"
        strokeWidth="2.5"
      />
      {kept.map((p, i) => (
        <circle
          key={`k-${i}`}
          data-testid="kept-marker"
          cx={fmt(sx(p.time))}
          cy={fmt(sy(p.value))}
          r={4.5}
          fill="#cf222e"
          stroke="#fff"
          strokeWidth="1.5"
        />
      ))}
      {/* 图例 */}
      <g fontSize="12">
        <line x1={WIDTH - 220} y1={20} x2={WIDTH - 190} y2={20} stroke="#8c959f" strokeWidth="1.5" />
        <text x={WIDTH - 184} y={24} fill="#57606a">
          原始轨迹
        </text>
        <line x1={WIDTH - 120} y1={20} x2={WIDTH - 90} y2={20} stroke="#cf222e" strokeWidth="2.5" />
        <text x={WIDTH - 84} y={24} fill="#57606a">
          约简折线
        </text>
      </g>
    </svg>
  );
}
