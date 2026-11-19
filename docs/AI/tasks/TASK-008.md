# TASK-008: 离线静态构建、Cloudflare Pages 配置与端到端回归验证

## Objective
验证项目在生产模式下的静态打包产物、离线体验完整性、Cloudflare Pages 部署说明，以及全流程功能回归验证。

## Scope
- `wrangler.toml` 或 `_headers` / `_routes.json` (针对 Cloudflare Pages 静态优化的安全头配置，如 CSP 离线限制)。
- README.md: 项目说明、安全性架构、导入导出指南、Cloudflare Pages 部署步骤。
- 完整打包产物与全套测试回归运行。

## Allowed Files
- `wrangler.toml`
- `public/*`
- `README.md`
- `docs/AI/tasks/TASK-008.md`

## Dependencies
TASK-007

## Acceptance Criteria
1. `npm run build` 生成的 `dist/` 为完全自包含的静态单页应用。
2. 没有任何对外部 CDN、API 或统计脚本的网络依赖，纯本地工作。
3. 提供清晰的 Cloudflare Pages 部署指导。
4. 全套单元测试与功能验证通过。

## Status
DONE
