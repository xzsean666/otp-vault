# TASK-005: 保险库解锁与主密码管理 UI

## Objective
遵循 `docs/Frontend-Design-Skill.md`，构建高质感、极具安全氛围的主密码设置、解锁与自动锁定界面。

## Scope
- `src/components/auth/SetupVault.tsx`: 初次访问创建主密码向导（密码强度检查、确认密码、重要提示）。
- `src/components/auth/UnlockVault.tsx`: 解锁保险库面板（密码输入、解密失败反馈、重置/抹除保险库保护）。
- `src/components/layout/Header.tsx`: 顶部安全状态栏、手动锁定按钮、自动锁定倒计时提示。

## Allowed Files
- `src/components/auth/*`
- `src/components/layout/*`
- `docs/AI/tasks/TASK-005.md`

## Dependencies
TASK-004

## Acceptance Criteria
1. 初次使用引导设置主密码并初始化加密数据库。
2. 已设置密码时进入解锁界面，输入正确密码成功进入主面板，错误密码友好提示。
3. 支持手动锁定，锁定后内存中敏感密钥被清除。
4. UI 遵循 Frontend-Design-Skill 指南，视觉精致、具备安全感与现代排版。

## Status
DONE
