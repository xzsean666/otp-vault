# Architecture Overview: OTP Vault

## 1. 技术栈 (Technology Stack)
- **核心框架**: React 18 / 19 + TypeScript + Vite
- **样式与设计系统**: Tailwind CSS + 自定义设计变量与视觉质感 (依循 `Frontend-Design-Skill.md`)
- **图标系统**: Lucide React
- **加密核心 (Crypto)**: 浏览器标准 Web Crypto API (SubtleCrypto: PBKDF2-HMAC-SHA256, AES-GCM-256, HMAC-SHA1/256/512)
- **本地持久化**: 浏览器 IndexedDB (通过封装 Promise 接口存储加密的 Vault 密文和元数据)
- **二维码能力**: 
  - 二维码生成: 轻量 canvas/svg 二维码渲染器 (`qrcode`)
  - 二维码识别: 纯客户端解析 (`jsqr` 或 `html5-qrcode`)
- **测试工具**: Vitest (单元测试与 RFC 6238 官方测试向量验证)
- **构建输出**: 纯静态单页输出到 `dist/`，可直接部署在 Cloudflare Pages、GitHub Pages 或离线打开

## 2. 核心架构分层 (Layered Architecture)
```
┌────────────────────────────────────────────────────────┐
│                   UI & Presentation Layer               │
│  - Lock/Unlock Screen                                  │
│  - Vault Dashboard & Realtime TOTP Cards               │
│  - Single/Batch Import Wizard (Key / URL / QR)         │
│  - Single/Batch Export Modal (URL / QR / JSON)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application State                   │
│  - Vault Context / Hooks (Unlocked/Locked, entries)     │
│  - Auto-lock timer and memory sanitizer                │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Core Business Domain                 │
│  - TOTP Engine (RFC 6238 & RFC 4226 HOTP/TOTP)         │
│  - otpauth URI Parser & Serializer                     │
│  - QR Decoder / Encoder Service                        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Security & Storage                   │
│  - Web Crypto Vault Encryption (AES-GCM + PBKDF2)      │
│  - IndexedDB Persistence (Encrypted Payload & Salt)    │
└────────────────────────────────────────────────────────┘
```

## 3. 安全模型 (Security Model)
1. **主密码派生**:
   - 随机生成 16 字节 Salt。
   - 使用 PBKDF2-HMAC-SHA256 (迭代次数 >= 250,000) 派生 256 位 AES-GCM 密钥。
2. **数据加密**:
   - 每次保存生成独立的 12 字节 IV。
   - 使用 AES-GCM-256 加密整个账户列表 JSON 载荷，附带认证标签确保完整性防篡改。
   - 即使 IndexedDB 本地数据被导出或拷贝，没有主密码也无法解密。
3. **内存保护**:
   - 解锁后仅在内存状态中保存解密的账户数组。
   - 锁定或页面卸载时，清空内存状态，重新进入锁定态。
4. **离线保障**:
   - 应用无任何网络 API 请求，不接入任何跟踪或外部分析，确保密钥不出本地。
