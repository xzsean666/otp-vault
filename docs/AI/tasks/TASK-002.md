# TASK-002: 密码学核心引擎与 IndexedDB 存储层

## Objective
使用原生 Web Crypto API (`window.crypto.subtle`) 实现基于用户主密码的 AES-GCM-256 + PBKDF2-HMAC-SHA256 加解密引擎，以及 IndexedDB 本地持久化封装，确保密钥数据在客户端安全加密存储。

## Scope
- `src/lib/crypto.ts`: 主密码密钥派生 (PBKDF2)、数据加密/解密 (AES-GCM-256)、随机 Salt/IV 生成。
- `src/lib/storage.ts`: IndexedDB 数据库封装，存储加密 Vault 载荷、Salt、元数据。
- `src/types/vault.ts`: Vault 数据类型定义（账户条目、加密容器、元数据）。

## Allowed Files
- `src/lib/crypto.ts`
- `src/lib/storage.ts`
- `src/types/vault.ts`
- `docs/AI/tasks/TASK-002.md`
- `docs/AI/SESSION_STATE.md`
- `docs/AI/TASK_INDEX.md`

## Dependencies
TASK-001

## Inputs and Outputs
- **Input**: 用户明文主密码、明文 Vault 账户数据。
- **Output**: 加密的 Vault 载荷与存取方法，安全解密方法。

## Acceptance Criteria
1. 支持从密码派生强加密密钥并完成 AES-256-GCM 加密与解密。
2. 错误密码解密时抛出可捕获的校验错误。
3. IndexedDB 存储读写正常，页面刷新后密文完整保存。

## Verification Commands
- `npm run test` (单元测试包含加解密与存储)

## Risks and Assumptions
- 运行环境支持 Web Crypto API (`crypto.subtle`)。

## Status
DONE
