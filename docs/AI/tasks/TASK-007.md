# TASK-007: 私钥向导、URL、二维码导入与单条/批量导出 UI

## Objective
实现全面的导入向导（支持纯私钥向导、URL 解析、二维码解析）与灵活的导出界面（单条二维码/链接展示与下载、批量 JSON / URI 列表备份）。

## Scope
- `src/components/modals/ImportModal.tsx`:
  - 选项卡：纯私钥输入（带账户名、发行方、算法、位数、步长引导表单）、otpauth URL 直接粘贴、二维码上传/摄像头扫码。
  - 批量导入文本框 / 备份文件恢复。
- `src/components/modals/ExportSingleModal.tsx`:
  - 单条查看完整 otpauth URL、动态渲染二维码、复制 URI、下载二维码图片。
- `src/components/modals/ExportBatchModal.tsx`:
  - 批量导出：密文/明文 JSON 导出文件下载、所有 otpauth URI 纯文本列表复制。

## Allowed Files
- `src/components/modals/*`
- `docs/AI/tasks/TASK-007.md`

## Dependencies
TASK-006

## Acceptance Criteria
1. 输入纯私钥时，强制或引导补全发行方与账户名，保存后可自动组合生成标准 otpauth URL。
2. 粘贴 otpauth URL 时自动解析各字段并预览。
3. 支持上传二维码图片解析。
4. 单条导出能正确展示二维码和 URL。
5. 批量导出能正常下载 JSON 或复制 URI 列表。

## Status
DONE
