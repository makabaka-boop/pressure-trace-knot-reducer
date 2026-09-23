import { useState } from "react";
import TrajectoryChart from "./TrajectoryChart.jsx";

const EXAMPLE = {
  points: [
    { time: 0, value: 0 },
    { time: 1, value: 6 },
    { time: 2, value: 0 },
    { time: 3, value: 6 },
    { time: 4, value: 0 },
  ],
  tolerance: 5,
};

function formatApiError(status, data) {
  if (status === 422 && Array.isArray(data?.detail)) {
    const msgs = data.detail
      .slice(0, 3)
      .map((d) => `${(d.loc || []).join(".")}: ${d.msg}`);
    return `输入校验失败（422）：${msgs.join("；")}`;
  }
  return `请求失败（HTTP ${status}）`;
}

export default function App() {
  const [text, setText] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [result, setResult] = useState(null);
  const [original, setOriginal] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    // 任何一次提交都先清空旧结果，失败时页面上不得残留旧结果。
    setResult(null);
    setOriginal(null);
    setError(null);

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      setError("输入不是合法的 JSON，请检查后重试。");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(formatApiError(resp.status, data));
        return;
      }
      setResult(data);
      setOriginal(payload.points);
    } catch {
      setError("无法连接后端服务，请确认 api 已启动。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1>风洞压力轨迹约简</h1>
      <p className="hint">
        粘贴 JSON（points: 2–120 个严格递增整数采样点，tolerance: 0–10⁶
        的整数），求解满足误差边界的最简折线。
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="payload-input">轨迹数据</label>
        <textarea
          id="payload-input"
          data-testid="payload-input"
          rows={12}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "求解中…" : "求解"}
        </button>
      </form>

      {error && (
        <div role="alert" data-testid="error" className="error">
          {error}
        </div>
      )}

      {result && original && (
        <section className="results">
          <h2>
            结果：保留 {result.indices.length} 个点，共{" "}
            <span data-testid="segments">{result.segments}</span> 段
          </h2>
          <TrajectoryChart original={original} kept={result.points} />
          <table data-testid="kept-table">
            <thead>
              <tr>
                <th>#</th>
                <th>下标</th>
                <th>time</th>
                <th>value</th>
              </tr>
            </thead>
            <tbody>
              {result.indices.map((idx, k) => (
                <tr key={idx}>
                  <td>{k}</td>
                  <td>{idx}</td>
                  <td>{result.points[k].time}</td>
                  <td>{result.points[k].value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
