import { expect, test } from '@playwright/test';

// Sawtooth with amplitude 5; tolerance 5 puts every intermediate
// sample exactly on the error boundary of the flat end-to-end segment
// (the boundary is inclusive), so the optimal (and lexicographically
// smallest) solution keeps exactly the endpoints.
const REQUEST = {
  tolerance: 5,
  points: [
    { time: 0, value: 0 },
    { time: 1, value: 5 },
    { time: 2, value: 0 },
    { time: 3, value: 5 },
    { time: 4, value: 0 },
    { time: 5, value: 5 },
    { time: 6, value: 0 },
  ],
};

test('paste JSON, solve once, draw original and simplified trajectories', async ({
  page,
}) => {
  await page.goto('/');

  // One input action: paste the JSON payload into the textarea.
  await page.locator('#json-input').fill(JSON.stringify(REQUEST));
  await page.getByRole('button', { name: '提交计算' }).click();

  // Result panel renders with the single shared response.
  const panel = page.getByTestId('result-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.summary')).toContainText('原始 7 个采样点');
  await expect(panel.locator('.summary')).toContainText('保留 2 个点、1 条线段');

  // Table (driven by the response) lists the two endpoints.
  const rows = panel.locator('table tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator('td')).toHaveText(['0', '0', '0']);
  await expect(rows.last().locator('td')).toHaveText(['6', '6', '0']);

  // SVG: one original dot per sample, two highlighted retained points,
  // and both polylines are drawn with non-trivial geometry.
  const svg = panel.locator('svg.chart');
  await expect(svg.locator('circle.original-dot')).toHaveCount(7);
  await expect(svg.locator('circle.simplified-dot')).toHaveCount(2);

  const originalLine = svg.locator('polyline.original-line');
  const simplifiedLine = svg.locator('polyline.simplified-line');
  await expect(originalLine).toHaveAttribute('points', /.+,/);
  const simplifiedPoints = (await simplifiedLine.getAttribute('points'))
    .trim()
    .split(/\s+/);
  expect(simplifiedPoints).toHaveLength(2);

  // No error is shown.
  await expect(page.locator('.error')).toHaveCount(0);
});
