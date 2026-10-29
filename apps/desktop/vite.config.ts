import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],

  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
      "@": path.resolve("./src"),
    },
  },

  test: {
    projects: [
      // 纯逻辑测试：跑在 Node 环境（无 DOM），覆盖 document / outline-ops / protocol / interaction 等
      {
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.browser.test.ts"],
        },
      },
      // 需要真实 DOM 的测试：跑 Playwright WebKit（与生产 Tauri WKWebView 同引擎），
      // 覆盖组件挂载、View Transition、Svelte 渲染时序等；首次需 `bunx playwright install webkit`
      {
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "webkit" }],
          },
        },
      },
    ],
  },
});
