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

# 本地测试（使用 Ganache）

# 1. 启动 Ganache
(确保 Ganache 运行在 [http://127.0.0.1:7545](http://127.0.0.1:7545))

# 2. 部署合约
cd ../contracts
npx hardhat run scripts/deploy.ts --network ganache
部署成功后，复制终端输出的 'EasyBet' 合约地址

# 3. 配置前端
在 'frontend' 目录下的 .env.local 文件:
(注意：只需要合约地址。RPC和Chain ID将从MetaMask自动获取)
VITE_CONTRACT_ADDRESS=你从步骤2复制的EasyBet合约地址

# 4. 启动前端
确保你在项目的 'frontend' 目录下
cd ../frontend
npm run dev