import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EasyBet", function () {
  // 测试用的辅助函数
  const toWei = (eth: string) => ethers.utils.parseEther(eth);
  const fromWei = (wei: any) => ethers.utils.formatEther(wei);

  // 部署合约的fixture
  async function deployEasyBetFixture() {
    const [owner, player1, player2, player3] = await ethers.getSigners();

    const EasyBet = await ethers.getContractFactory("EasyBet");
    const easyBet = await EasyBet.deploy();

    return { easyBet, owner, player1, player2, player3 };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { easyBet } = await loadFixture(deployEasyBetFixture);
      expect(easyBet.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should set the right owner", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      expect(await easyBet.owner()).to.equal(owner.address);
    });
  });

  describe("CreateActivity", function () {
    it("Should create activity successfully", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后结束
      const initialPot = toWei("1.0");

      await expect(
        easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot })
      ).to.emit(easyBet, "activityCreated")
        .withArgs(0, owner.address, description, endTime);

      // 验证活动信息
      const activity = await easyBet.activities(0);
      expect(activity.owner).to.equal(owner.address);
      expect(activity.description).to.equal(description);
      expect(activity.listedTimestamp).to.equal(endTime);
      expect(activity.over).to.be.false;
      expect(activity.totalAmount).to.equal(initialPot);
    });

    it("Should fail if not owner tries to create activity", async function () {
      const { easyBet, player1 } = await loadFixture(deployEasyBetFixture);
      
      const description = "测试活动";
      const choices = ["选项1", "选项2"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await expect(
        easyBet.connect(player1).CreateActivity(description, choices, endTime, { value: initialPot })
      ).to.be.revertedWithCustomError(easyBet, "OwnableUnauthorizedAccount");
    });

    it("Should fail if choices less than 2", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      const description = "测试活动";
      const choices = ["只有一个选项"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await expect(
        easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot })
      ).to.be.revertedWith("must have choice more than 1");
    });

    it("Should fail if end time is in the past", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      const description = "测试活动";
      const choices = ["选项1", "选项2"];
      const endTime = Math.floor(Date.now() / 1000) - 3600; // 1小时前
      const initialPot = toWei("1.0");

      await expect(
        easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot })
      ).to.be.revertedWith("stop time must later then now");
    });

    it("Should fail if no initial pot provided", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      const description = "测试活动";
      const choices = ["选项1", "选项2"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: 0 })
      ).to.be.revertedWith("Initial pot should be provided");
    });
  });

  describe("Placebet", function () {
    it("Should place bet successfully", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      const betAmount = toWei("0.5");
      const choiceIndex = 0; // 选择湖人

      await expect(
        easyBet.connect(player1).Placebet(activityId, choiceIndex, { value: betAmount })
      ).to.emit(easyBet, "BetPlaced")
        .withArgs(activityId, player1.address, choiceIndex, betAmount);

      // 验证投注信息
      const bet = await easyBet.userBets(activityId, player1.address);
      expect(bet.choiceIndex).to.equal(choiceIndex);
      expect(bet.amount).to.equal(betAmount);
      expect(bet.claimed).to.be.false;
    });

    it("Should allow multiple bets on same choice", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      const firstBet = toWei("0.3");
      const secondBet = toWei("0.2");
      const choiceIndex = 0;

      // 第一次下注
      await easyBet.connect(player1).Placebet(activityId, choiceIndex, { value: firstBet });
      
      // 第二次下注（增加金额）
      await easyBet.connect(player1).Placebet(activityId, choiceIndex, { value: secondBet });

      // 验证总投注金额
      const bet = await easyBet.userBets(activityId, player1.address);
      expect(bet.amount).to.equal(firstBet.add(secondBet));
    });

    it("Should fail if activity does not exist", async function () {
      const { easyBet, player1 } = await loadFixture(deployEasyBetFixture);
      
      const betAmount = toWei("0.5");
      const nonExistentActivityId = 999;

      await expect(
        easyBet.connect(player1).Placebet(nonExistentActivityId, 0, { value: betAmount })
      ).to.be.revertedWith("Activity does not exist");
    });

    it("Should fail if activity is over", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 先结算活动
      await easyBet.connect(owner).ResolveActivity(activityId, 0);
      
      const betAmount = toWei("0.5");
      
      await expect(
        easyBet.connect(player1).Placebet(activityId, 0, { value: betAmount })
      ).to.be.revertedWith("Activity is over");
    });

    it("Should fail if bet time is ended", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个正常的活动
      const description = "正常活动";
      const choices = ["选项1", "选项2"];
      const endTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后结束
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 等待时间过去（模拟时间流逝）
      await ethers.provider.send("evm_increaseTime", [3601]); // 增加3601秒
      await ethers.provider.send("evm_mine", []); // 挖一个区块来更新时间戳

      const betAmount = toWei("0.5");
      
      await expect(
        easyBet.connect(player1).Placebet(activityId, 0, { value: betAmount })
      ).to.be.revertedWith("Activity bet time is ended");
    });

    it("Should fail if invalid choice index", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      const betAmount = toWei("0.5");
      const invalidChoiceIndex = 5; // 只有3个选项（0,1,2）

      await expect(
        easyBet.connect(player1).Placebet(activityId, invalidChoiceIndex, { value: betAmount })
      ).to.be.revertedWith("Invalid choice index");
    });

    it("Should fail if bet amount is zero", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      await expect(
        easyBet.connect(player1).Placebet(activityId, 0, { value: 0 })
      ).to.be.revertedWith("Bet amount must be greater than zero");
    });

    it("Should fail if bet on different choice after first bet", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      const betAmount = toWei("0.5");
      
      // 第一次下注选择选项0
      await easyBet.connect(player1).Placebet(activityId, 0, { value: betAmount });
      
      // 尝试选择不同选项
      await expect(
        easyBet.connect(player1).Placebet(activityId, 1, { value: betAmount })
      ).to.be.revertedWith("Cannot bet on multiple choices in one activity");
    });
  });

  describe("ResolveActivity", function () {
    it("Should resolve activity successfully", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      const winningChoice = 1; // 勇士获胜

      await expect(
        easyBet.connect(owner).ResolveActivity(activityId, winningChoice)
      ).to.emit(easyBet, "ActivityResolved")
        .withArgs(activityId, winningChoice);

      // 验证活动状态
      const activity = await easyBet.activities(activityId);
      expect(activity.over).to.be.true;
      expect(activity.winningChoice).to.equal(winningChoice);
    });

    it("Should fail if not owner tries to resolve", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;
      
      await expect(
        easyBet.connect(player1).ResolveActivity(activityId, 0)
      ).to.be.revertedWithCustomError(easyBet, "OwnableUnauthorizedAccount");
    });

    it("Should fail if activity does not exist", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      const nonExistentActivityId = 999;
      
      await expect(
        easyBet.connect(owner).ResolveActivity(nonExistentActivityId, 0)
      ).to.be.revertedWith("Activity does not exist");
    });

    it("Should fail if activity already resolved", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 先结算一次
      await easyBet.connect(owner).ResolveActivity(activityId, 0);
      
      // 尝试再次结算
      await expect(
        easyBet.connect(owner).ResolveActivity(activityId, 1)
      ).to.be.revertedWith("Activity already resolved");
    });

    it("Should fail if invalid winning choice", async function () {
      const { easyBet, owner } = await loadFixture(deployEasyBetFixture);
      
      // 先创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      const invalidWinningChoice = 5; // 只有3个选项（0,1,2）
      
      await expect(
        easyBet.connect(owner).ResolveActivity(activityId, invalidWinningChoice)
      ).to.be.revertedWith("Invalid winning choice index");
    });
  });

  describe("getWins", function () {
    it("Should claim winnings successfully", async function () {
      const { easyBet, owner, player1, player2 } = await loadFixture(deployEasyBetFixture);
      
      // 创建一个测试活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 玩家下注
      await easyBet.connect(player1).Placebet(activityId, 0, { value: toWei("0.5") }); // 湖人
      await easyBet.connect(player2).Placebet(activityId, 1, { value: toWei("0.3") }); // 勇士

      // 结算活动，勇士获胜
      await easyBet.connect(owner).ResolveActivity(activityId, 1);

      const initialBalance = await player2.getBalance();
      
      const tx = await easyBet.connect(player2).getWins(activityId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      const finalBalance = await player2.getBalance();
      const balanceIncrease = finalBalance.sub(initialBalance);
      
      // 验证事件
      await expect(tx)
        .to.emit(easyBet, "WinningsClaimed")
        .withArgs(activityId, player2.address, balanceIncrease.add(gasUsed));

      // 验证投注状态
      const bet = await easyBet.userBets(activityId, player2.address);
      expect(bet.claimed).to.be.true;
    });

    it("Should fail if activity does not exist", async function () {
      const { easyBet, player2 } = await loadFixture(deployEasyBetFixture);
      
      const nonExistentActivityId = 999;
      
      await expect(
        easyBet.connect(player2).getWins(nonExistentActivityId)
      ).to.be.revertedWith("Activity does not exist");
    });

    it("Should fail if activity not resolved yet", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 创建一个新活动但不结算
      const description = "未结算活动";
      const choices = ["选项1", "选项2"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const newActivityId = 0;
      
      await easyBet.connect(player1).Placebet(newActivityId, 0, { value: toWei("0.1") });
      
      await expect(
        easyBet.connect(player1).getWins(newActivityId)
      ).to.be.revertedWith("Activity not resolved yet");
    });

    it("Should fail if player did not bet", async function () {
      const { easyBet, owner, player3 } = await loadFixture(deployEasyBetFixture);
      
      // 创建一个活动并结算
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      await easyBet.connect(owner).ResolveActivity(activityId, 0);
      
      await expect(
        easyBet.connect(player3).getWins(activityId)
      ).to.be.revertedWith("You did not place a bet on this activity");
    });

    it("Should fail if player's choice did not win", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 玩家下注湖人
      await easyBet.connect(player1).Placebet(activityId, 0, { value: toWei("0.5") });

      // 结算活动，勇士获胜
      await easyBet.connect(owner).ResolveActivity(activityId, 1);

      await expect(
        easyBet.connect(player1).getWins(activityId)
      ).to.be.revertedWith("Your choice did not win");
    });

    it("Should fail if winnings already claimed", async function () {
      const { easyBet, owner, player2 } = await loadFixture(deployEasyBetFixture);
      
      // 创建一个活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 玩家下注勇士
      await easyBet.connect(player2).Placebet(activityId, 1, { value: toWei("0.3") });

      // 结算活动，勇士获胜
      await easyBet.connect(owner).ResolveActivity(activityId, 1);

      // 先领取一次
      await easyBet.connect(player2).getWins(activityId);
      
      // 尝试再次领取
      await expect(
        easyBet.connect(player2).getWins(activityId)
      ).to.be.revertedWith("Winnings already claimed");
    });
  });

  describe("Complete Flow Test", function () {
    it("Should handle complete betting flow", async function () {
      const { easyBet, owner, player1, player2, player3 } = await loadFixture(deployEasyBetFixture);
      
      // 1. 创建活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("2.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 2. 玩家下注
      await easyBet.connect(player1).Placebet(activityId, 0, { value: toWei("1.0") }); // AL
      await easyBet.connect(player2).Placebet(activityId, 1, { value: toWei("0.5") }); // BLG
      await easyBet.connect(player3).Placebet(activityId, 1, { value: toWei("0.3") }); // GEN 

      // 3. 结算活动（BLG获胜）
      await easyBet.connect(owner).ResolveActivity(activityId, 1);

      // 4. 验证活动状态
      const activity = await easyBet.activities(activityId);
      expect(activity.over).to.be.true;
      expect(activity.winningChoice).to.equal(1);
      expect(activity.totalAmount).to.equal(toWei("3.8")); // 2.0 + 1.0 + 0.5 + 0.3

      // 5. 领取奖励
      const player2InitialBalance = await player2.getBalance();
      const player3InitialBalance = await player3.getBalance();

      await easyBet.connect(player2).getWins(activityId);
      await easyBet.connect(player3).getWins(activityId);

      // 验证余额增加
      const player2FinalBalance = await player2.getBalance();
      const player3FinalBalance = await player3.getBalance();
      
      expect(player2FinalBalance).to.be.gt(player2InitialBalance);
      expect(player3FinalBalance).to.be.gt(player3InitialBalance);

      // 6. 验证失败玩家无法领取
      await expect(
        easyBet.connect(player1).getWins(activityId)
      ).to.be.revertedWith("Your choice did not win");
    });
  });

  describe("ERC20 Token Betting", function () {
    it("Should claim tokens successfully", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      const betTokenAddress = await easyBet.betToken();
      const betToken = await ethers.getContractAt("BetToken", betTokenAddress);
      
      // 管理员给用户发放积分
      await easyBet.connect(owner).mintTokensToUser(player1.address, toWei("1000"));
      
      // 检查积分余额
      const finalBalance = await betToken.balanceOf(player1.address);
      expect(finalBalance).to.equal(toWei("1000"));
    });

    it("Should place bet with tokens successfully", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 管理员给用户发放积分
      await easyBet.connect(owner).mintTokensToUser(player1.address, toWei("1000"));
      
      // 创建活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 授权合约使用积分
      const betTokenAddress = await easyBet.betToken();
      const betToken = await ethers.getContractAt("BetToken", betTokenAddress);
      await betToken.connect(player1).approve(easyBet.address, toWei("100"));

      // 使用积分下注
      const betAmount = toWei("50");
      const choiceIndex = 0;

      await expect(
        easyBet.connect(player1).PlaceBetWithTokens(activityId, choiceIndex, betAmount)
      ).to.emit(easyBet, "TokenBetPlaced")
        .withArgs(activityId, player1.address, choiceIndex, betAmount);

      // 验证投注信息
      const bet = await easyBet.userBets(activityId, player1.address);
      expect(bet.choiceIndex).to.equal(choiceIndex);
      expect(bet.amount).to.equal(betAmount);
    });
  });

  describe("NFT Ticket Trading", function () {
    it("Should mint NFT ticket when placing bet", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 创建活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 下注
      const betAmount = toWei("0.5");
      const choiceIndex = 0;

      await easyBet.connect(player1).Placebet(activityId, choiceIndex, { value: betAmount });

      // 验证NFT被铸造
      const nftAddress = await easyBet.lotteryTicket();
      const nftContract = await ethers.getContractAt("LotteryTicket", nftAddress);
      const tokenId = 0;
      expect(await nftContract.ownerOf(tokenId)).to.equal(player1.address);
      expect(await nftContract.tokenToActivity(tokenId)).to.equal(activityId);
      expect(await nftContract.tokenToChoice(tokenId)).to.equal(choiceIndex);
      expect(await nftContract.tokenToAmount(tokenId)).to.equal(betAmount);
    });

    it("Should list ticket for sale", async function () {
      const { easyBet, owner, player1 } = await loadFixture(deployEasyBetFixture);
      
      // 创建活动并下注
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      await easyBet.connect(player1).Placebet(activityId, 0, { value: toWei("0.5") });
      const tokenId = 0;

      // 授权合约转移NFT
      const nftAddress1 = await easyBet.lotteryTicket();
      const nftContract1 = await ethers.getContractAt("LotteryTicket", nftAddress1);
      await nftContract1.connect(player1).approve(easyBet.address, tokenId);

      // 挂牌出售
      const price = toWei("0.3");
      await expect(
        easyBet.connect(player1).listTicket(tokenId, price)
      ).to.emit(easyBet, "TicketListed")
        .withArgs(tokenId, player1.address, price);

      // 验证挂牌信息
      const listing = await easyBet.ticketListings(tokenId);
      expect(listing.seller).to.equal(player1.address);
      expect(listing.price).to.equal(price);
      expect(listing.isListed).to.be.true;
    });

    it("Should buy ticket successfully", async function () {
      const { easyBet, owner, player1, player2 } = await loadFixture(deployEasyBetFixture);
      
      // 创建活动并下注
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      await easyBet.connect(player1).Placebet(activityId, 0, { value: toWei("0.5") });
      const tokenId = 0;

      // 挂牌出售
      const nftAddress2 = await easyBet.lotteryTicket();
      const nftContract2 = await ethers.getContractAt("LotteryTicket", nftAddress2);
      await nftContract2.connect(player1).approve(easyBet.address, tokenId);
      const price = toWei("0.3");
      await easyBet.connect(player1).listTicket(tokenId, price);

      // 购买彩票
      const initialBalance = await player1.getBalance();
      await expect(
        easyBet.connect(player2).buyTicket(tokenId, { value: price })
      ).to.emit(easyBet, "TicketBought")
        .withArgs(tokenId, player2.address, player1.address, price);

      // 验证NFT所有权转移
      const nftAddress3 = await easyBet.lotteryTicket();
      const nftContract3 = await ethers.getContractAt("LotteryTicket", nftAddress3);
      expect(await nftContract3.ownerOf(tokenId)).to.equal(player2.address);
      
      // 验证卖家收到ETH
      const finalBalance = await player1.getBalance();
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should get order book information", async function () {
      const { easyBet, owner, player1, player2 } = await loadFixture(deployEasyBetFixture);
      
      // 创建活动
      const description = "LOL世界赛总冠军预测";
      const choices = ["AL", "BLG", "GEN"];
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      const initialPot = toWei("1.0");

      await easyBet.connect(owner).CreateActivity(description, choices, endTime, { value: initialPot });
      const activityId = 0;

      // 两个玩家下注并挂牌
      await easyBet.connect(player1).Placebet(activityId, 0, { value: toWei("0.5") });
      await easyBet.connect(player2).Placebet(activityId, 0, { value: toWei("0.3") });

      const nftAddress4 = await easyBet.lotteryTicket();
      const nftContract4 = await ethers.getContractAt("LotteryTicket", nftAddress4);
      await nftContract4.connect(player1).approve(easyBet.address, 0);
      await nftContract4.connect(player2).approve(easyBet.address, 1);

      await easyBet.connect(player1).listTicket(0, toWei("0.4"));
      await easyBet.connect(player2).listTicket(1, toWei("0.2"));

      // 获取订单簿信息
      const [tokenIds, prices] = await easyBet.getOrderBook(activityId, 0);
      
      expect(tokenIds.length).to.be.greaterThan(0);
      expect(prices.length).to.be.greaterThan(0);
    });
  });
});