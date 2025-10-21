const { ethers } = require("hardhat");

// Chainlink Price Feed addresses for different networks
const PRICE_FEEDS = {
  mainnet: {
    ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
    USDC_USD: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
    USDT_USD: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D"
  },
  sepolia: {
    ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    BTC_USD: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    USDC_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
  },
  goerli: {
    ETH_USD: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    BTC_USD: "0xA39434A63A52E749F02807ae27335515BA4b07F7",
    USDC_USD: "0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7"
  }
};

// Mock ERC20 token addresses for testing (you can deploy your own or use existing ones)
const MOCK_TOKENS = {
  sepolia: {
    USDC: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F", // Goerli USDC (if available on Sepolia)
    WBTC: "0x0000000000000000000000000000000000000000" // Replace with actual addresses
  },
  goerli: {
    USDC: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
    WBTC: "0x0000000000000000000000000000000000000000" // Replace with actual addresses
  }
};

async function main() {
  console.log("🚀 Starting KipuBankV2 deployment...\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  
  console.log("📝 Deployment details:");
  console.log("Network:", networkName);
  console.log("Chain ID:", network.chainId);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Get price feed address for the network
  let ethPriceFeed;
  if (networkName === "localhost" || networkName === "hardhat") {
    // For local testing, we'll use Sepolia addresses (you might want to deploy mocks)
    ethPriceFeed = PRICE_FEEDS.sepolia.ETH_USD;
    console.log("⚠️  Using Sepolia price feed address for local testing");
  } else if (PRICE_FEEDS[networkName]) {
    ethPriceFeed = PRICE_FEEDS[networkName].ETH_USD;
  } else {
    throw new Error(`No price feed configured for network: ${networkName}`);
  }

  console.log("ETH/USD Price Feed:", ethPriceFeed);

  // Deploy the contract
  console.log("\n⏳ Deploying KipuBankV2 contract...");
  const KipuBankV2 = await ethers.getContractFactory("KipuBankV2");
  const kipuBankV2 = await KipuBankV2.deploy(deployer.address, ethPriceFeed);

  await kipuBankV2.deployed();

  console.log("\n✅ Deployment successful!");
  console.log("📍 Contract deployed to:", kipuBankV2.address);
  console.log("🔧 Admin address:", deployer.address);
  console.log("🏦 Bank capacity: $1,000,000 USD");

  // Display transaction details
  console.log("\n📊 Transaction details:");
  console.log("Transaction hash:", kipuBankV2.deployTransaction.hash);
  console.log("Gas used:", kipuBankV2.deployTransaction.gasLimit.toString());
  console.log("Gas price:", ethers.utils.formatUnits(kipuBankV2.deployTransaction.gasPrice, "gwei"), "gwei");

  // Get initial contract state
  console.log("\n📈 Initial contract state:");
  const bankStats = await kipuBankV2.getBankStats();
  console.log("Bank value USD:", ethers.utils.formatUnits(bankStats.bankValueUSD, 6), "USD");
  console.log("Remaining capacity:", ethers.utils.formatUnits(bankStats.remainingCapacityUSD, 6), "USD");
  console.log("Supported tokens:", bankStats.supportedTokensCount.toString());

  // Add additional tokens if on testnet
  if (networkName !== "localhost" && networkName !== "hardhat" && MOCK_TOKENS[networkName]) {
    console.log("\n🪙 Adding additional token support...");
    
    try {
      // Add USDC support (if available)
      if (MOCK_TOKENS[networkName].USDC !== "0x0000000000000000000000000000000000000000") {
        const usdcPriceFeed = PRICE_FEEDS[networkName].USDC_USD;
        if (usdcPriceFeed) {
          console.log("Adding USDC support...");
          const addUsdcTx = await kipuBankV2.addToken(
            MOCK_TOKENS[networkName].USDC,
            6, // USDC decimals
            ethers.utils.parseUnits("10000", 6), // 10,000 USDC withdrawal limit
            usdcPriceFeed
          );
          await addUsdcTx.wait();
          console.log("✅ USDC support added");
        }
      }
    } catch (error) {
      console.log("⚠️  Could not add additional tokens:", error.message);
    }
  }

  // Verification instructions
  console.log("\n🔍 To verify on Etherscan, run:");
  console.log(`npx hardhat verify --network ${networkName} ${kipuBankV2.address} "${deployer.address}" "${ethPriceFeed}"`);

  // Interaction examples
  console.log("\n💡 Interaction examples:");
  console.log("// Deposit 1 ETH");
  console.log(`await contract.depositETH({ value: ethers.utils.parseEther("1") });`);
  console.log("\n// Check balance");
  console.log(`await contract.getUserBalance("${deployer.address}", "${ethers.constants.AddressZero}");`);
  console.log("\n// Withdraw 0.5 ETH");
  console.log(`await contract.withdrawETH(ethers.utils.parseEther("0.5"));`);

  console.log("\n🎉 Deployment completed successfully!");
  
  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: network.chainId,
    contractAddress: kipuBankV2.address,
    adminAddress: deployer.address,
    ethPriceFeed: ethPriceFeed,
    deploymentHash: kipuBankV2.deployTransaction.hash,
    timestamp: new Date().toISOString()
  };

  console.log("\n📄 Deployment info saved:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
