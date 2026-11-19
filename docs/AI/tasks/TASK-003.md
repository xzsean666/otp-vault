# TASK-003: TOTP 引擎与 URI / 二维码编解码器

## Objective
实现基于 RFC 6238 的 TOTP 计算引擎、Base32 编解码、标准 `otpauth://` URI 格式的双向解析/序列化，以及二维码的生成与离线解码。

## Scope
- `src/lib/totp.ts`: RFC 6238 TOTP 计算算法（支持 SHA1/SHA256/SHA512、6/8位、不同步长），RFC 4226 HMAC。
- `src/lib/base32.ts`: RFC 4648 Base32 解码与格式化规范化。
- `src/lib/otpauth.ts`: `otpauth://totp/...` URI 解析器与生成器。
- `src/lib/qrcode.ts`: 二维码图像渲染与基于 Canvas/jsQR 的离线图像解析。

## Allowed Files
- `src/lib/totp.ts`
- `src/lib/base32.ts`
- `src/lib/otpauth.ts`
- `src/lib/qrcode.ts`
- `docs/AI/tasks/TASK-003.md`

## Dependencies
TASK-001

## Inputs and Outputs
- **Input**: Secret key, URI 字符串, 二维码图片数据.
- **Output**: 实时 6/8 位验证码、剩余秒数计算、结构化 TOTP 账户对象、二维码 DataURL.

## Acceptance Criteria
1. TOTP 计算结果与 RFC 6238 官方附录测试向量严格一致。
2. 支持解析和生成标准 otpauth 链接。
3. 纯私钥导入时自动校验 Base32 有效性。
4. 二维码生成与解码完全在客户端离线完成。

## Verification Commands
- `npm run test`

## Risks and Assumptions
- 密钥输入可能存在空格或小写，需要规范化清洗。

## Status
DONE
