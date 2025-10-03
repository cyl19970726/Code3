#!/bin/bash
set -e

echo "🚀 部署 Code3 Bounty 合约到 Testnet"

# 检查 Aptos CLI
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI 未安装"
    echo "安装方法: brew install aptos (macOS) 或参考 https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli"
    exit 1
fi

# 检查 Aptos CLI 版本
APTOS_VERSION=$(aptos --version | head -1 | awk '{print $2}')
echo "📝 Aptos CLI 版本: $APTOS_VERSION"

# 初始化账户（如未初始化）
if [ ! -f .aptos/config.yaml ]; then
    echo "🔑 初始化 Aptos 账户（Testnet）"
    aptos init --network testnet
fi

# 获取账户地址（从 JSON 输出中提取，去除引号和逗号）
ACCOUNT=$(aptos config show-profiles 2>/dev/null | grep '"account":' | awk -F'"' '{print $4}' | head -1)
if [ -z "$ACCOUNT" ]; then
    echo "❌ 无法获取账户地址，请检查 Aptos CLI 配置"
    exit 1
fi
echo "📝 部署账户: $ACCOUNT"

# 获取测试币（如余额不足）
echo "💰 获取测试币..."
aptos account fund-with-faucet --account $ACCOUNT || true

# 编译合约
echo "🔨 编译合约..."
aptos move compile --named-addresses code3=$ACCOUNT

# 运行测试（如有）
if [ -d "tests" ] && [ "$(ls -A tests/*.move 2>/dev/null)" ]; then
    echo "🧪 运行 Move 单元测试..."
    aptos move test || echo "⚠️  测试失败，但继续部署"
fi

# 部署合约
echo "🚀 部署合约..."
aptos move publish \
  --named-addresses code3=$ACCOUNT \
  --assume-yes

# 保存合约地址到环境变量文件
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APTOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$APTOS_DIR/.env.testnet"

if [ -f "$ENV_FILE" ]; then
    # 更新现有文件
    if grep -q "APTOS_CONTRACT_ADDRESS_TESTNET" "$ENV_FILE"; then
        sed -i.bak "s/APTOS_CONTRACT_ADDRESS_TESTNET=.*/APTOS_CONTRACT_ADDRESS_TESTNET=$ACCOUNT/" "$ENV_FILE"
        rm "$ENV_FILE.bak"
    else
        echo "APTOS_CONTRACT_ADDRESS_TESTNET=$ACCOUNT" >> "$ENV_FILE"
    fi
else
    # 创建新文件
    echo "APTOS_CONTRACT_ADDRESS_TESTNET=$ACCOUNT" > "$ENV_FILE"
fi

echo "✅ 部署完成！"
echo "📝 合约地址: $ACCOUNT"
echo "📝 已保存到: $ENV_FILE"
echo ""
echo "🔍 查看合约: https://explorer.aptoslabs.com/account/$ACCOUNT?network=testnet"
echo ""
echo "📌 下一步："
echo "  1. 记录合约地址到你的配置文件"
echo "  2. 更新 spec-mcp/aptos-mcp/src/contract/constants.ts 中的合约地址"
echo "  3. 运行 'pnpm --filter @code3/aptos-mcp generate:abi' 生成 TypeScript ABI"
