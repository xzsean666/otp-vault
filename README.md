# OTP Vault | 纯离线安全 TOTP 双因子口令保险库

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](#)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](#)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](#)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Ready-F38020?logo=cloudflare)](#)

> **零服务端依赖 · 硬件级 Web Crypto 端到端加密 · 密钥不出本地**  
> 一款现代、优雅且高安全性的纯离线 TOTP (Time-based One-Time Password) 密钥管理保险库，完全依循 RFC 6238 标准实现，可一键部署至 Cloudflare Pages、GitHub Pages 或纯离线本地打开运行。

---

## 核心特性 (Key Features)

### 1. 纯客户端零信任安全架构
- **零服务端与网络传输**：通过 Content Security Policy (`connect-src 'none'`) 在浏览器底层阻断所有外发网络请求，密钥永不出本地。
- **Web Crypto 原生加密**：使用浏览器原生硬件加速密码学引擎：
  - **主密码派生**：PBKDF2-HMAC-SHA256，高达 250,000 次哈希迭代派生 256 位加密密钥，附带 16 字节随机 Salt。
  - **保险库载荷加密**：AES-GCM-256 认证加密模式，每次保存使用独立的 12 字节随机 IV，防重放与防篡改。
- **内存保护与自动锁定**：
  - 锁定时及页面关闭时，解密密钥与明文账户数组自内存中安全销毁抹除。
  - 支持多档闲置时长检测（5分钟、15分钟、30分钟无操作自动锁定）。

### 2. 多维度导入机制
- **Base32 私钥向导**：自动剔除空格与连字符，严格校验 RFC 4648 规范，支持发行商预设选择，提供实时 OTP 计算试算预览。
- **otpauth URI 解析**：直接粘贴标准 `otpauth://totp/...` 协议链接，自动提取发行商、账户标识、算法、位数与步长。
- **二维码识别**：
  - 图片文件选择 / 拖拽识别。
  - 剪贴板快速粘贴识别（在导入界面按 `Ctrl+V` / `Cmd+V` 截屏即刻解析）。
  - 本地摄像头实时扫码。
- **批量导入**：支持多行 URI 链接或结构化 JSON 备份导入，自动过滤重复项。

### 3. 便捷灵活的导出与备份
- **单条导出**：
  - 动态渲染高分辨率二维码（支持下载为 PNG 图片）。
  - 一键复制标准 `otpauth://` 链接。
  - 查看及复制 Base32 私钥明文。
- **批量导出**：
  - 导出全量结构化 JSON 离线备份文件。
  - 导出多行 `otpauth://` URI 纯文本列表。

### 4. 极致视觉体验 (Vault Cyber-Minimalism)
- 依循 `Frontend-Design-Skill` 打造专属深色保险库科技美学。
- 30 秒圆环递减倒计时动画，最后 5 秒平滑切换为红色脉冲警示。
- 醒目 JetBrains Mono 等宽排版数字，一键快速复制口令并展示反馈 Toast。
- 实时搜索过滤（按平台、账号、标签）与置顶收藏支持。

---

## 算法标准与官方测试向量验证

核心 TOTP 算法严格实现 **RFC 6238** (TOTP) 与 **RFC 4226** (HOTP)，并通过了 Vitest 针对 RFC 6238 附录官方测试向量的完整自动化校验（覆盖 SHA-1、SHA-256、SHA-512 在各个时间戳下的 8 位口令输出）：

```bash
npm run test
```

测试覆盖：
- `src/tests/totp.test.ts`: RFC 6238 官方全测试向量（SHA-1 / 256 / 512, 8位与6位, 倒计时精度）
- `src/tests/crypto.test.ts`: PBKDF2 密钥派生、AES-GCM-256 加解密、错误密码拒绝断言
- `src/tests/otpauth.test.ts`: 协议双向解析与格式化构建
- `src/tests/base32.test.ts`: RFC 4648 编码、解码、非法字符清洗校验

---

## 部署到 Cloudflare Pages

本项目为完全自包含的静态单页应用（SPA），无需任何后端 Worker 或 API 服务。

### 方法 1: 使用 Cloudflare 控制台 (Git 集成)
1. 将项目推送到 GitHub。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择该仓库并配置构建参数：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 点击 **Save and Deploy** 即可完成部署！

### 方法 2: 使用 Wrangler CLI 直接部署
```bash
# 1. 安装依赖并执行本地构建
npm install
npm run build

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name=otp-vault
```

---

## 本地开发指南

### 前置要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装与启动
```bash
# 克隆仓库
git clone https://github.com/xzsean666/otp-vault.git
cd otp-vault

# 安装依赖
npm install

# 启动本地开发服务 (带 HMR)
npm run dev

# 执行全套单元测试
npm run test

# 构建生产级静态产物 (输出至 dist/)
npm run build

# 本地预览静态产物
npm run preview
```

---

## 安全免责声明 (Security Notice)

1. **主密码至关重要**：OTP Vault 采用零知识离线加密，主密码即为唯一密钥。任何人都无法为您找回密码。请务必牢记主密码或安全离线备份。
2. **离线备份管理**：导出的明文 JSON 备份或 URI 列表包含双因子私钥，请务必妥善存放在离线安全介质（如受加密保护的 USB 驱动器）中。
