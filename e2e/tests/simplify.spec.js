import { expect, test } from "@playwright/test";

// 与后端单测共用同一组数据：最优解为 [0, 1, 4]，共 2 段。
const PAYLOAD = {
  points: [
    { time: 0, value: 0 },
    { time: 1, value: 6 },
    { time: 2, value: 0 },
    { time: 3, value: 6 },
    { time: 4, value: 0 },
  ],
  tolerance: 5,
};

test("粘贴 JSON、求解并绘制结果", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("payload-input").fill(JSON.stringify(PAYLOAD));
  await page.getByRole("button", { name: "求解" }).click();

  // 线段数量与保留点表格
  await expect(page.getByTestId("segments")).toHaveText("2");
  const rows = page.getByTestId("kept-table").locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("0");
  await expect(rows.nth(1)).toContainText("1");
  await expect(rows.nth(2)).toContainText("4");

  // SVG 同时绘制原始轨迹与约简折线
  const chart = page.getByTestId("chart");
  await expect(chart).toBeVisible();
  const original = page.getByTestId("original-polyline");
  const simplified = page.getByTestId("simplified-polyline");
  await expect(original).toBeAttached();
  await expect(simplified).toBeAttached();
  expect((await original.getAttribute("points")).trim().split(" ")).toHaveLength(5);
  expect((await simplified.getAttribute("points")).trim().split(" ")).toHaveLength(3);
  await expect(page.getByTestId("kept-marker")).toHaveCount(3);
});
