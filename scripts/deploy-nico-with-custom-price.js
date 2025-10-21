const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NicoCazCoin with custom pricing...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Step 1: Deploy NicoCazCoin token
  console.log("📝 Step 1: Deploying NicoCazCoin token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const nicoToken = await MockERC20.deploy(
    "NicoCazCoin",           // name
    "NICO",                  // symbol
    18                       // decimals
  );
  await nicoToken.deployed();
  console.log("✅ NicoCazCoin deployed to:", nicoToken.address);

  // Step 2: Deploy ETH price feed (using real Chainlink address for Sepolia)
  console.log("\n📝 Step 2: Deploying ETH price feed...");
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const ethPrice = ethers.utils.parseUnits("2000", 8); // $2000.00 USD
  const ethPriceFeed = await MockV3Aggregator.deploy(8, ethPrice);
  await ethPriceFeed.deployed();
  console.log("✅ ETH price feed deployed to:", ethPriceFeed.address);

  // Step 3: Deploy KipuBankV2
  console.log("\n📝 Step 3: Deploying KipuBankV2...");
  const KipuBankV2 = await ethers.getContractFactory("KipuBankV2");
  const kipuBank = await KipuBankV2.deploy(deployer.address, ethPriceFeed.address);
  await kipuBank.deployed();
  console.log("✅ KipuBankV2 deployed to:", kipuBank.address);

  // Step 4: Add NicoCazCoin with custom price ($100 USD)
  console.log("\n📝 Step 4: Adding NicoCazCoin with custom price...");
  const withdrawalLimit = ethers.utils.parseEther("1000"); // 1000 NICO withdrawal limit
  const nicoPriceUSD = ethers.utils.parseUnits("100", 8); // $100.00 USD (8 decimals)
  
  const addTokenTx = await kipuBank.addTokenWithCustomPrice(
    nicoToken.address,
    18, // decimals
    withdrawalLimit,
    nicoPriceUSD
  );
  await addTokenTx.wait();
  console.log("✅ NicoCazCoin added to KipuBankV2 with custom price: $100.00 USD");

  // Step 5: Mint tokens to deployer
  console.log("\n📝 Step 5: Minting NicoCazCoin tokens...");
  const mintAmount = ethers.utils.parseEther("1000000"); // 1M tokens
  await nicoToken.mint(deployer.address, mintAmount);
  console.log("✅ Minted 1,000,000 NICO tokens to deployer");

  // Step 6: Approve tokens for the bank
  console.log("\n📝 Step 6: Approving tokens for KipuBankV2...");
  const approveTx = await nicoToken.approve(kipuBank.address, mintAmount);
  await approveTx.wait();
  console.log("✅ Tokens approved for KipuBankV2");

  // Step 7: Test deposit
  console.log("\n📝 Step 7: Testing deposit...");
  const depositAmount = ethers.utils.parseEther("100"); // 100 NICO
  const depositTx = await kipuBank.depositToken(nicoToken.address, depositAmount);
  await depositTx.wait();
  console.log("✅ Deposited 100 NICO tokens to the bank");

  // Get final balances and stats
  console.log("\n📊 Final Status:");
  
  // Token balance
  const tokenBalance = await nicoToken.balanceOf(deployer.address);
  console.log("Deployer NICO balance:", ethers.utils.formatEther(tokenBalance), "NICO");
  
  // Bank balance
  const [bankBalance, usdValue] = await kipuBank.getUserBalance(deployer.address, nicoToken.address);
  console.log("Bank NICO balance:", ethers.utils.formatEther(bankBalance), "NICO");
  console.log("USD value:", ethers.utils.formatUnits(usdValue, 6), "USD");
  
  // Token price
  const tokenPrice = await kipuBank.getTokenPriceUSD(nicoToken.address);
  console.log("NICO price:", ethers.utils.formatUnits(tokenPrice, 8), "USD");
  
  // Bank stats
  const bankStats = await kipuBank.getBankStats();
  console.log("Total bank value:", ethers.utils.formatUnits(bankStats.bankValueUSD, 6), "USD");
  console.log("Remaining capacity:", ethers.utils.formatUnits(bankStats.remainingCapacityUSD, 6), "USD");
  console.log("Supported tokens:", bankStats.supportedTokensCount.toString());

  // Supported tokens
  const supportedTokens = await kipuBank.getSupportedTokens();
  console.log("Supported token addresses:", supportedTokens);

  console.log("\n🎉 Deployment successful!");
  console.log("\n📄 Deployment Summary:");
  console.log("KipuBankV2 Address:", kipuBank.address);
  console.log("NicoCazCoin Address:", nicoToken.address);
  console.log("ETH Price Feed:", ethPriceFeed.address);
  console.log("Admin Address:", deployer.address);
  console.log("NICO Price: $100.00 USD (custom)");

  console.log("\n💡 You can now:");
  console.log("1. Update NICO price: kipuBank.updateCustomPrice(nicoToken.address, newPrice)");
  console.log("2. Deposit NICO: kipuBank.depositToken(nicoToken.address, amount)");
  console.log("3. Withdraw NICO: kipuBank.withdrawToken(nicoToken.address, amount)");
  console.log("4. Check price: kipuBank.getTokenPriceUSD(nicoToken.address)");
  console.log("5. Deposit ETH: kipuBank.depositETH({ value: amount })");

  console.log("\n🔧 To update NICO price to $150:");
  console.log(`await kipuBank.updateCustomPrice("${nicoToken.address}", ethers.utils.parseUnits("150", 8));`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
