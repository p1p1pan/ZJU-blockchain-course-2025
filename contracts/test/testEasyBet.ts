import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers"; // 明确类型

// --- 定义类型 ---
// (在Ethers v5中, SignerWithAddress 是 Hardhat-Ethers 插件提供的类型)
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"; 

// 辅助函数
const toWei = (eth: string) => ethers.utils.parseEther(eth);
const fromWei = (wei: any) => ethers.utils.formatEther(wei);

describe("EasyBet", function () {
  
  let easyBet: Contract,
      betToken: Contract,
      lotteryTicket: Contract,
      owner: SignerWithAddress,
      player1: SignerWithAddress,
      player2: SignerWithAddress,
      player3: SignerWithAddress;

  // --- 部署合约的 Fixture (已更新) ---
  async function deployEasyBetFixture() {
    const [owner, player1, player2, player3] = await ethers.getSigners();

    // 1. 部署 BetToken
    const BetTokenFactory = await ethers.getContractFactory("BetToken");
    const betToken = await BetTokenFactory.deploy();
    await betToken.deployed();

    // 2. 部署 LotteryTicket
    const LotteryTicketFactory = await ethers.getContractFactory("LotteryTicket");
    const lotteryTicket = await LotteryTicketFactory.deploy();
    await lotteryTicket.deployed();

    // 3. 部署 EasyBet
    const EasyBetFactory = await ethers.getContractFactory("EasyBet");
    const easyBet = await EasyBetFactory.deploy(
      betToken.address,
      lotteryTicket.address
    );
    await easyBet.deployed();

    // 4. 转移所有权
    await betToken.transferOwnership(easyBet.address);
    await lotteryTicket.transferOwnership(easyBet.address);

    return { easyBet, betToken, lotteryTicket, owner, player1, player2, player3 };
  }

  // --- 在每个 describe 块之前加载 Fixture ---
  beforeEach(async function () {
    const fixture = await loadFixture(deployEasyBetFixture);
    easyBet = fixture.easyBet;
    betToken = fixture.betToken;
    lotteryTicket = fixture.lotteryTicket;
    owner = fixture.owner;
    player1 = fixture.player1;
    player2 = fixture.player2;
    player3 = fixture.player3;
  });

  // --- 测试部署 ---
  describe("Deployment", function () {
    it("Should deploy successfully and set owners", async function () {
      expect(easyBet.address).to.not.equal(ethers.constants.AddressZero);
      expect(await easyBet.owner()).to.equal(owner.address);
      // 检查子合约的 owner 是否已转移给 EasyBet
      expect(await betToken.owner()).to.equal(easyBet.address);
      expect(await lotteryTicket.owner()).to.equal(easyBet.address);
    });

    it("LotteryTicket ID should start from 1", async function() {
      // 玩家领取积分并授权
      await easyBet.connect(player1).claimBetTokens();
      await betToken.connect(player1).approve(easyBet.address, toWei("1"));
      await easyBet.connect(owner).claimBetTokens();

      // 创建活动
      await betToken.connect(owner).approve(easyBet.address, toWei("100"));
      await easyBet.connect(owner).CreateActivity("Test", ["A", "B"], (await time.latest()) + 3600, toWei("100"));
      
      // 下注
      await easyBet.connect(player1).Placebet(0, 0, toWei("1"));
      
      // 检查 tokenId 1
      expect(await lotteryTicket.ownerOf(1)).to.equal(player1.address);
    });
  });

  // --- 测试活动创建 (使用 ERC20) ---
  describe("CreateActivity (with ERC20)", function () {
    it("Should create activity successfully with BetToken", async function () {
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = (await time.latest()) + 3600;
      const initialPot = toWei("1000"); // 1000 BET

      // Owner 必须先拥有 BetToken (通过 claimBetTokens)
      await easyBet.connect(owner).claimBetTokens();
      
      // Owner 必须先 approve EasyBet 合约花费
      await betToken.connect(owner).approve(easyBet.address, initialPot);

      // 创建活动
      await expect(
        easyBet.connect(owner).CreateActivity(description, choices, endTime, initialPot)
      ).to.emit(easyBet, "activityCreated")
       .withArgs(0, owner.address, description, endTime);

      // 验证活动信息
      const activity = await easyBet.getActivityDetails(0); // 使用 getter
      expect(activity.owner).to.equal(owner.address);
      expect(activity.description).to.equal(description);
      expect(activity.listedTimestamp).to.equal(endTime);
      expect(activity.over).to.be.false;
      expect(activity.totalAmount).to.equal(initialPot);
      
      // 验证积分已转入合约
      expect(await betToken.balanceOf(easyBet.address)).to.equal(initialPot);
    });

    it("Should fail if owner has insufficient BetToken", async function () {
      const description = "Test";
      const choices = ["A", "B"];
      const endTime = (await time.latest()) + 3600;
      const initialPot = toWei("1000");
      
      // Owner 没有 claimBetTokens，余额为 0
      // Owner 授权
      await betToken.connect(owner).approve(easyBet.address, initialPot);

await expect(
        easyBet.connect(owner).CreateActivity(description, choices, endTime, initialPot)
      ).to.be.revertedWithCustomError(betToken,"ERC20InsufficientBalance");
    });
  });

  // --- 测试下注 (使用 ERC20 和 NFT) ---
  describe("Placebet (with ERC20 & NFT)", function () {
    let activityId: number;

    // 在这个测试块开始前，先创建好一个活动
    beforeEach(async function() {
      // Owner 领取积分并创建活动
      await easyBet.connect(owner).claimBetTokens();
      const initialPot = toWei("1000");
      await betToken.connect(owner).approve(easyBet.address, initialPot);
      await easyBet.connect(owner).CreateActivity(
        "Test Activity", 
        ["Choice A", "Choice B"], 
        (await time.latest()) + 3600, 
        initialPot
      );
      activityId = 0;

      // Player1 领取积分
      await easyBet.connect(player1).claimBetTokens(); // 领取 10000 BET
    });

    it("Should place bet successfully and mint NFT", async function () {
      const betAmount = toWei("50");
      const choiceIndex = 0;

      // Player1 授权
      await betToken.connect(player1).approve(easyBet.address, betAmount);

      // 下注
      await expect(
        easyBet.connect(player1).Placebet(activityId, choiceIndex, betAmount)
      ).to.emit(easyBet, "BetPlaced")
       .withArgs(activityId, player1.address, choiceIndex, betAmount);

      // 验证 NFT 被铸造 (TokenId 应该是 1)
      const tokenId = 1;
      expect(await lotteryTicket.ownerOf(tokenId)).to.equal(player1.address);
      expect(await lotteryTicket.tokenToActivity(tokenId)).to.equal(activityId);
      expect(await lotteryTicket.tokenToChoice(tokenId)).to.equal(choiceIndex);
      expect(await lotteryTicket.tokenToAmount(tokenId)).to.equal(betAmount);
      
      // 验证已售彩票数量
      const activity = await easyBet.getActivityDetails(activityId);
      expect(activity.soldTickets).to.equal(1);
    });

    it("Should allow multiple bets (mints multiple NFTs)", async function () {
      const betAmount = toWei("20");
      
      // 玩家1授权
      await betToken.connect(player1).approve(easyBet.address, toWei("100"));
      
      // 第一次下注 (Choice 0)
      await easyBet.connect(player1).Placebet(activityId, 0, betAmount);
      
      // 第二次下注 (Choice 1)
      await easyBet.connect(player1).Placebet(activityId, 1, betAmount);

      // 验证玩家1现在拥有 2 张彩票 (NFT)
      expect(await lotteryTicket.balanceOf(player1.address)).to.equal(2);
      
      // 验证 TokenId 1 和 2
      expect(await lotteryTicket.ownerOf(1)).to.equal(player1.address);
      expect(await lotteryTicket.tokenToChoice(1)).to.equal(0);
      
      expect(await lotteryTicket.ownerOf(2)).to.equal(player1.address);
      expect(await lotteryTicket.tokenToChoice(2)).to.equal(1);

      // 验证已售彩票数量
      const activity = await easyBet.getActivityDetails(activityId);
      expect(activity.soldTickets).to.equal(2);
    });

    it("Should fail if bet amount is zero", async function () {
      await expect(
        easyBet.connect(player1).Placebet(activityId, 0, 0)
      ).to.be.revertedWith("Bet amount must be greater than zero");
    });
  });

  // --- 测试领奖 (基于 NFT) ---
  describe("getWins (based on NFT)", function () {
    let activityId: number;
    let tokenIdP1: number = 1; // P1 的彩票 ID
    let tokenIdP2: number = 2; // P2 的彩票 ID

    beforeEach(async function() {
      // 1. 创建活动 (Owner)
      await easyBet.connect(owner).claimBetTokens();
      const initialPot = toWei("1000");
      await betToken.connect(owner).approve(easyBet.address, initialPot);
      await easyBet.connect(owner).CreateActivity(
        "Test", ["Win", "Lose"], (await time.latest()) + 3600, initialPot
      );
      activityId = 0;

      // 2. 玩家1下注
      await easyBet.connect(player1).claimBetTokens();
      const betAmountP1 = toWei("500");
      await betToken.connect(player1).approve(easyBet.address, betAmountP1);
      await easyBet.connect(player1).Placebet(activityId, 0, betAmountP1); // P1 投 "Win"

      // 3. 玩家2下注
      await easyBet.connect(player2).claimBetTokens();
      const betAmountP2 = toWei("300");
      await betToken.connect(player2).approve(easyBet.address, betAmountP2);
      await easyBet.connect(player2).Placebet(activityId, 1, betAmountP2); // P2 投 "Lose"
      
      // 4. 结算活动 (P2 获胜)
      await easyBet.connect(owner).ResolveActivity(activityId, 1);
    });

    it("Should claim winnings successfully using Token ID", async function () {
      const p2InitialBalance = await betToken.balanceOf(player2.address);
      
      // P2 使用 tokenId 2 领奖
      await expect(
        easyBet.connect(player2).getWins(tokenIdP2)
      ).to.emit(easyBet, "WinningsClaimed");

      const p2FinalBalance = await betToken.balanceOf(player2.address);
      
      // 验证 P2 余额增加
      expect(p2FinalBalance).to.be.gt(p2InitialBalance);

      // 验证彩票被标记为已领取
      expect(await easyBet.ticketClaimed(tokenIdP2)).to.be.true;
    });

    it("Should fail if player's choice did not win", async function () {
      // P1 (投了 0) 尝试用 tokenId 1 领奖，但 1 获胜
      await expect(
        easyBet.connect(player1).getWins(tokenIdP1)
      ).to.be.revertedWith("Your choice did not win");
    });

    it("Should fail if winnings already claimed", async function () {
      // P2 第一次领奖
      await easyBet.connect(player2).getWins(tokenIdP2);
      
      // P2 尝试第二次领奖
      await expect(
        easyBet.connect(player2).getWins(tokenIdP2)
      ).to.be.revertedWith("This ticket has already been claimed");
    });

    it("Should fail if trying to claim with wrong owner", async function () {
      // P1 尝试用 P2 的 tokenId 领奖
      await expect(
        easyBet.connect(player1).getWins(tokenIdP2)
      ).to.be.revertedWith("You are not the owner of this ticket");
    });
  });

  // --- 测试交易市场 ---
  describe("NFT Ticket Trading (with ERC20)", function () {
    let activityId: number;
    let tokenIdP1: number = 1;

    beforeEach(async function() {
      // 1. 创建活动 (Owner)
      await easyBet.connect(owner).claimBetTokens();
      const initialPot = toWei("1000");
      await betToken.connect(owner).approve(easyBet.address, initialPot);
      await easyBet.connect(owner).CreateActivity(
        "Test", ["A", "B"], (await time.latest()) + 3600, initialPot
      );
      activityId = 0;

      // 2. 玩家1下注
      await easyBet.connect(player1).claimBetTokens();
      const betAmountP1 = toWei("500");
      await betToken.connect(player1).approve(easyBet.address, betAmountP1);
      await easyBet.connect(player1).Placebet(activityId, 0, betAmountP1);
    });

    it("Should list ticket for sale", async function () {
      const price = toWei("600");
      
      // 1. P1 授权 NFT 给 EasyBet
      await lotteryTicket.connect(player1).approve(easyBet.address, tokenIdP1);

      // 2. P1 挂单
      await expect(
        easyBet.connect(player1).listTicket(tokenIdP1, price)
      ).to.emit(easyBet, "TicketListed")
       .withArgs(tokenIdP1, player1.address, price);

      const listing = await easyBet.ticketListings(tokenIdP1);
      expect(listing.seller).to.equal(player1.address);
      expect(listing.price).to.equal(price);
      expect(listing.isListed).to.be.true;
    });

    it("Should buy ticket successfully", async function () {
      const price = toWei("600");
      
      // P1 挂单
      await lotteryTicket.connect(player1).approve(easyBet.address, tokenIdP1);
      await easyBet.connect(player1).listTicket(tokenIdP1, price);

      // P2 准备购买
      await easyBet.connect(player2).claimBetTokens();
      await betToken.connect(player2).approve(easyBet.address, price);

      const p1InitialBalance = await betToken.balanceOf(player1.address);

      // P2 购买
      await expect(
        easyBet.connect(player2).buyTicket(tokenIdP1)
      ).to.emit(easyBet, "TicketBought")
       .withArgs(tokenIdP1, player2.address, player1.address, price);

      // 验证 P2 拥有 NFT
      expect(await lotteryTicket.ownerOf(tokenIdP1)).to.equal(player2.address);
      
      // 验证 P1 收到积分
      const p1FinalBalance = await betToken.balanceOf(player1.address);
      expect(p1FinalBalance).to.equal(p1InitialBalance.add(price));
      
      // 验证挂单已移除
      const listing = await easyBet.ticketListings(tokenIdP1);
      expect(listing.isListed).to.be.false;
    });

    it("Should fail to buy if activity is resolved", async function () {
      const price = toWei("600");
      
      // P1 挂单
      await lotteryTicket.connect(player1).approve(easyBet.address, tokenIdP1);
      await easyBet.connect(player1).listTicket(tokenIdP1, price);

      // Owner 结算活动
      await easyBet.connect(owner).ResolveActivity(activityId, 0);

      // P2 准备购买
      await easyBet.connect(player2).claimBetTokens();
      await betToken.connect(player2).approve(easyBet.address, price);

      // P2 尝试购买已结算的彩票
      await expect(
        easyBet.connect(player2).buyTicket(tokenIdP1)
      ).to.be.revertedWith("Activity is already resolved");
    });
  });
});