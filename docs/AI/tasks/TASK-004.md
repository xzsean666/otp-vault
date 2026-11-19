# TASK-004: 核心领域单元测试与状态模型

## Objective
编写针对加密加解密、IndexedDB 存储模型、TOTP 计算（官方测试向量）、URI 解析与导出的全套单元测试，并定义 Vault 状态管理逻辑。

## Scope
- `src/tests/crypto.test.ts`: 测试 PBKDF2 派生、AES-GCM 加密与解密、密码错误场景。
- `src/tests/totp.test.ts`: RFC 6238 官方测试向量核验、各种步长与算法。
- `src/tests/otpauth.test.ts`: URI 序列化与反序列化测试、异常容错。
- `src/context/VaultContext.tsx`: 状态管理 hook 与内存清理逻辑。

## Allowed Files
- `src/tests/*`
- `src/context/VaultContext.tsx`
- `docs/AI/tasks/TASK-004.md`

## Dependencies
TASK-002, TASK-003

## Acceptance Criteria
1. 所有核心测试用例运行并通过。
2. 覆盖密码错误、非法 URI、空数据等边缘情况。

## Verification Commands
- `npm run test`

## Status
DONE
