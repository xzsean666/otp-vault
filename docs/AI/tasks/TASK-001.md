# TASK-001: 项目骨架与构建配置

## Objective
搭建基于 Vite + React + TypeScript + Tailwind CSS + Vitest 的纯前端工程骨架，配置基础路径、静态构建输出以及离线应用支持，确保能够在 Cloudflare Pages 静态托管环境下无缝运行。

## Scope
- 配置 `package.json`，安装必要依赖 (React, TypeScript, Vite, Tailwind CSS, Lucide React, Vitest 等)。
- 配置 Vite (`vite.config.ts`)、TypeScript (`tsconfig.json`)、Tailwind CSS (`tailwind.config.js` / `postcss.config.js` 或 Vite Tailwind 插件)。
- 创建基础入口文件 `index.html`、`src/main.tsx`、`src/App.tsx`、`src/index.css`。
- 配置 Vitest 单元测试运行环境并添加初始可用性测试。
- 验证 `npm run build` 生成纯静态 `dist/` 目录且无报错。

## Allowed Files
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `tailwind.config.js`
- `postcss.config.js`
- `index.html`
- `src/*`
- `src/tests/*`
- `docs/AI/tasks/TASK-001.md`
- `docs/AI/SESSION_STATE.md`
- `docs/AI/TASK_INDEX.md`

## Dependencies
None (第一个前置任务).

## Inputs and Outputs
- **Input**: 项目技术栈要求 (React + TS + Vite + Tailwind + Vitest + Cloudflare Pages 静态部署兼容).
- **Output**:
  - 可正常运行 `npm run build` 生成 `dist/index.html` 及打包资产。
  - 可正常运行 `npm run test` 执行测试。
  - `src/` 基础代码结构就绪。

## Acceptance Criteria
1. `npm run build` 执行成功，输出静态文件至 `dist/`。
2. `npm run test` (Vitest) 能够正常执行至少 1 个基础测试并通过。
3. `package.json` 包含开发、构建与测试脚本。
4. 页面具备基础 HTML 元信息，离线就绪。

## Verification Commands
- `npm run test`
- `npm run build`
- `test -f dist/index.html && echo "Build success"`

## Risks and Assumptions
- 构建产物必须完全为纯客户端静态文件（无任何 Node.js 运行时依赖或 SSR），以保证可直接部署至 Cloudflare Pages。

## Status
DONE
