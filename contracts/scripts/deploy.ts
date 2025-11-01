import { ethers } from "hardhat";

async function main() {
  // 1. 部署 BetToken
  const BetToken = await ethers.getContractFactory("BetToken");
  const betToken = await BetToken.deploy();
  await betToken.deployed();
  console.log(`BetToken deployed to ${betToken.address}`);

  // 2. 部署 LotteryTicket
  const LotteryTicket = await ethers.getContractFactory("LotteryTicket");
  const lotteryTicket = await LotteryTicket.deploy();
  await lotteryTicket.deployed();
  console.log(`LotteryTicket deployed to ${lotteryTicket.address}`);

  // 3. 部署 EasyBet，并传入前两个合约的地址
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = await EasyBet.deploy(
    betToken.address,
    lotteryTicket.address
  );
  await easyBet.deployed();
  console.log(`EasyBet deployed to ${easyBet.address}`);

  // 4. 添加步骤：转移所有权
  console.log("Transferring BetToken ownership to EasyBet...");
  const tx1 = await betToken.transferOwnership(easyBet.address);
  await tx1.wait();
  console.log("BetToken ownership transferred.");

  console.log("Transferring LotteryTicket ownership to EasyBet...");
  const tx2 = await lotteryTicket.transferOwnership(easyBet.address);
  await tx2.wait();
  console.log("LotteryTicket ownership transferred.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});