# Project Goal: TOTP Vault (纯离线 TOTP 保险库)

## 1. 目标概述 (Overview)
构建一个安全、纯离线、具备现代精美视觉设计风格（遵循 `docs/Frontend-Design-Skill.md`）的 Web 版 TOTP 密钥保险库（OTP Vault）。
可直接部署到 Cloudflare Pages，数据仅保存在浏览器的 IndexedDB 中并通过用户主密码进行强加密存储。

## 2. 核心功能需求 (Core Requirements)
1. **纯离线运行与零服务端依赖 (100% Offline & Zero Server Dependency)**:
   - 所有逻辑（加密、解密、TOTP 计算、QR 生成/扫描、导入/导出）在前端本地浏览器运行。
   - 静态构建产物完全兼容 Cloudflare Pages 及现代浏览器。
2. **安全与主密码解锁 (Security & Master Password Vault)**:
   - 首次进入引导设置主密码。
   - 密码使用 Web Crypto API (PBKDF2/Argon2 + AES-GCM 256) 对保险库数据进行端到端加密存入 IndexedDB。
   - 支持解锁与锁定，内存中敏感数据在锁定时安全清除。
3. **灵活的导入机制 (Flexible Import Options)**:
   - **私钥文本导入**: 仅输入 Secret Key 时，提供补充信息向导（名称、发行方/Issuer、算法 SHA1/SHA256/SHA512、位数 6/8、步长/Period 30s）。
   - **otpauth URL 导入**: 支持解析标准 `otpauth://totp/...` 协议链接。
   - **二维码导入**: 支持上传二维码图片、粘贴图片或使用摄像头扫描。
   - **批量导入**: 支持批量导入多条记录（JSON / URI 列表）。
4. **单条与批量导出 (Single & Batch Export)**:
   - **单条导出**: 显示完整 otpauth URL、生成并展示对应二维码、支持复制或下载。
   - **批量导出**: 支持导出完整加密/明文备份 JSON 或 otpauth 列表，方便迁移或冷备份。
5. **UI & 交互美学 (Design & Aesthetics)**:
   - 遵循 `Frontend-Design-Skill.md`：极具质感的现代设计风格，克制而优雅的排版（字体设计）、流畅的倒计时进度环/条、一键复制验证码、搜索与分类。

## 3. 非目标 (Non-Goals)
- 不设置任何后端服务器或第三方云端数据同步（保持 100% 离线自主可控）。
- 不在网络中传输明文或密文密钥。
