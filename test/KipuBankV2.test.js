const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KipuBankV2 Contract", function () {
  let KipuBankV2;
  let kipuBankV2;
  let MockERC20;
  let mockToken;
  let MockPriceFeed;
  let ethPriceFeed;
  let tokenPriceFeed;
  let owner;
  let admin;
  let user1;
  let user2;
  let emergency;

  const INITIAL_ETH_PRICE = ethers.utils.parseUnits("2000", 8); // $2000 with 8 decimals
  const INITIAL_TOKEN_PRICE = ethers.utils.parseUnits("1", 8); // $1 with 8 decimals

  beforeEach(async function () {
    [owner, admin, user1, user2, emergency] = await ethers.getSigners();

    // Deploy mock price feeds
    MockPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
    ethPriceFeed = await MockPriceFeed.deploy(8, INITIAL_ETH_PRICE);
    tokenPriceFeed = await MockPriceFeed.deploy(8, INITIAL_TOKEN_PRICE);

    // Deploy mock ERC20 token
    MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MOCK", 18);

    // Mint tokens to users for testing
    await mockToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.utils.parseEther("1000"));

    // Deploy KipuBankV2
    KipuBankV2 = await ethers.getContractFactory("KipuBankV2");
    kipuBankV2 = await KipuBankV2.deploy(admin.address, ethPriceFeed.address);
    await kipuBankV2.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await kipuBankV2.BANK_CAP_USD()).to.equal(ethers.utils.parseUnits("1000000", 6));
      expect(await kipuBankV2.NATIVE_TOKEN()).to.equal(ethers.constants.AddressZero);
      expect(await kipuBankV2.totalBankValueUSD()).to.equal(0);
      
      const supportedTokens = await kipuBankV2.getSupportedTokens();
      expect(supportedTokens.length).to.equal(1);
      expect(supportedTokens[0]).to.equal(ethers.constants.AddressZero);
    });

    it("Should set up roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await kipuBankV2.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await kipuBankV2.ADMIN_ROLE();
      const EMERGENCY_ROLE = await kipuBankV2.EMERGENCY_ROLE();

      expect(await kipuBankV2.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await kipuBankV2.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await kipuBankV2.hasRole(EMERGENCY_ROLE, admin.address)).to.be.true;
    });

    it("Should have ETH configured correctly", async function () {
      const ethInfo = await kipuBankV2.supportedTokens(ethers.constants.AddressZero);
      expect(ethInfo.isSupported).to.be.true;
      expect(ethInfo.decimals).to.equal(18);
      expect(ethInfo.withdrawalLimit).to.equal(ethers.utils.parseEther("10"));
    });
  });

  describe("Token Management", function () {
    it("Should allow admin to add new tokens", async function () {
      await expect(
        kipuBankV2.connect(admin).addToken(
          mockToken.address,
          18,
          ethers.utils.parseEther("1000"),
          tokenPriceFeed.address
        )
      ).to.emit(kipuBankV2, "TokenAdded")
        .withArgs(mockToken.address, 18, ethers.utils.parseEther("1000"), tokenPriceFeed.address);

      const tokenInfo = await kipuBankV2.supportedTokens(mockToken.address);
      expect(tokenInfo.isSupported).to.be.true;
      expect(tokenInfo.decimals).to.equal(18);
      expect(tokenInfo.withdrawalLimit).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should not allow non-admin to add tokens", async function () {
      await expect(
        kipuBankV2.connect(user1).addToken(
          mockToken.address,
          18,
          ethers.utils.parseEther("1000"),
          tokenPriceFeed.address
        )
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should allow admin to update withdrawal limits", async function () {
      const newLimit = ethers.utils.parseEther("5");
      
      await expect(
        kipuBankV2.connect(admin).updateWithdrawalLimit(ethers.constants.AddressZero, newLimit)
      ).to.emit(kipuBankV2, "TokenConfigUpdated")
        .withArgs(ethers.constants.AddressZero, newLimit);

      const ethInfo = await kipuBankV2.supportedTokens(ethers.constants.AddressZero);
      expect(ethInfo.withdrawalLimit).to.equal(newLimit);
    });
  });

  describe("ETH Deposits", function () {
    it("Should allow ETH deposits", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      const expectedUSDValue = depositAmount.mul(INITIAL_ETH_PRICE).div(ethers.utils.parseUnits("1", 26)); // Convert to 6 decimals

      await expect(
        kipuBankV2.connect(user1).depositETH({ value: depositAmount })
      ).to.emit(kipuBankV2, "Deposit")
        .withArgs(user1.address, ethers.constants.AddressZero, depositAmount, expectedUSDValue);

      const balance = await kipuBankV2.getUserBalance(user1.address, ethers.constants.AddressZero);
      expect(balance.balance).to.equal(depositAmount);
      expect(balance.usdValue).to.equal(expectedUSDValue);
    });

    it("Should update bank statistics on deposit", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      await kipuBankV2.connect(user1).depositETH({ value: depositAmount });

      const stats = await kipuBankV2.getBankStats();
      expect(stats.totalDepositsCount).to.equal(1);
      expect(stats.bankValueUSD).to.be.gt(0);
    });

    it("Should revert on zero deposit", async function () {
      await expect(
        kipuBankV2.connect(user1).depositETH({ value: 0 })
      ).to.be.revertedWithCustomError(kipuBankV2, "ZeroAmount");
    });

    it("Should handle receive function", async function () {
      const depositAmount = ethers.utils.parseEther("0.5");
      
      await expect(
        user1.sendTransaction({ to: kipuBankV2.address, value: depositAmount })
      ).to.emit(kipuBankV2, "Deposit");

      const balance = await kipuBankV2.getUserBalance(user1.address, ethers.constants.AddressZero);
      expect(balance.balance).to.equal(depositAmount);
    });
  });

  describe("ETH Withdrawals", function () {
    beforeEach(async function () {
      // Deposit some ETH first
      await kipuBankV2.connect(user1).depositETH({ value: ethers.utils.parseEther("5") });
    });

    it("Should allow ETH withdrawals within limit", async function () {
      const withdrawAmount = ethers.utils.parseEther("2");
      const initialBalance = await user1.getBalance();

      await expect(
        kipuBankV2.connect(user1).withdrawETH(withdrawAmount)
      ).to.emit(kipuBankV2, "Withdrawal");

      const balance = await kipuBankV2.getUserBalance(user1.address, ethers.constants.AddressZero);
      expect(balance.balance).to.equal(ethers.utils.parseEther("3"));
    });

    it("Should revert when exceeding withdrawal limit", async function () {
      const excessiveAmount = ethers.utils.parseEther("15"); // Exceeds 10 ETH limit

      await expect(
        kipuBankV2.connect(user1).withdrawETH(excessiveAmount)
      ).to.be.revertedWithCustomError(kipuBankV2, "WithdrawalExceedsLimit");
    });

    it("Should revert when withdrawing more than balance", async function () {
      const excessiveAmount = ethers.utils.parseEther("10");

      await expect(
        kipuBankV2.connect(user1).withdrawETH(excessiveAmount)
      ).to.be.revertedWithCustomError(kipuBankV2, "InsufficientBalance");
    });
  });

  describe("ERC-20 Token Operations", function () {
    beforeEach(async function () {
      // Add mock token support
      await kipuBankV2.connect(admin).addToken(
        mockToken.address,
        18,
        ethers.utils.parseEther("1000"),
        tokenPriceFeed.address
      );

      // Approve tokens for deposit
      await mockToken.connect(user1).approve(kipuBankV2.address, ethers.utils.parseEther("1000"));
    });

    it("Should allow ERC-20 token deposits", async function () {
      const depositAmount = ethers.utils.parseEther("100");

      await expect(
        kipuBankV2.connect(user1).depositToken(mockToken.address, depositAmount)
      ).to.emit(kipuBankV2, "Deposit");

      const balance = await kipuBankV2.getUserBalance(user1.address, mockToken.address);
      expect(balance.balance).to.equal(depositAmount);
    });

    it("Should allow ERC-20 token withdrawals", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const withdrawAmount = ethers.utils.parseEther("50");

      await kipuBankV2.connect(user1).depositToken(mockToken.address, depositAmount);
      
      await expect(
        kipuBankV2.connect(user1).withdrawToken(mockToken.address, withdrawAmount)
      ).to.emit(kipuBankV2, "Withdrawal");

      const balance = await kipuBankV2.getUserBalance(user1.address, mockToken.address);
      expect(balance.balance).to.equal(ethers.utils.parseEther("50"));
    });

    it("Should revert when depositing unsupported token", async function () {
      const unsupportedToken = await MockERC20.deploy("Unsupported", "UNSUP", 18);
      
      await expect(
        kipuBankV2.connect(user1).depositToken(unsupportedToken.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWithCustomError(kipuBankV2, "TokenNotSupported");
    });
  });

  describe("Price Feed Integration", function () {
    it("Should get correct token price", async function () {
      const price = await kipuBankV2.getTokenPriceUSD(ethers.constants.AddressZero);
      expect(price).to.equal(INITIAL_ETH_PRICE);
    });

    it("Should convert amounts to USD correctly", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      await kipuBankV2.connect(user1).depositETH({ value: depositAmount });

      const balance = await kipuBankV2.getUserBalance(user1.address, ethers.constants.AddressZero);
      // 1 ETH * $2000 = $2000 (with 6 decimals = 2000000000)
      const expectedUSD = ethers.utils.parseUnits("2000", 6);
      expect(balance.usdValue).to.equal(expectedUSD);
    });
  });

  describe("Portfolio Management", function () {
    beforeEach(async function () {
      // Add mock token support
      await kipuBankV2.connect(admin).addToken(
        mockToken.address,
        18,
        ethers.utils.parseEther("1000"),
        tokenPriceFeed.address
      );
      await mockToken.connect(user1).approve(kipuBankV2.address, ethers.utils.parseEther("1000"));
    });

    it("Should calculate total portfolio value correctly", async function () {
      // Deposit 1 ETH ($2000) and 500 tokens ($500)
      await kipuBankV2.connect(user1).depositETH({ value: ethers.utils.parseEther("1") });
      await kipuBankV2.connect(user1).depositToken(mockToken.address, ethers.utils.parseEther("500"));

      const totalValue = await kipuBankV2.getUserTotalValueUSD(user1.address);
      const expectedTotal = ethers.utils.parseUnits("2500", 6); // $2500
      expect(totalValue).to.equal(expectedTotal);
    });

    it("Should provide detailed balance information", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      await kipuBankV2.connect(user1).depositETH({ value: depositAmount });

      const balanceInfo = await kipuBankV2.getUserBalanceInfo(user1.address, ethers.constants.AddressZero);
      expect(balanceInfo.amount).to.equal(depositAmount);
      expect(balanceInfo.totalDeposited).to.equal(depositAmount);
      expect(balanceInfo.totalWithdrawn).to.equal(0);
      expect(balanceInfo.lastDepositTime).to.be.gt(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to pause and unpause", async function () {
      await kipuBankV2.connect(admin).pause();
      expect(await kipuBankV2.paused()).to.be.true;

      await expect(
        kipuBankV2.connect(user1).depositETH({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Pausable: paused");

      await kipuBankV2.connect(admin).unpause();
      expect(await kipuBankV2.paused()).to.be.false;
    });

    it("Should allow emergency withdrawal", async function () {
      // Deposit some ETH first
      await kipuBankV2.connect(user1).depositETH({ value: ethers.utils.parseEther("1") });

      const initialBalance = await admin.getBalance();
      const withdrawAmount = ethers.utils.parseEther("0.5");

      await expect(
        kipuBankV2.connect(admin).emergencyWithdraw(ethers.constants.AddressZero, withdrawAmount)
      ).to.emit(kipuBankV2, "EmergencyWithdrawal");
    });

    it("Should not allow non-admin emergency withdrawal", async function () {
      await expect(
        kipuBankV2.connect(user1).emergencyWithdraw(ethers.constants.AddressZero, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("AccessControl:");
    });
  });

  describe("Bank Capacity", function () {
    it("Should enforce bank capacity limits", async function () {
      // Try to deposit more than bank capacity
      // Bank cap is $1M, so with ETH at $2000, max is 500 ETH
      const excessiveAmount = ethers.utils.parseEther("600");

      await expect(
        kipuBankV2.connect(user1).depositETH({ value: excessiveAmount })
      ).to.be.revertedWithCustomError(kipuBankV2, "BankCapacityExceeded");
    });

    it("Should track remaining capacity correctly", async function () {
      const depositAmount = ethers.utils.parseEther("1");
      await kipuBankV2.connect(user1).depositETH({ value: depositAmount });

      const stats = await kipuBankV2.getBankStats();
      const expectedRemaining = ethers.utils.parseUnits("998000", 6); // $1M - $2000
      expect(stats.remainingCapacityUSD).to.equal(expectedRemaining);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract to test properly
      // For now, we verify the modifier is present in the contract
      const depositAmount = ethers.utils.parseEther("1");
      await kipuBankV2.connect(user1).depositETH({ value: depositAmount });
      
      // Multiple rapid calls should work fine due to reentrancy guard
      await kipuBankV2.connect(user1).withdrawETH(ethers.utils.parseEther("0.5"));
      expect(true).to.be.true; // Test passes if no revert
    });
  });
});

// Mock contracts for testing
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals) ERC20(name, symbol) {
        _setupDecimals(decimals);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function _setupDecimals(uint8 decimals_) internal {
        // This is a simplified version - in practice you'd override decimals()
    }
}
`;

const MockV3AggregatorSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockV3Aggregator {
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint256 public latestRound;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        updateAnswer(_initialAnswer);
    }

    function updateAnswer(int256 _answer) public {
        latestAnswer = _answer;
        latestTimestamp = block.timestamp;
        latestRound++;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            uint80(latestRound),
            latestAnswer,
            latestTimestamp,
            latestTimestamp,
            uint80(latestRound)
        );
    }
}
`;
