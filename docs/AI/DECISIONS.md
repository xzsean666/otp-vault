# Architecture & Technology Decisions (ADR)

## ADR-001: 纯客户端技术选型与 Web Crypto API
- **背景**: 目标是纯离线可用、可发布至 Cloudflare Pages 的安全 TOTP 保险库。
- **决定**:
  1. 使用 Vite + React + TypeScript 作为应用开发基座，提供出色的开发体验和高可靠类型保障。
  2. 使用浏览器原生 Web Crypto API (`window.crypto.subtle`) 处理加密和 TOTP HMAC，无需安装臃肿的第三方庞大非标加密库，保证算法实现符合密码学安全标准。
  3. 离线数据存储使用 IndexedDB，支持存储二进制密文与元数据，无 LocalStorage 5MB 限制与纯文本隐患。

## ADR-002: 设计语言与美学决策 (参考 Frontend-Design-Skill)
- **背景**: 避免千篇一律、平庸粗糙的 AI 风格，要求具有独特、高端且安全的视觉认同感。
- **决定**:
  1. 主题风格定位：**精致暗色科技 / 现代安全保险库风格 (Vault Cyber-Minimalism)**。
  2. 配色系统：深黑/铅灰底色 (`#0B0F17`, `#111827`) + 琥珀/荧金与绿洲青点缀色 (`#F59E0B`, `#10B981`)，体现安全、私密与精密仪器的质感。
  3. 字体设计：等宽数字展示 TOTP 动态码（如 `JetBrains Mono` / `Space Mono`），UI 正文采用清晰有力的现代无衬线字体。
  4. 动效：平滑环形或条形 30s 倒计时器、流畅复制反馈、卡片轻微悬停光晕。

## ADR-003: 导入与导出规格
- **决定**:
  1. 支持标准 `otpauth://totp/{issuer}:{label}?secret={secret}&issuer={issuer}&algorithm={algo}&digits={digits}&period={period}` 解析与生成。
  2. 私钥导入向导允许用户仅输入 Base32 密钥，系统自动校验合法性并引导补全发行方与账户名。
  3. 二维码支持单项生成展示、下载，以及通过 Canvas/jsQR 离线解码导入。
  4. 批量导出支持标准 JSON 备份（带加密选项或明文备份）和 URI 列表格式。
