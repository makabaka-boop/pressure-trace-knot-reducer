# 风洞压力轨迹约简工具

在保留误差边界的前提下减少风洞试验压力轨迹的采样点：选择一个**包含首尾点**的下标子序列，
使相邻保留点之间的每个原始点到线性插值的**纵向偏差均不超过 tolerance**，且保留点数量最少；
多解时取**下标序列字典序最小**者。偏差判断全程使用整数交叉相乘，不依赖浮点舍入。

## 目录结构

```
backend/            FastAPI 求解服务
  app/solver.py       纯整数求解器（偏差检查 + 最优子序列）
  app/schemas.py      请求/响应模型（strict + extra=forbid）
  app/main.py         POST /simplify
  tests/              pytest：小规模子序列枚举核对最优性 + API 校验
frontend/           React (Vite) 页面：粘贴 JSON、提交计算、SVG 对照 + 表格
e2e/                Playwright 浏览器测试（一次输入、求解、结果绘制）
docker-compose.yml  web（nginx 静态站 + /api 反代）与 api 两个服务
```

## 算法

`n ≤ 120`，直接 `O(n³)` 预处理所有候选线段：

- 线段 `i -> j` 合法 ⟺ 对所有 `i < k < j`：
  `|(v_k - v_i)(t_j - t_i) - (v_j - v_i)(t_k - t_i)| ≤ tolerance · (t_j - t_i)`（纯整数运算）。
- `reach[j]` / `remain[j]` 分别 DP 出首尾方向的最少保留点数。
- 从 0 出发贪心：每步取满足最优性条件的最小下标，得到字典序最小的最优序列。

## API

`POST /simplify`，请求体：

```json
{
  "points": [{"time": 0, "value": 0}, {"time": 1, "value": 6}],
  "tolerance": 5
}
```

约束：`points` 2–120 个；`time` 为 0–10⁹ 的整数且严格递增；`value` 为 |v| ≤ 10⁶ 的整数；
`tolerance` 为 0–10⁶ 的整数。未知字段、非整数值（含布尔、字符串、浮点）、顺序错误均返回 **422**。

响应只含三个字段：保留下标 `indices`、对应采样点 `points`、线段数量 `segments`：

```json
{
  "indices": [0, 1, 4],
  "points": [{"time": 0, "value": 0}, {"time": 1, "value": 6}, {"time": 4, "value": 0}],
  "segments": 2
}
```

前端表格与 SVG 使用同一响应渲染；每次提交先清空旧结果，失败时页面不保留旧结果。

## 本地开发

```bash
# 后端（Python 3.11+）
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload          # http://127.0.0.1:8000

# 前端（Node 20+），/api 由 Vite 代理到 127.0.0.1:8000
cd frontend
npm install
npm run dev                            # http://127.0.0.1:5173
```

## 测试

```bash
# 后端：随机小规模用例与全子序列枚举逐一核对最优性与字典序
cd backend && .venv/bin/python -m pytest tests/ -q

# 浏览器：自动拉起 api 与 web，覆盖一次输入、求解与结果绘制
cd e2e && npm install && npx playwright install chromium
npx playwright test                    # 需后端依赖已装入 backend/.venv
```

## Docker Compose

```bash
docker compose up --build
# web: http://localhost:8080 （nginx 托管前端构建产物，/api 反代到 api:8000）
# api: http://localhost:8000
```
