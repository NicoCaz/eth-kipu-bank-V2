# KipuBankV2 🏦🚀

**Advanced Multi-Token Vault with Chainlink Price Feeds and Role-Based Access Control**

A production-ready, enterprise-grade smart contract vault system that supports multiple tokens (ETH and ERC-20) with real-time USD valuation, sophisticated access controls, and comprehensive security features.

## 🎯 Project Overview

KipuBankV2 represents a significant evolution from the original KipuBank contract, transforming it from a simple ETH vault into a sophisticated multi-token financial infrastructure. This upgrade demonstrates advanced Solidity patterns, security best practices, and integration with external oracle systems.

## ✨ Major Improvements & New Features

### 🔐 **Role-Based Access Control (OpenZeppelin)**

- **Admin Role**: Can add tokens, update limits, pause/unpause contract
- **Emergency Role**: Can perform emergency withdrawals in critical situations
- **Granular Permissions**: Fine-tuned access control for different operations
- **Role Management**: Secure role assignment and revocation

### 🪙 **Multi-Token Support**

- **Native ETH**: Seamless ETH deposits and withdrawals
- **ERC-20 Tokens**: Support for any ERC-20 compliant token
- **Dynamic Token Addition**: Admins can add new supported tokens
- **Token Configuration**: Individual withdrawal limits and price feeds per token

### 🌐 **Chainlink Oracle Integration**

- **Real-Time Pricing**: Live ETH/USD and token/USD price feeds
- **Price Validation**: Staleness checks and invalid price protection
- **USD-Based Limits**: Bank capacity managed in USD terms ($1M cap)
- **Decimal Conversion**: Automatic handling of different token decimals

### 📊 **Advanced Accounting System**

- **Nested Mappings**: `user => token => balance` structure
- **USD Normalization**: All values converted to 6-decimal USD for consistency
- **Portfolio Tracking**: Complete user portfolio valuation
- **Historical Data**: Track total deposits/withdrawals per user per token

### 🛡️ **Enhanced Security Features**

- **Reentrancy Protection**: OpenZeppelin's ReentrancyGuard
- **Pausable Contract**: Emergency pause functionality
- **Safe Token Transfers**: OpenZeppelin's SafeERC20
- **Input Validation**: Comprehensive validation through modifiers
- **Custom Errors**: Gas-efficient error handling

### 📈 **Comprehensive Analytics**

- **Real-Time Statistics**: Bank value, capacity, transaction counts
- **User Portfolio**: Total USD value across all tokens
- **Token Metrics**: Individual token statistics and performance
- **Historical Tracking**: Detailed balance and transaction history

## 🏗️ Technical Architecture

### Type Declarations

```solidity
struct TokenInfo {
    bool isSupported;
    uint8 decimals;
    uint256 withdrawalLimit;
    AggregatorV3Interface priceFeed;
}

struct UserBalance {
    uint256 amount;
    uint256 lastDepositTime;
    uint256 totalDeposited;
    uint256 totalWithdrawn;
}
```

### Constants

- `BANK_CAP_USD`: $1,000,000 USD maximum capacity
- `NATIVE_TOKEN`: `address(0)` for ETH representation
- `ACCOUNTING_DECIMALS`: 6 decimals (USDC standard)
- `MAX_SUPPORTED_TOKENS`: 50 token limit
- `PRICE_STALENESS_THRESHOLD`: 24-hour price freshness

### Nested Mappings

```solidity
mapping(address => mapping(address => UserBalance)) private _userBalances;
mapping(address => TokenInfo) public supportedTokens;
```

### Chainlink Integration

- ETH/USD price feed for native token valuation
- Individual price feeds for each supported ERC-20 token
- Automatic price staleness validation
- Decimal conversion handling (8 decimals → 6 decimals)

## 🚀 Deployment Instructions

### Prerequisites

```bash
npm install
# or
yarn install
```

### Environment Setup

Create a `.env` file:

```bash
INFURA_PROJECT_ID=your-infura-project-id
PRIVATE_KEY=your-private-key-without-0x
ETHERSCAN_API_KEY=your-etherscan-api-key
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key
```

### Compilation

```bash
npm run compile
```

### Testing

```bash
# Run all tests
npm run test

# Run with gas reporting
npm run gas-report

# Run with coverage
npm run test:coverage
```

### Deployment

#### Sepolia Testnet

```bash
npm run deploy:sepolia
```

#### Goerli Testnet

```bash
npm run deploy:goerli
```

#### Local Development

```bash
# Start local node
npm run node

# Deploy to localhost
npm run deploy:localhost
```

### Contract Verification

```bash
# Sepolia
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "ADMIN_ADDRESS" "ETH_PRICE_FEED_ADDRESS"

# Goerli
npx hardhat verify --network goerli DEPLOYED_ADDRESS "ADMIN_ADDRESS" "ETH_PRICE_FEED_ADDRESS"
```

## 🔧 Interaction Guide

### Basic Operations

#### Deposit ETH

```javascript
// Direct deposit
await contract.depositETH({ value: ethers.utils.parseEther("1.0") });

// Or send ETH directly to contract (triggers receive function)
await signer.sendTransaction({
  to: contractAddress,
  value: ethers.utils.parseEther("1.0"),
});
```

#### Withdraw ETH

```javascript
await contract.withdrawETH(ethers.utils.parseEther("0.5"));
```

#### Deposit ERC-20 Tokens

```javascript
// First approve the contract
await tokenContract.approve(contractAddress, amount);

// Then deposit
await contract.depositToken(tokenAddress, amount);
```

#### Withdraw ERC-20 Tokens

```javascript
await contract.withdrawToken(tokenAddress, amount);
```

### Portfolio Management

#### Check Individual Token Balance

```javascript
const balance = await contract.getUserBalance(userAddress, tokenAddress);
console.log("Balance:", ethers.utils.formatUnits(balance.balance, decimals));
console.log("USD Value:", ethers.utils.formatUnits(balance.usdValue, 6));
```

#### Get Total Portfolio Value

```javascript
const totalUSD = await contract.getUserTotalValueUSD(userAddress);
console.log("Total Portfolio:", ethers.utils.formatUnits(totalUSD, 6), "USD");
```

#### Get Detailed Balance Info

```javascript
const balanceInfo = await contract.getUserBalanceInfo(
  userAddress,
  tokenAddress
);
console.log("Total Deposited:", balanceInfo.totalDeposited);
console.log("Total Withdrawn:", balanceInfo.totalWithdrawn);
console.log("Last Deposit:", new Date(balanceInfo.lastDepositTime * 1000));
```

### Administrative Functions

#### Add New Token Support

```javascript
await contract
  .connect(admin)
  .addToken(tokenAddress, decimals, withdrawalLimit, priceFeedAddress);
```

#### Update Withdrawal Limits

```javascript
await contract.connect(admin).updateWithdrawalLimit(tokenAddress, newLimit);
```

#### Emergency Operations

```javascript
// Pause contract
await contract.connect(admin).pause();

// Emergency withdrawal
await contract.connect(emergency).emergencyWithdraw(tokenAddress, amount);
```

### Analytics & Monitoring

#### Bank Statistics

```javascript
const stats = await contract.getBankStats();
console.log(
  "Bank Value:",
  ethers.utils.formatUnits(stats.bankValueUSD, 6),
  "USD"
);
console.log(
  "Remaining Capacity:",
  ethers.utils.formatUnits(stats.remainingCapacityUSD, 6),
  "USD"
);
console.log("Total Deposits:", stats.totalDepositsCount.toString());
console.log("Total Withdrawals:", stats.totalWithdrawalsCount.toString());
```

#### Supported Tokens

```javascript
const tokens = await contract.getSupportedTokens();
for (const token of tokens) {
  const tokenInfo = await contract.supportedTokens(token);
  const price = await contract.getTokenPriceUSD(token);
  console.log(`Token: ${token}`);
  console.log(`Price: $${ethers.utils.formatUnits(price, 8)}`);
  console.log(
    `Limit: ${ethers.utils.formatUnits(
      tokenInfo.withdrawalLimit,
      tokenInfo.decimals
    )}`
  );
}
```

## 🧪 Testing Suite

The comprehensive test suite covers:

- **Deployment & Initialization**: Role setup, initial state validation
- **Token Management**: Adding tokens, updating configurations
- **Deposit Operations**: ETH and ERC-20 deposits, validation
- **Withdrawal Operations**: Limits, balances, security checks
- **Price Feed Integration**: USD conversion, staleness checks
- **Portfolio Management**: Multi-token balances, USD valuation
- **Access Control**: Role-based permissions, unauthorized access prevention
- **Security Features**: Reentrancy protection, pause functionality
- **Edge Cases**: Capacity limits, error conditions

### Running Tests

```bash
# All tests
npm run test

# With gas reporting
REPORT_GAS=true npm run test

# With coverage
npm run test:coverage
```

## 🔒 Security Considerations

### Implemented Security Measures

1. **Access Control**

   - Role-based permissions using OpenZeppelin AccessControl
   - Multi-signature recommended for production admin keys
   - Emergency role separation for critical operations

2. **Reentrancy Protection**

   - OpenZeppelin ReentrancyGuard on all state-changing functions
   - Checks-Effects-Interactions pattern strictly followed

3. **Safe Token Handling**

   - OpenZeppelin SafeERC20 for all token transfers
   - Proper approval and transfer validation

4. **Price Feed Security**

   - Staleness checks (24-hour threshold)
   - Invalid price validation (negative/zero prices)
   - Circuit breaker patterns for oracle failures

5. **Input Validation**

   - Comprehensive validation through modifiers
   - Zero-amount protection
   - Balance and limit verification

6. **Pausable Operations**
   - Emergency pause functionality
   - Gradual unpause capability
   - Admin-only pause controls

### Security Best Practices

- **Multi-Signature Wallets**: Use multi-sig for admin operations
- **Timelock Contracts**: Consider timelock for critical parameter changes
- **Regular Audits**: Schedule periodic security audits
- **Monitoring**: Implement real-time monitoring for unusual activities
- **Upgrade Patterns**: Consider proxy patterns for future upgrades

## 📊 Gas Optimization

### Optimization Techniques Used

1. **Custom Errors**: Gas-efficient error handling
2. **Packed Structs**: Optimized storage layout
3. **Immutable Variables**: Gas savings for constants
4. **Batch Operations**: Efficient multi-token operations
5. **View Functions**: Off-chain computation where possible

### Gas Estimates

| Function          | Estimated Gas | Notes                               |
| ----------------- | ------------- | ----------------------------------- |
| `depositETH()`    | ~80,000       | First deposit higher due to storage |
| `withdrawETH()`   | ~60,000       | Includes external transfer          |
| `depositToken()`  | ~90,000       | Includes ERC-20 transfer            |
| `withdrawToken()` | ~70,000       | Includes ERC-20 transfer            |
| `addToken()`      | ~120,000      | Admin function, one-time cost       |
| View functions    | ~3,000-5,000  | Read-only operations                |

## 🌐 Network Support

### Mainnet

- ETH/USD: `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`
- Production-ready with full token ecosystem

### Testnets

#### Sepolia

- ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- Recommended for testing and development

#### Goerli

- ETH/USD: `0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e`
- Alternative testnet option

## 📋 Design Decisions & Trade-offs

### Key Design Decisions

1. **USD-Based Accounting**

   - **Decision**: Use 6-decimal USD for internal accounting
   - **Rationale**: Consistent with USDC standard, simplifies multi-token management
   - **Trade-off**: Requires price feed dependency, adds complexity

2. **Role-Based Access Control**

   - **Decision**: Implement granular role system
   - **Rationale**: Enterprise-grade security, flexible permissions
   - **Trade-off**: Increased deployment cost, complexity

3. **Chainlink Integration**

   - **Decision**: Use Chainlink for price feeds
   - **Rationale**: Industry standard, reliable, decentralized
   - **Trade-off**: External dependency, potential oracle risks

4. **Nested Mappings**

   - **Decision**: `user => token => balance` structure
   - **Rationale**: Efficient multi-token balance tracking
   - **Trade-off**: Higher gas costs for complex queries

5. **Pausable Contract**
   - **Decision**: Include emergency pause functionality
   - **Rationale**: Risk mitigation, regulatory compliance
   - **Trade-off**: Centralization risk, user experience impact

### Performance Trade-offs

- **Gas vs Functionality**: Chose comprehensive features over minimal gas usage
- **Security vs Efficiency**: Prioritized security with multiple validation layers
- **Flexibility vs Simplicity**: Opted for flexible multi-token system over simple single-token

## 🚀 Future Enhancements

### Potential Upgrades

1. **Yield Generation**

   - Integration with DeFi protocols (Compound, Aave)
   - Automatic yield farming strategies
   - Reward distribution mechanisms

2. **Advanced Features**

   - Time-locked deposits with higher limits
   - Multi-signature withdrawal requirements
   - Automated rebalancing based on price movements

3. **Governance**

   - DAO governance for parameter changes
   - Community voting on new token additions
   - Decentralized admin role management

4. **Layer 2 Integration**
   - Polygon, Arbitrum, Optimism support
   - Cross-chain bridge functionality
   - Gas optimization for L2 deployments

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/YOUR-USERNAME/KipuBankV2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR-USERNAME/KipuBankV2/discussions)
- **Documentation**: [Wiki](https://github.com/YOUR-USERNAME/KipuBankV2/wiki)

## ⚠️ Disclaimer

This contract is for educational and demonstration purposes. While it implements production-grade security features, conduct thorough testing and professional auditing before using in production environments. The developers are not responsible for any losses incurred through the use of this software.

---

**Built with ❤️ by the KipuBank Team**

_Transforming traditional banking through decentralized technology_
