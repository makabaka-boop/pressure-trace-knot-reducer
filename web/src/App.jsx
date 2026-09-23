import { useMemo, useState } from 'react';
import TrajectoryChart from './TrajectoryChart.jsx';

const EXAMPLE = `{
  "tolerance": 30,
  "points": [
    { "time": 0, "value": 0 },
    { "time": 1, "value": 8 },
    { "time": 2, "value": -5 },
    { "time": 3, "value": 12 },
    { "time": 4, "value": 40 },
    { "time": 5, "value": 55 },
    { "time": 6, "value": 48 },
    { "time": 7, "value": 60 },
    { "time": 8, "value": 20 },
    { "time": 9, "value": 10 },
    { "time": 10, "value": -8 },
    { "time": 11, "value": 2 },
    { "time": 12, "value": 0 }
  ]
}`;

function formatApiErrors(detail) {
  if (!Array.isArray(detail)) return String(detail);
  return detail
    .map((error) => {
      const loc = Array.isArray(error.loc)
        ? error.loc.filter((part) => part !== 'body').join('.')
        : '';
      return loc ? `${loc}: ${error.msg}` : error.msg;
    })
    .join('\n');
}

export default function App() {
  const [rawInput, setRawInput] = useState(EXAMPLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const request = useMemo(() => result?.request ?? null, [result]);

  async function handleSubmit(event) {
    event.preventDefault();
    // A fresh submission always discards the previous outcome: on a
    // validation failure the page must never keep stale results.
    setResult(null);
    setError('');

    let parsed;
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      setError('输入不是合法 JSON，请检查后重试。');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (response.status === 422) {
        const payload = await response.json().catch(() => null);
        setError(
          payload
            ? `输入校验失败（422）：\n${formatApiErrors(payload.detail)}`
            : '输入校验失败（422）。',
        );
        return;
      }
      if (!response.ok) {
        setError(`求解失败，服务端返回 ${response.status}。`);
        return;
      }

      const data = await response.json();
      // Table and SVG both render from this single response object.
      setResult({ request: parsed, ...data });
    } catch (err) {
      setError(`无法连接求解服务：${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header>
        <h1>风洞压力轨迹约简</h1>
        <p className="subtitle">
          在纵向误差不超过 tolerance 的前提下，求保留点最少、下标序列字典序最小的折线。
          偏差判定全部使用整数交叉相乘。
        </p>
      </header>

      <form className="input-panel" onSubmit={handleSubmit}>
        <label htmlFor="json-input">
          轨迹 JSON（2–120 个点，time 为 0–10<sup>9</sup> 严格递增整数）
        </label>
        <textarea
          id="json-input"
          spellCheck="false"
          rows={18}
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
        />
        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? '求解中…' : '提交计算'}
          </button>
        </div>
        {error && (
          <pre className="error" role="alert">
            {error}
          </pre>
        )}
      </form>

      {result && (
        <section className="result-panel" data-testid="result-panel">
          <h2>结果</h2>
          <p className="summary">
            原始 {request.points.length} 个采样点 → 保留{' '}
            {result.indices.length} 个点、{result.segment_count} 条线段；
            tolerance = {request.tolerance}
          </p>

          <TrajectoryChart
            originalPoints={request.points}
            indices={result.indices}
            simplifiedPoints={result.points}
          />

          <h3>保留下标与对应采样点（与上图来自同一响应）</h3>
          <table>
            <thead>
              <tr>
                <th>原下标</th>
                <th>time</th>
                <th>value</th>
              </tr>
            </thead>
            <tbody>
              {result.indices.map((index, row) => (
                <tr key={index}>
                  <td>{index}</td>
                  <td>{result.points[row].time}</td>
                  <td>{result.points[row].value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
