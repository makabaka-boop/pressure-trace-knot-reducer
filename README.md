# 风洞压力轨迹约简工具

轻量全栈工具：粘贴风洞试验压力轨迹 JSON，求一条**保留点数量最少**的折线，使相邻保留点
之间每个原始点到线性插值的纵向偏差不超过 `tolerance`；点数相同时取下标序列
**字典序最小**的解。前后端与判定均为整数运算，无浮点舍入。

## 问题定义

输入：2–120 个采样点 `{time, value}`，`time` 为 `[0, 10^9]` 内严格递增整数，
`|value| <= 10^6`，`tolerance` 为 `[0, 10^6]` 整数。

对保留段 `i -> j`，中间点 `k` 的偏差为

```
|(v_k - v_i) * (t_j - t_i) - (v_j - v_i) * (t_k - t_i)| <= tolerance * (t_j - t_i)
```

即纵向偏差不等式两边乘以正数 `(t_j - t_i)` 后的**整数交叉相乘**形式
（`api/app/simplifier.py`），不使用除法或浮点数。

## 求解思路

1. 构造可达图（visibility graph）：边 `i -> j` 存在当且仅当区间内所有点均满足上式。
   注意中间某点越界不能提前 break——后面的点可能重新回到误差带内。
2. 下标只增，图是 DAG。逆序 DP 求每个点到末点的最少段数 `dist[i]`。
3. 正向重建时，在所有满足 `dist[j] == dist[i] - 1` 的可达后继中选**最小下标**，
   得到最短路径中字典序最小的下标序列。
4. 逐点贪心（farthest-reaching）不最优，测试中保留了确定性反例：
   `[-2,-1,-1,-2,0,-1]`、tol=1 时贪心需 3 段，最优为 `[0,1,5]` 共 2 段。

n ≤ 120，可达图 O(n³) 判定、DP O(n²)，Python 下毫秒级完成。

## 目录结构

```
api/                 FastAPI 服务
  app/simplifier.py  整数判定 + 可达图 + 最短路 DP
  app/schemas.py     严格输入校验（未知字段/浮点/布尔/越界/错误顺序 -> 422）
  app/main.py        POST /api/simplify, GET /health
  tests/             pytest：全量子序列枚举核对最优性 + HTTP 422 用例
web/                 React + Vite 单页应用
  src/App.jsx        粘贴 JSON、提交、错误展示、结果表格（422 时清除旧结果）
  src/TrajectoryChart.jsx  SVG 原图与约简折线叠加
  tests/             Playwright：一次输入、一次求解、一次结果绘制
docker-compose.yml   web(nginx) + api(uvicorn)
```

响应仅包含 `indices`、`points`、`segment_count`，页面表格与 SVG 使用同一响应。

## Docker Compose 运行

```bash
docker compose up --build
# web:  http://localhost:8080
# api:  http://localhost:8000  (GET /health)
```

## 本地开发运行

```bash
# 后端（:8000）
cd api
pip install -r requirements-dev.txt
uvicorn app.main:app --reload

# 前端（:5173，/api 代理到 :8000）
cd web
npm install
npm run dev
```

## 测试

```bash
# 后端：小规模子序列全枚举（长度 2..9 的穷举/随机情形）核对最优性
cd api && python -m pytest

# 浏览器端到端（自动拉起 api 与 vite）
cd web && npx playwright install chromium && npx playwright test
```

## 输入示例

```json
{
  "tolerance": 30,
  "points": [
    { "time": 0, "value": 0 },
    { "time": 1, "value": 8 },
    { "time": 2, "value": -5 }
  ]
}
```

未知字段、非法数值（含小数、布尔、越界）、点数不足/超限、`time` 非严格递增均返回
**422**，页面不会保留上一次的结果。
