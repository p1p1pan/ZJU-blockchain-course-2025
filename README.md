# ZJU-blockchain-course-2025-p1p1pan-Easybet

## 如何运行

1. 在本地启动ganache应用。

2. 在 `./contracts` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```
3. 在 `./contracts` 中编译合约，运行如下的命令：
    ```bash
    npx hardhat compile
    ```
4. 将合约部署到本地 Ganache 网络，运行如下的命令：
   ```bash
   npx hardhat run scripts/deploy.ts --network ganache
    ```
5. 部署成功后，复制 EasyBet 合约的地址(它会显示 "EasyBet deployed to 0x...")。复制到`./frontend/.env.local`文件中的`VITE_CONTRACT_ADDRESS=`
6. 在 `./frontend` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```
7. 在 `./frontend` 中启动前端程序，运行如下的命令：
    ```bash
    npm run dev
    ```
8. 在浏览器中打开应用，并确保你的 MetaMask 钱包连接到本地 Ganache 网络。

## 功能实现分析

本项目完整实现了作业要求中的所有核心功能以及两项 Bonus 功能。

1. 多角色系统：公证人 (Admin):页面会通过检查用户地址是否为合约的owner，从而实现前端的权限控制。
              竞猜玩家 (Player): 任何连接钱包的用户都可以作为玩家参与。
2. ERC20 积分系统：项目发行了一个名为 BetToken (BET) 的 ERC20 合约。
   用户可以在网站导航栏 App.vue 中点击 "领取积分" 来调用 claimBetTokens 获取测试积分。
    所有的核心功能，包括创建活动初始奖池、玩家下注、交易彩票，均使用 BET 积分进行结算。
3. 核心竞猜流程：
   创建活动:公证人填写活动描述、多个选项、截止时间和初始奖池金额，创建活动。
   玩家下注：玩家在"竞猜活动页面"浏览活动，选择选项并输入 BET 金额，购买彩票。合约会为玩家铸造一张LotteryTicket(ERC721)作为凭证，该Token ID中记录了活动ID、选项ID和购买金额。
   结束活动：公证人除了可以设置活动的截止下注时间之外还可以手动提前停止活动下注。
   结算活动：公证人在"结算活动" 界面中为已结束的活动选择一个获胜选项，进行结算。
   领取奖励：玩家在"我的彩票"界面中查看持有的彩票。如果活动已结算且玩家中奖，可以点击 "领取奖励"来按比例瓜分总奖池。
4. 彩票交易市场：
   挂单出售：玩家可以在"我的彩票"界面中为尚未结算的彩票点击 "挂单出售"。
   市场浏览与购买："交易市场" 标签页会获取所有活动（可筛选）中正在出售的彩票列表（即订单簿），并展示其价格、选项等信息。其他玩家可以点击 "购买" 来完成彩票和积分的原子交换。


## 项目运行截图

注:所有按钮点击完之后都会出现MetaMask的与区块链的交易请求，这里因为都是类似的，而且视频里也会体现所以就不一一放出来了。
1.  **首页 & 领取积分**
    * 首页，显示连接钱包按钮。点击后会连接上Metamask钱包的地址
    ![首页](screenshots/01-home.png)
    * 连接钱包后，在导航栏领取 BET 测试积分，点击领取积分后，会跳出MetaMask的与区块链的交易请求。
    ![领取积分](screenshots/02-claim-tokens.png)
2.  **公证人 - 创建活动**
    * 在 "管理后台" 页面填写活动详情并创建。
    ![创建活动](screenshots/03-admin-create.png)
3.  **玩家 - 购买彩票**
    * 在 "竞猜活动" 页面看到新创建的活动，并点击购买。
    ![购买彩票](screenshots/04-buy-ticket.png)
4.  **玩家 - 挂单出售**
    * 在 "我的彩票" 页面查看刚买到的彩票，并进行挂单。
    ![挂单出售](screenshots/05-list-ticket.png)
    ![挂单成功](screenshots/05-list-ticket-success.png)
5. **玩家 - 交易市场**
    * 在 "交易市场" image.png标签页，可以看到所有正在出售的彩票。
    ![交易市场](screenshots/06-market.png)
6.  **公证人 - 结束活动**
    * 在 "管理后台" 的 "结束活动" 标签页，将活动提前结束下注。
    ![结束活动](screenshots/07-admin-end.png)
    ![活动已结束](screenshots/07-admin-ended.png)
7.  **公证人 - 结算活动**
    * 在 "管理后台" 的 "结算活动" 标签页，为已结束的活动选择获胜者。
    ![结算活动](screenshots/08-admin-settle.png)
8.  **玩家 - 领取奖励**
    * 中奖玩家在 "我的彩票" 页面看到状态变为 "中奖"，并可以领取奖励。
    ![领取奖励](screenshots/09-claim-wins.png)
## 参考内容

- 课程的参考Demo见：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)。

- 快速实现 ERC721 和 ERC20：[模版](https://wizard.openzeppelin.com/#erc20)。记得安装相关依赖 ``"@openzeppelin/contracts": "^5.0.0"``。

- 如何实现ETH和ERC20的兑换？ [参考讲解](https://www.wtf.academy/en/docs/solidity-103/DEX/)

