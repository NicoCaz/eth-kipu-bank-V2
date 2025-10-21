const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NicoCazCoin token...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Deploy MockERC20 for NicoCazCoin
  console.log("⏳ Deploying NicoCazCoin token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const nicoToken = await MockERC20.deploy(
    "NicoCazCoin",           // name
    "NICO",                  // symbol
    18                       // decimals (like ETH)
  );

  await nicoToken.deployed();
  console.log("✅ NicoCazCoin deployed to:", nicoToken.address);

  // Deploy MockV3Aggregator for price feed
  console.log("\n⏳ Deploying price feed for NicoCazCoin...");
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  
  // Set initial price to $100 USD (with 8 decimals like Chainlink)
  const initialPrice = ethers.utils.parseUnits("100", 8); // $100.00
  const priceFeed = await MockV3Aggregator.deploy(8, initialPrice);
  
  await priceFeed.deployed();
  console.log("✅ Price feed deployed to:", priceFeed.address);
  console.log("💰 Initial price set to: $100.00 USD");

  // Mint some tokens to the deployer
  console.log("\n⏳ Minting 1,000,000 NICO tokens to deployer...");
  const mintAmount = ethers.utils.parseEther("1000000"); // 1M tokens
  await nicoToken.mint(deployer.address, mintAmount);
  console.log("✅ Minted 1,000,000 NICO tokens");

  // Check token balance
  const balance = await nicoToken.balanceOf(deployer.address);
  console.log("📊 Deployer token balance:", ethers.utils.formatEther(balance), "NICO");

  // If you have KipuBankV2 deployed, add the token to it
  console.log("\n💡 To add this token to KipuBankV2, you can:");
  console.log("1. Deploy KipuBankV2 first (if not already deployed)");
  console.log("2. Call addToken() with these parameters:");
  console.log("   - Token address:", nicoToken.address);
  console.log("   - Decimals: 18");
  console.log("   - Withdrawal limit: 1000 NICO (or your preferred amount)");
  console.log("   - Price feed:", priceFeed.address);

  // Example of how to add to KipuBankV2 (uncomment if you have the bank deployed)
  /*
  console.log("\n⏳ Adding NicoCazCoin to KipuBankV2...");
  const KIPU_BANK_ADDRESS = "YOUR_KIPU_BANK_ADDRESS_HERE"; // Replace with actual address
  const kipuBank = await ethers.getContractAt("KipuBankV2", KIPU_BANK_ADDRESS);
  
  const withdrawalLimit = ethers.utils.parseEther("1000"); // 1000 NICO withdrawal limit
  const addTokenTx = await kipuBank.addToken(
    nicoToken.address,
    18, // decimals
    withdrawalLimit,
    priceFeed.address
  );
  await addTokenTx.wait();
  console.log("✅ NicoCazCoin added to KipuBankV2");
  */

  console.log("\n🎉 NicoCazCoin deployment completed!");
  console.log("\n📄 Token Details:");
  console.log("Name: NicoCazCoin");
  console.log("Symbol: NICO");
  console.log("Decimals: 18");
  console.log("Total Supply: 1,000,000 NICO");
  console.log("Token Address:", nicoToken.address);
  console.log("Price Feed Address:", priceFeed.address);
  console.log("Initial Price: $100.00 USD");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
