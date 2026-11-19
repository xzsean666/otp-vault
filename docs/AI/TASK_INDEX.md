# Task Index

| Task ID | Title | Status | Dependencies | Description |
|---------|-------|--------|--------------|-------------|
| TASK-001 | 项目骨架与构建配置 | DONE | None | 初始化 Vite + React + TypeScript + Tailwind + Vitest 基础设施，验证构建与测试环境 |
| TASK-002 | 密码学核心引擎与 IndexedDB 存储层 | DONE | TASK-001 | 实现 Web Crypto PBKDF2/AES-GCM 加解密与 IndexedDB 持久化模块 |
| TASK-003 | TOTP 引擎与 URI / 二维码编解码器 | DONE | TASK-001 | 实现 RFC 6238 TOTP 算法、Base32 编解码、otpauth URI 解析与 QR 编解码适配器 |
| TASK-004 | 核心领域单元测试与状态模型 | DONE | TASK-002, TASK-003 | 使用 Vitest 对密码学、TOTP 算法（包含 RFC 官方向量）、URI 解析进行完整单元测试 |
| TASK-005 | 保险库解锁与主密码管理 UI | DONE | TASK-004 | 实现初次设置密码、密码解锁界面、自动锁定与锁定安全清理机制 (遵循 Frontend-Design-Skill) |
| TASK-006 | 保险库仪表盘与实时 TOTP 展示 UI | DONE | TASK-004, TASK-005 | 实现 TOTP 实时刷新、30s 倒计时动画、一键复制、搜索过滤与收藏功能 |
| TASK-007 | 私钥向导、URL、二维码导入与单条/批量导出 UI | DONE | TASK-006 | 实现私钥补全向导、URL 粘贴、二维码扫描/上传，以及单条与批量多格式导出弹窗 |
| TASK-008 | 离线静态构建、Cloudflare Pages 配置与端到端回归验证 | DONE | TASK-007 | 静态资源构建验证、Cloudflare Pages 适配、离线可用性检查与文档完备性 |
