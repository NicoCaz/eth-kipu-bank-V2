const hre = require("hardhat");

/**
 * KipuBankV3 Interaction Script
 * 
 * This script demonstrates how to interact with KipuBankV3
 * 
 * Features:
 * - Deposit USDC directly
 * - Deposit ETH (swaps to USDC via Uniswap)
 * - Deposit any ERC20 token (swaps to USDC via Uniswap)
 * - Withdraw USDC
 * - Check balances and statistics
 */

// Replace with your deployed contract address
const KIPUBANK_V3_ADDRESS = process.env.KIPUBANK_V3_ADDRESS || "YOUR_CONTRACT_ADDRESS";

async function main() {
  console.log("🔄 Starting KipuBankV3 Interaction Script...\n");

  const [user] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("📋 Connection Information:");
  console.log("   Network:", network);
  console.log("   User:", user.address);
  console.log("   Balance:", hre.ethers.utils.formatEther(await user.getBalance()), "ETH\n");

  // Connect to deployed contract
  const KipuBankV3 = await hre.ethers.getContractFactory("KipuBankV3");
  const kipuBankV3 = KipuBankV3.attach(KIPUBANK_V3_ADDRESS);

  console.log("✅ Connected to KipuBankV3:", kipuBankV3.address);
  console.log("");

  // Check contract information
  console.log("📊 Contract Information:");
  const usdc = await kipuBankV3.usdc();
  const router = await kipuBankV3.uniswapRouter();
  const cap = await kipuBankV3.BANK_CAP();
  
  console.log("   USDC Address:", usdc);
  console.log("   Uniswap Router:", router);
  console.log("   Bank Cap:", hre.ethers.utils.formatUnits(cap, 6), "USDC");
  console.log("   Contract Owner:", await kipuBankV3.owner());
  console.log("   Paused:", await kipuBankV3.paused());
  console.log("");

  // Get bank statistics
  const stats = await kipuBankV3.getBankStats();
  console.log("📈 Current Bank Statistics:");
  console.log("   Total Balance:", hre.ethers.utils.formatUnits(stats.bankBalance, 6), "USDC");
  console.log("   Remaining Capacity:", hre.ethers.utils.formatUnits(stats.remainingCapacity, 6), "USDC");
  console.log("   Total Deposits:", stats.depositsCount.toString());
  console.log("   Total Withdrawals:", stats.withdrawalsCount.toString());
  console.log("   Total Users:", stats.usersCount.toString());
  console.log("");

  // Get user balance
  const userBalance = await kipuBankV3.getBalance(user.address);
  console.log("💰 Your Current Balance:", hre.ethers.utils.formatUnits(userBalance, 6), "USDC");
  console.log("");

  // Get detailed user information
  const userInfo = await kipuBankV3.getUserInfo(user.address);
  console.log("👤 Your Detailed Information:");
  console.log("   USDC Amount:", hre.ethers.utils.formatUnits(userInfo.usdcAmount, 6), "USDC");
  console.log("   Total Deposited:", hre.ethers.utils.formatUnits(userInfo.totalDeposited, 6), "USDC");
  console.log("   Total Withdrawn:", hre.ethers.utils.formatUnits(userInfo.totalWithdrawn, 6), "USDC");
  console.log("   Deposit Count:", userInfo.depositCount.toString());
  console.log("   Last Deposit:", userInfo.lastDepositTime.toString() === "0" ? "Never" : new Date(userInfo.lastDepositTime.toNumber() * 1000).toLocaleString());
  console.log("");

  // Example operations (commented out for safety)
  console.log("💡 Example Operations:");
  console.log("");

  // Example 1: Deposit USDC
  console.log("1️⃣  Deposit USDC:");
  console.log("   const usdcContract = await hre.ethers.getContractAt('IERC20', usdc);");
  console.log("   const amount = hre.ethers.utils.parseUnits('100', 6); // 100 USDC");
  console.log("   await usdcContract.approve(kipuBankV3.address, amount);");
  console.log("   await kipuBankV3.depositUSDC(amount);");
  console.log("");

  // Example 2: Deposit ETH (swaps to USDC)
  console.log("2️⃣  Deposit ETH (automatically swaps to USDC):");
  console.log("   const ethAmount = hre.ethers.utils.parseEther('0.1'); // 0.1 ETH");
  console.log("   const expectedUsdc = await kipuBankV3.getExpectedUSDC(kipuBankV3.NATIVE_TOKEN(), ethAmount);");
  console.log("   console.log('Expected USDC:', hre.ethers.utils.formatUnits(expectedUsdc, 6));");
  console.log("   await kipuBankV3.depositETH({ value: ethAmount });");
  console.log("");

  // Example 3: Deposit ERC20 Token
  console.log("3️⃣  Deposit ERC20 Token (automatically swaps to USDC):");
  console.log("   const tokenAddress = '0x...'; // Your token address");
  console.log("   const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddress);");
  console.log("   const tokenAmount = hre.ethers.utils.parseEther('100');");
  console.log("   ");
  console.log("   // Check if pair exists and get expected USDC");
  console.log("   const pairInfo = await kipuBankV3.checkPairExists(tokenAddress);");
  console.log("   if (pairInfo.exists) {");
  console.log("     const expectedUsdc = await kipuBankV3.getExpectedUSDC(tokenAddress, tokenAmount);");
  console.log("     console.log('Expected USDC:', hre.ethers.utils.formatUnits(expectedUsdc, 6));");
  console.log("     ");
  console.log("     await tokenContract.approve(kipuBankV3.address, tokenAmount);");
  console.log("     await kipuBankV3.depositToken(tokenAddress, tokenAmount);");
  console.log("   } else {");
  console.log("     console.log('No USDC pair exists for this token');");
  console.log("   }");
  console.log("");

  // Example 4: Withdraw USDC
  console.log("4️⃣  Withdraw USDC:");
  console.log("   const withdrawAmount = hre.ethers.utils.parseUnits('50', 6); // 50 USDC");
  console.log("   await kipuBankV3.withdraw(withdrawAmount);");
  console.log("");

  // Example 5: Withdraw All
  console.log("5️⃣  Withdraw All USDC:");
  console.log("   await kipuBankV3.withdrawAll();");
  console.log("");

  // Interactive menu (optional)
  if (process.argv.includes("--interactive")) {
    console.log("🎮 Interactive Mode");
    console.log("   Use the examples above to interact with the contract");
    console.log("   Uncomment and modify the examples in this script");
    console.log("");
  }

  console.log("✅ Interaction script completed!");
  console.log("");
  console.log("📚 More Information:");
  console.log("   - Contract Address:", kipuBankV3.address);
  console.log("   - USDC Address:", usdc);
  console.log("   - Your Balance:", hre.ethers.utils.formatUnits(userBalance, 6), "USDC");
  console.log("");
}

// Execute script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

