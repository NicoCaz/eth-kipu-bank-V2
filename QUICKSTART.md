# ⚡ KipuBankV3 - Quick Start Guide

Get started with KipuBankV3 in 5 minutes!

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/eth-kipu-bank-V2.git
cd eth-kipu-bank-V2

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your credentials

# Compile contracts
npm run compile
```

## 🧪 Run Tests

```bash
# Run all V3 tests
npm run test:v3

# Run with gas report
npm run gas-report

# Run with coverage
npm run test:coverage
```

## 🚀 Deploy

### Local Testing

```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:v3
```

### Testnet (Sepolia)

```bash
# Deploy to Sepolia
npm run deploy:v3:sepolia

# Verify on Etherscan (automatic in deploy script)
```

### Mainnet

```bash
# Deploy to Mainnet (use with caution!)
npm run deploy:v3:mainnet
```

## 💡 Usage Examples

### Deposit USDC

```javascript
const { ethers } = require("hardhat");

async function depositUSDC() {
  const kipuBank = await ethers.getContractAt("KipuBankV3", "CONTRACT_ADDRESS");
  const usdc = await ethers.getContractAt("IERC20", await kipuBank.usdc());
  
  const amount = ethers.utils.parseUnits("100", 6); // 100 USDC
  
  await usdc.approve(kipuBank.address, amount);
  await kipuBank.depositUSDC(amount);
  
  console.log("✅ Deposited 100 USDC");
}
```

### Deposit ETH (Auto-swap to USDC)

```javascript
async function depositETH() {
  const kipuBank = await ethers.getContractAt("KipuBankV3", "CONTRACT_ADDRESS");
  
  const ethAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH
  
  // Check expected USDC
  const expectedUsdc = await kipuBank.getExpectedUSDC(
    await kipuBank.NATIVE_TOKEN(),
    ethAmount
  );
  console.log("Expected USDC:", ethers.utils.formatUnits(expectedUsdc, 6));
  
  await kipuBank.depositETH({ value: ethAmount });
  
  console.log("✅ Deposited 0.1 ETH, received USDC");
}
```

### Withdraw USDC

```javascript
async function withdraw() {
  const kipuBank = await ethers.getContractAt("KipuBankV3", "CONTRACT_ADDRESS");
  
  const amount = ethers.utils.parseUnits("50", 6); // 50 USDC
  
  await kipuBank.withdraw(amount);
  
  console.log("✅ Withdrew 50 USDC");
}
```

### Check Balance

```javascript
async function checkBalance() {
  const [signer] = await ethers.getSigners();
  const kipuBank = await ethers.getContractAt("KipuBankV3", "CONTRACT_ADDRESS");
  
  const balance = await kipuBank.getBalance(signer.address);
  console.log("Your balance:", ethers.utils.formatUnits(balance, 6), "USDC");
  
  const userInfo = await kipuBank.getUserInfo(signer.address);
  console.log("Total deposited:", ethers.utils.formatUnits(userInfo.totalDeposited, 6), "USDC");
  console.log("Total withdrawn:", ethers.utils.formatUnits(userInfo.totalWithdrawn, 6), "USDC");
  console.log("Deposit count:", userInfo.depositCount.toString());
}
```

## 🔗 Key Addresses

### Sepolia Testnet

- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Uniswap V2 Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

### Ethereum Mainnet

- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Uniswap V2 Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment instructions
- Review the smart contract code in `src/KipuBankV3.sol`
- Explore tests in `test/KipuBankV3.test.js`

## 🆘 Need Help?

- Check [Troubleshooting](DEPLOYMENT_GUIDE.md#troubleshooting) section
- Open an [issue](https://github.com/YOUR-USERNAME/eth-kipu-bank-V2/issues)
- Read the [tests](test/KipuBankV3.test.js) for more examples

---

**Happy Building! 🏗️**

