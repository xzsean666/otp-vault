# TASK-006: 保险库仪表盘与实时 TOTP 展示 UI

## Objective
构建主控制台，展示 TOTP 账户列表、实时 30 秒圆环/条形倒计时、一键复制验证码、搜索与标签过滤，提供流畅自然的动效。

## Scope
- `src/components/dashboard/VaultDashboard.tsx`: 主仪表板容器、快捷工具栏。
- `src/components/dashboard/TotpCard.tsx`: 单个 TOTP 卡片，展示发行商、账户名、高可见度等宽验证码、倒计时环/条、一键复制与复制成功 Toast。
- `src/components/dashboard/CountdownProgress.tsx`: 30 秒平滑递减动画指示器。

## Allowed Files
- `src/components/dashboard/*`
- `docs/AI/tasks/TASK-006.md`

## Dependencies
TASK-004, TASK-005

## Acceptance Criteria
1. TOTP 每秒精确刷新，时间到期自动无缝轮换为下一期验证码。
2. 倒计时动画平滑，最后 5 秒具备警示色彩变化。
3. 点击验证码即刻复制并展示精致反馈。
4. 搜索框支持按发行方或账号实时过滤。

## Status
DONE
