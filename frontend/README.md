# EasyBet 前端

运行以下命令：

```shell
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 本地测试（使用 Ganache）

```shell
# 1. 启动 Ganache
# GUI版本: 下载 https://trufflesuite.com/ganache/
# 命令行: ganache-cli --port 8545

# 2. 部署合约
cd ../contracts
npx hardhat run scripts/deploy.ts --network ganache

# 3. 配置前端
# 创建 frontend/.env.local 文件:
# VITE_CONTRACT_ADDRESS=0x你的合约地址
# VITE_RPC_URL=http://localhost:8545
# VITE_CHAIN_ID=1337

# 4. 启动前端
cd ../frontend
npm run dev
```

## MetaMask 配置

1. 添加网络: `Ganache Local`
   - RPC URL: `http://localhost:8545`
   - 链 ID: `1337`
   - 符号: `ETH`

2. 从 Ganache 导入账户
   - 从 Ganache 复制私钥
   - 在 MetaMask 中导入

