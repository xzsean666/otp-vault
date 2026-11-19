#!/usr/bin/env bash
# ==============================================================================
# OTP Vault - Cloudflare Pages 一键自动化部署脚本
# ==============================================================================
set -euo pipefail

# 默认配置
PROJECT_NAME="otp-vault"
DIST_DIR="dist"
SKIP_TEST=false
CUSTOM_BRANCH=""

# ANSI 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 辅助输出函数
info()    { echo -e "${CYAN}ℹ️  [INFO]${NC} $*"; }
success() { echo -e "${GREEN}✅ [SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠️  [WARN]${NC} $*"; }
error()   { echo -e "${RED}❌ [ERROR]${NC} $*" >&2; }

print_help() {
  cat << EOF
${BOLD}OTP Vault - Cloudflare Pages 部署脚本${NC}

用法:
  ./deploy.sh [选项]

选项:
  -s, --skip-test       跳过自动化单元测试 (直接执行构建与部署)
  -b, --branch <name>   指定部署目标分支 (默认取当前 Git 分支或 main)
  -p, --project <name>  指定 Cloudflare Pages 项目名称 (默认: otp-vault)
  -h, --help            显示此帮助信息

示例:
  ./deploy.sh                  # 运行完整流程 (测试 -> 构建 -> 部署至生产分支)
  ./deploy.sh --skip-test      # 跳过测试快速部署
  ./deploy.sh -b preview-test  # 部署指定分支的预览版本
EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--skip-test)
      SKIP_TEST=true
      shift
      ;;
    -b|--branch)
      CUSTOM_BRANCH="$2"
      shift 2
      ;;
    -p|--project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      error "未知参数: $1"
      print_help
      exit 1
      ;;
  esac
done

# 获取当前工作目录下的分支名称
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
TARGET_BRANCH="${CUSTOM_BRANCH:-$CURRENT_BRANCH}"

echo -e "${BOLD}${BLUE}======================================================${NC}"
echo -e "${BOLD}${BLUE}  🚀 OTP Vault Cloudflare Pages 部署流程启动        ${NC}"
echo -e "${BOLD}${BLUE}======================================================${NC}"
info "项目名称: ${BOLD}${PROJECT_NAME}${NC}"
info "目标分支: ${BOLD}${TARGET_BRANCH}${NC}"

# 1. 验证 Cloudflare 凭证
echo ""
info "步骤 1/4: 检查 Cloudflare 认证状态..."
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  warn "未检测到环境变量 CLOUDFLARE_API_TOKEN，正在测试本地 Wrangler 登录状态..."
fi

if ! npx wrangler whoami > /dev/null 2>&1; then
  error "Cloudflare 认证失败！请确保已设置环境变量:"
  echo -e "   export CLOUDFLARE_API_TOKEN=\"your_token_here\""
  echo -e "   export CLOUDFLARE_ACCOUNT_ID=\"your_account_id_here\" (可选)"
  echo -e "或者执行: npx wrangler login 登录。"
  exit 1
fi
success "Cloudflare 认证有效！"

# 2. 自动化测试 (RFC 向量与密码学校验)
echo ""
if [ "$SKIP_TEST" = true ]; then
  warn "步骤 2/4: 已跳过单元测试 (--skip-test)"
else
  info "步骤 2/4: 执行自动化单元测试校验 (RFC 6238 / 加密 / 解析)..."
  if npm run test; then
    success "所有单元测试通过！"
  else
    error "单元测试未通过，阻止部署以避免上线存在缺陷的版本！"
    exit 1
  fi
fi

# 3. 本地生产打包 (TypeScript 检查 + Vite 构建)
echo ""
info "步骤 3/4: 执行生产环境打包 (tsc && vite build)..."
npm run build
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
  error "打包失败: 未找到 $DIST_DIR/index.html！"
  exit 1
fi
success "生产打包成功，产物目录: ${DIST_DIR}"

# 4. 部署至 Cloudflare Pages
echo ""
info "步骤 4/4: 正在部署静态产物至 Cloudflare Pages [${PROJECT_NAME}]..."

# 检查项目是否存在，不存在则自动非交互式创建
EXISTING_PROJECTS=$(npx wrangler pages project list 2>/dev/null || true)
if ! echo "$EXISTING_PROJECTS" | grep -q "${PROJECT_NAME}"; then
  info "项目 ${PROJECT_NAME} 尚未在 Pages 创建，正在自动创建项目..."
  npx wrangler pages project create "${PROJECT_NAME}" --production-branch "${TARGET_BRANCH}"
  success "项目 ${PROJECT_NAME} 创建成功！"
fi

# 执行部署
npx wrangler pages deploy "$DIST_DIR" \
  --project-name="$PROJECT_NAME" \
  --branch="$TARGET_BRANCH" \
  --commit-dirty=true

echo ""
echo -e "${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}${GREEN}  🎉 部署成功！                                      ${NC}"
echo -e "${BOLD}${GREEN}======================================================${NC}"
info "访问地址可通过 Cloudflare Dashboard 或 Pages 专属域名访问："
echo -e "👉 生产主域名: ${BOLD}https://${PROJECT_NAME}-9xl.pages.dev${NC}"
echo -e "👉 或在 Cloudflare 控制台绑定自定义域名。"
