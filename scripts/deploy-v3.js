const hre = require("hardhat");

/**
 * KipuBankV3 Deployment Script
 * 
 * Deploys KipuBankV3 with Uniswap V2 integration
 * 
 * Network Configurations:
 * - Mainnet: Real USDC and Uniswap V2 Router
 * - Sepolia: Testnet USDC and Uniswap V2 Router
 * - Localhost: Deploy mocks for testing
 */

// Network-specific addresses
const NETWORK_CONFIG = {
  // Ethereum Mainnet
  mainnet: {
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  },
  // Sepolia Testnet
  sepolia: {
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
  },
  // For local testing
  localhost: {
    usdc: null, // Will be deployed
    uniswapRouter: null, // Will use mock
  }
};

async function deployMocks() {
  console.log("\n📦 Deploying mock contracts for local testing...");
  
  // Deploy Mock USDC
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.deployed();
  console.log("✅ Mock USDC deployed to:", usdc.address);

  // Note: For full Uniswap testing, you'd need to deploy:
  // - Uniswap V2 Factory
  // - Uniswap V2 Router
  // - Create liquidity pairs
  // For simplicity, we'll use mainnet fork or actual testnet for full integration tests

  return {
    usdc: usdc.address,
    uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" // Using real router address
  };
}

async function main() {
  console.log("🚀 Starting KipuBankV3 Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("📋 Deployment Information:");
  console.log("   Network:", network);
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Get network configuration
  let config;
  if (network === "localhost" || network === "hardhat") {
    config = await deployMocks();
  } else if (NETWORK_CONFIG[network]) {
    config = NETWORK_CONFIG[network];
    console.log("📍 Using network configuration:");
    console.log("   USDC:", config.usdc);
    console.log("   Uniswap Router:", config.uniswapRouter);
    console.log("");
  } else {
    throw new Error(`Network ${network} not supported. Add configuration to NETWORK_CONFIG.`);
  }

  // Deploy KipuBankV3
  console.log("🏗️  Deploying KipuBankV3...");
  const KipuBankV3 = await hre.ethers.getContractFactory("KipuBankV3");
  const kipuBankV3 = await KipuBankV3.deploy(
    config.usdc,
    config.uniswapRouter
  );

  await kipuBankV3.deployed();

  console.log("✅ KipuBankV3 deployed successfully!\n");
  console.log("📝 Contract Address:", kipuBankV3.address);
  console.log("   Owner:", await kipuBankV3.owner());
  console.log("   USDC:", await kipuBankV3.usdc());
  console.log("   Uniswap Router:", await kipuBankV3.uniswapRouter());
  console.log("   Bank Cap:", hre.ethers.utils.formatUnits(await kipuBankV3.BANK_CAP(), 6), "USDC");
  console.log("");

  // Verify bank statistics
  const stats = await kipuBankV3.getBankStats();
  console.log("📊 Initial Bank Statistics:");
  console.log("   Total Balance:", hre.ethers.utils.formatUnits(stats.bankBalance, 6), "USDC");
  console.log("   Remaining Capacity:", hre.ethers.utils.formatUnits(stats.remainingCapacity, 6), "USDC");
  console.log("   Total Deposits:", stats.depositsCount.toString());
  console.log("   Total Withdrawals:", stats.withdrawalsCount.toString());
  console.log("   Total Users:", stats.usersCount.toString());
  console.log("");

  // Wait for block confirmations on live networks
  if (network !== "localhost" && network !== "hardhat") {
    console.log("⏳ Waiting for block confirmations...");
    await kipuBankV3.deployTransaction.wait(5);
    console.log("✅ Block confirmations received\n");

    // Verify contract on Etherscan
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: kipuBankV3.address,
        constructorArguments: [
          config.usdc,
          config.uniswapRouter
        ],
      });
      console.log("✅ Contract verified successfully!\n");
    } catch (error) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("✅ Contract already verified!\n");
      } else {
        console.log("⚠️  Verification failed:", error.message);
        console.log("   You can verify manually with:");
        console.log(`   npx hardhat verify --network ${network} ${kipuBankV3.address} "${config.usdc}" "${config.uniswapRouter}"`);
        console.log("");
      }
    }
  }

  // Save deployment information
  const deploymentInfo = {
    network: network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      KipuBankV3: kipuBankV3.address,
      USDC: config.usdc,
      UniswapRouter: config.uniswapRouter,
    },
    transactionHash: kipuBankV3.deployTransaction.hash,
    gasUsed: (await kipuBankV3.deployTransaction.wait()).gasUsed.toString(),
  };

  console.log("💾 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("");

  console.log("🎉 Deployment completed successfully!");
  console.log("");
  console.log("📌 Next Steps:");
  console.log("   1. Save the contract address:", kipuBankV3.address);
  console.log("   2. Update your frontend with the new address");
  console.log("   3. Test deposits with: npx hardhat run scripts/interact-v3.js --network", network);
  console.log("   4. Verify contract (if not done automatically)");
  console.log("");

  return {
    kipuBankV3: kipuBankV3.address,
    usdc: config.usdc,
    uniswapRouter: config.uniswapRouter
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

module.exports = { main };

