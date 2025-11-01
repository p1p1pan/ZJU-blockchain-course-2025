# BorrowYourCar Contract

## 合约结构

* **`EasyBet.sol`**: 包含三个合约：
    1.  `BetToken`: ERC20 合约，用于系统的积分。
    2.  `LotteryTicket`: ERC721Enumerable 合约，作为彩票凭证 (NFT)。
    3.  `EasyBet`: 主合约，处理所有活动创建、下注、交易和结算逻辑。

## 如何运行

### 1. 启动本地区块链
* 在本地启动 **Ganache** 应用程序。

### 2. 配置 Hardhat
* 打开 `hardhat.config.ts` 文件。
* 确保 `networks.ganache.url` 与 Ganache 显示的 RPC 地址匹配。
* 确保 `networks.ganache.accounts` 中至少包含一个 Ganache 账户的**私钥**（该账户将成为合约的部署者和初始 Owner）。

### 3. 安装依赖

* 在**当前目录** (`./contracts`) 下，运行：
    ```bash
    npm install
    ```

### 4. 编译和部署

* **编译合约**：
    ```bash
    npx hardhat compile
    ```
* **部署到 Ganache**：
    ```bash
    npx hardhat run scripts/deploy.ts --network ganache
    ```

### 运行测试(已废弃)

* 要运行自动化测试，请执行：
    ```bash
    npx hardhat test
    ```