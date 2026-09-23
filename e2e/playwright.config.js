import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
  },
  webServer: [
    {
      command: ".venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: path.join(root, "../backend"),
      url: "http://127.0.0.1:8000/openapi.json",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      cwd: path.join(root, "../frontend"),
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
