// SVG overlay comparing the original trajectory with the reduced
// polyline.  Both layers come from the same API response stored by the
// parent component.

const WIDTH = 820;
const HEIGHT = 380;
const MARGIN = { top: 24, right: 24, bottom: 44, left: 64 };

function toPoints(values, xFor, yFor) {
  return values.map((point) => `${xFor(point.time)},${yFor(point.value)}`).join(' ');
}

function niceTicks(min, max, count = 5) {
  // Integer ticks derived without floating point scaling: split the
  // integer span into equal (as possible) integer steps.
  if (min === max) return [min];
  const step = Math.max(1, Math.round((max - min) / count));
  const ticks = [];
  for (let value = min; value <= max; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

export default function TrajectoryChart({ originalPoints, indices, simplifiedPoints }) {
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const times = originalPoints.map((point) => point.time);
  const values = originalPoints.map((point) => point.value);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Pad the value range so points never sit on the frame edge.
  const valueSpan = Math.max(1, maxValue - minValue);
  const padValue = Math.ceil(valueSpan / 10);
  const yMin = minValue - padValue;
  const yMax = maxValue + padValue;

  const timeSpan = Math.max(1, maxTime - minTime);
  const valueRange = yMax - yMin;

  const xFor = (time) => MARGIN.left + ((time - minTime) / timeSpan) * innerWidth;
  const yFor = (value) =>
    MARGIN.top + innerHeight - ((value - yMin) / valueRange) * innerHeight;

  const xTicks = niceTicks(minTime, maxTime);
  const yTicks = niceTicks(yMin, yMax, 4);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="原始轨迹与约简折线对照图"
    >
      {/* gridlines + y labels */}
      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            className="grid"
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={yFor(tick)}
            y2={yFor(tick)}
          />
          <text className="axis-label" x={MARGIN.left - 8} y={yFor(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}

      {/* x labels */}
      {xTicks.map((tick) => (
        <text
          key={`x-${tick}`}
          className="axis-label"
          x={xFor(tick)}
          y={HEIGHT - MARGIN.bottom + 20}
          textAnchor="middle"
        >
          {tick}
        </text>
      ))}

      {/* axes */}
      <line
        className="axis"
        x1={MARGIN.left}
        x2={WIDTH - MARGIN.right}
        y1={HEIGHT - MARGIN.bottom}
        y2={HEIGHT - MARGIN.bottom}
      />
      <line
        className="axis"
        x1={MARGIN.left}
        x2={MARGIN.left}
        y1={MARGIN.top}
        y2={HEIGHT - MARGIN.bottom}
      />

      {/* original trajectory: thin gray with a dot per sample */}
      <polyline
        className="original-line"
        points={toPoints(originalPoints, xFor, yFor)}
      />
      {originalPoints.map((point, index) => (
        <circle
          key={`orig-${index}`}
          className="original-dot"
          cx={xFor(point.time)}
          cy={yFor(point.value)}
          r={3}
        />
      ))}

      {/* reduced polyline: thick blue with highlighted retained points */}
      <polyline
        className="simplified-line"
        points={toPoints(simplifiedPoints, xFor, yFor)}
      />
      {simplifiedPoints.map((point, row) => (
        <g key={`kept-${indices[row]}`}>
          <circle
            className="simplified-dot"
            cx={xFor(point.time)}
            cy={yFor(point.value)}
            r={5}
          />
          <text
            className="kept-index"
            x={xFor(point.time)}
            y={yFor(point.value) - 10}
            textAnchor="middle"
          >
            {indices[row]}
          </text>
        </g>
      ))}

      {/* legend */}
      <g className="legend" transform={`translate(${MARGIN.left + 12}, ${MARGIN.top + 8})`}>
        <line className="legend-line legend-original" x1={0} x2={24} y1={0} y2={0} />
        <circle className="legend-dot legend-original" cx={12} cy={0} r={3} />
        <text x={32} y={4}>原始轨迹（{originalPoints.length} 点）</text>
        <line className="legend-line legend-simplified" x1={210} x2={234} y1={0} y2={0} />
        <circle className="legend-dot legend-simplified" cx={222} cy={0} r={5} />
        <text x={242} y={4}>约简折线（{simplifiedPoints.length} 点）</text>
      </g>
    </svg>
  );
}
