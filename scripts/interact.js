const { ethers } = require("hardhat");

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x...";

async function main() {
  console.log("🔗 Interacting with KipuBankV2...\n");

  if (CONTRACT_ADDRESS === "0x...") {
    console.error("❌ Please set CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }

  // Get signers
  const [deployer, user1] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("User1 address:", user1.address);

  // Get contract instance
  const KipuBankV2 = await ethers.getContractFactory("KipuBankV2");
  const contract = KipuBankV2.attach(CONTRACT_ADDRESS);

  console.log("Contract address:", contract.address);

  try {
    // Get initial bank stats
    console.log("\n📊 Initial Bank Statistics:");
    const initialStats = await contract.getBankStats();
    console.log("Bank value USD:", ethers.utils.formatUnits(initialStats.bankValueUSD, 6));
    console.log("Remaining capacity USD:", ethers.utils.formatUnits(initialStats.remainingCapacityUSD, 6));
    console.log("Total deposits:", initialStats.totalDepositsCount.toString());
    console.log("Total withdrawals:", initialStats.totalWithdrawalsCount.toString());
    console.log("Supported tokens:", initialStats.supportedTokensCount.toString());

    // Get supported tokens
    console.log("\n🪙 Supported Tokens:");
    const supportedTokens = await contract.getSupportedTokens();
    for (let i = 0; i < supportedTokens.length; i++) {
      const token = supportedTokens[i];
      const tokenInfo = await contract.supportedTokens(token);
      const tokenName = token === ethers.constants.AddressZero ? "ETH" : `Token(${token})`;
      console.log(`${i + 1}. ${tokenName}`);
      console.log(`   Decimals: ${tokenInfo.decimals}`);
      console.log(`   Withdrawal Limit: ${ethers.utils.formatUnits(tokenInfo.withdrawalLimit, tokenInfo.decimals)}`);
      
      try {
        const price = await contract.getTokenPriceUSD(token);
        console.log(`   Current Price: $${ethers.utils.formatUnits(price, 8)}`);
      } catch (error) {
        console.log(`   Price: Unable to fetch (${error.message})`);
      }
    }

    // Example: Deposit ETH
    console.log("\n💰 Depositing 0.1 ETH...");
    const depositAmount = ethers.utils.parseEther("0.1");
    const depositTx = await contract.connect(user1).depositETH({ value: depositAmount });
    await depositTx.wait();
    console.log("✅ Deposit successful!");
    console.log("Transaction hash:", depositTx.hash);

    // Check user balance
    console.log("\n👤 User Balance:");
    const userBalance = await contract.getUserBalance(user1.address, ethers.constants.AddressZero);
    console.log("ETH Balance:", ethers.utils.formatEther(userBalance.balance));
    console.log("USD Value:", ethers.utils.formatUnits(userBalance.usdValue, 6));

    // Get user's total portfolio value
    const totalValueUSD = await contract.getUserTotalValueUSD(user1.address);
    console.log("Total Portfolio USD:", ethers.utils.formatUnits(totalValueUSD, 6));

    // Get detailed balance info
    const balanceInfo = await contract.getUserBalanceInfo(user1.address, ethers.constants.AddressZero);
    console.log("\n📋 Detailed Balance Info:");
    console.log("Amount:", ethers.utils.formatEther(balanceInfo.amount));
    console.log("Last deposit time:", new Date(balanceInfo.lastDepositTime.toNumber() * 1000).toLocaleString());
    console.log("Total deposited:", ethers.utils.formatEther(balanceInfo.totalDeposited));
    console.log("Total withdrawn:", ethers.utils.formatEther(balanceInfo.totalWithdrawn));

    // Example: Withdraw ETH
    console.log("\n💸 Withdrawing 0.05 ETH...");
    const withdrawAmount = ethers.utils.parseEther("0.05");
    const withdrawTx = await contract.connect(user1).withdrawETH(withdrawAmount);
    await withdrawTx.wait();
    console.log("✅ Withdrawal successful!");
    console.log("Transaction hash:", withdrawTx.hash);

    // Check updated balance
    const updatedBalance = await contract.getUserBalance(user1.address, ethers.constants.AddressZero);
    console.log("\n👤 Updated Balance:");
    console.log("ETH Balance:", ethers.utils.formatEther(updatedBalance.balance));
    console.log("USD Value:", ethers.utils.formatUnits(updatedBalance.usdValue, 6));

    // Get final bank stats
    console.log("\n📊 Final Bank Statistics:");
    const finalStats = await contract.getBankStats();
    console.log("Bank value USD:", ethers.utils.formatUnits(finalStats.bankValueUSD, 6));
    console.log("Remaining capacity USD:", ethers.utils.formatUnits(finalStats.remainingCapacityUSD, 6));
    console.log("Total deposits:", finalStats.totalDepositsCount.toString());
    console.log("Total withdrawals:", finalStats.totalWithdrawalsCount.toString());

    console.log("\n🎉 Interaction completed successfully!");

  } catch (error) {
    console.error("❌ Error during interaction:");
    console.error(error.message);
    
    // Additional error handling for common issues
    if (error.message.includes("TokenNotSupported")) {
      console.log("💡 Tip: Make sure the token is supported by the contract");
    } else if (error.message.includes("InsufficientBalance")) {
      console.log("💡 Tip: Check your balance before withdrawing");
    } else if (error.message.includes("WithdrawalExceedsLimit")) {
      console.log("💡 Tip: Withdrawal amount exceeds the configured limit");
    } else if (error.message.includes("BankCapacityExceeded")) {
      console.log("💡 Tip: The bank has reached its capacity limit");
    }
  }
}

// Additional utility functions
async function checkRoles(contract, address) {
  console.log(`\n🔐 Checking roles for ${address}:`);
  
  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
  const ADMIN_ROLE = await contract.ADMIN_ROLE();
  const EMERGENCY_ROLE = await contract.EMERGENCY_ROLE();
  
  const isDefaultAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, address);
  const isAdmin = await contract.hasRole(ADMIN_ROLE, address);
  const isEmergency = await contract.hasRole(EMERGENCY_ROLE, address);
  
  console.log("Default Admin:", isDefaultAdmin);
  console.log("Admin:", isAdmin);
  console.log("Emergency:", isEmergency);
}

async function demonstrateAdminFunctions(contract, adminSigner) {
  console.log("\n🔧 Demonstrating Admin Functions:");
  
  try {
    // Example: Update withdrawal limit
    const newLimit = ethers.utils.parseEther("5"); // 5 ETH
    const updateTx = await contract.connect(adminSigner).updateWithdrawalLimit(
      ethers.constants.AddressZero, // ETH
      newLimit
    );
    await updateTx.wait();
    console.log("✅ Updated ETH withdrawal limit to 5 ETH");
    
    // Example: Pause contract
    const pauseTx = await contract.connect(adminSigner).pause();
    await pauseTx.wait();
    console.log("✅ Contract paused");
    
    // Unpause
    const unpauseTx = await contract.connect(adminSigner).unpause();
    await unpauseTx.wait();
    console.log("✅ Contract unpaused");
    
  } catch (error) {
    console.error("❌ Admin function error:", error.message);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkRoles, demonstrateAdminFunctions };
