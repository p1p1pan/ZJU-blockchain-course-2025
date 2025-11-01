#!/usr/bin/env node
const hre = require("hardhat");

async function main() {
  const address = process.env.EASYBET_ADDRESS || process.argv[2];
  if (!address) {
    console.error("Usage: set EASYBET_ADDRESS or pass address as first arg:\n  PowerShell: $env:EASYBET_ADDRESS='0x...'; npx hardhat run --network ganache scripts/check-bettoken.js\n  OR\n  npx hardhat run --network ganache scripts/check-bettoken.js 0x...");
    process.exit(1);
  }

  console.log("Using EasyBet address:", address);

  const code = await hre.ethers.provider.getCode(address);
  console.log("getCode length:", code ? code.length : 'undefined');
  if (code === "0x") {
    console.error("NO CONTRACT AT ADDRESS (getCode returned 0x)");
    process.exit(1);
  }
  console.log("CONTRACT PRESENT at address");

  try {
    const easy = await hre.ethers.getContractAt("EasyBet", address);
    const tokenAddr = await easy.betToken();
    console.log("betToken address:", tokenAddr);

    const bet = await hre.ethers.getContractAt("BetToken", tokenAddr);
    const decimals = await bet.decimals();
    console.log("BetToken decimals:", decimals.toString());

    const signers = await hre.ethers.getSigners();
    const count = Math.min(signers.length, 5);
    for (let i = 0; i < count; i++) {
      const addr = signers[i].address;
      const bal = await bet.balanceOf(addr);
      console.log(`balance of signer[${i}] ${addr}:`, bal.toString());
    }
  } catch (err) {
    console.error("Error while querying contracts:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
