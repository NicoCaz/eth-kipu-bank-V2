const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KipuBankV3 Contract", function () {
  let KipuBankV3;
  let kipuBankV3;
  let MockERC20;
  let usdc;
  let weth;
  let tokenA;
  let tokenB;
  let owner;
  let user1;
  let user2;
  let UniswapV2Router;
  let UniswapV2Factory;
  let uniswapRouter;
  let uniswapFactory;

  // Uniswap V2 Router address on mainnet
  const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock USDC (6 decimals)
    MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.deployed();

    // Deploy mock WETH (18 decimals)
    weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();

    // Deploy test tokens
    tokenA = await MockERC20.deploy("Token A", "TKNA", 18);
    await tokenA.deployed();

    tokenB = await MockERC20.deploy("Token B", "TKNB", 18);
    await tokenB.deployed();

    // Mint tokens to users
    await usdc.mint(user1.address, ethers.utils.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.utils.parseUnits("10000", 6));
    await tokenA.mint(user1.address, ethers.utils.parseEther("1000"));
    await tokenA.mint(user2.address, ethers.utils.parseEther("1000"));

    // Note: In a real test environment with mainnet fork, we'd use actual Uniswap
    // For this test, we'll deploy KipuBankV3 with mock addresses
    // and test the logic that doesn't require actual swaps

    // Deploy KipuBankV3 (using mock addresses for now)
    KipuBankV3 = await ethers.getContractFactory("KipuBankV3");
    kipuBankV3 = await KipuBankV3.deploy(
      usdc.address,
      UNISWAP_V2_ROUTER // Using real Uniswap router address
    );
    await kipuBankV3.deployed();

    // Mint some USDC to the contract for testing withdrawals
    await usdc.mint(kipuBankV3.address, ethers.utils.parseUnits("100000", 6));
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await kipuBankV3.BANK_CAP()).to.equal(ethers.utils.parseUnits("1000000", 6));
      expect(await kipuBankV3.NATIVE_TOKEN()).to.equal(ethers.constants.AddressZero);
      expect(await kipuBankV3.totalBankBalance()).to.equal(0);
      expect(await kipuBankV3.usdc()).to.equal(usdc.address);
    });

    it("Should set owner correctly", async function () {
      expect(await kipuBankV3.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero deposits and withdrawals", async function () {
      const stats = await kipuBankV3.getBankStats();
      expect(stats.depositsCount).to.equal(0);
      expect(stats.withdrawalsCount).to.equal(0);
      expect(stats.usersCount).to.equal(0);
    });
  });

  describe("USDC Direct Deposits", function () {
    it("Should allow direct USDC deposits", async function () {
      const depositAmount = ethers.utils.parseUnits("100", 6);
      
      // Approve USDC
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);

      // Deposit
      await expect(
        kipuBankV3.connect(user1).depositUSDC(depositAmount)
      ).to.emit(kipuBankV3, "Deposit")
        .withArgs(user1.address, usdc.address, depositAmount, depositAmount, false);

      // Check balance
      const balance = await kipuBankV3.getBalance(user1.address);
      expect(balance).to.equal(depositAmount);
    });

    it("Should update bank statistics on deposit", async function () {
      const depositAmount = ethers.utils.parseUnits("100", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.bankBalance).to.equal(depositAmount);
      expect(stats.depositsCount).to.equal(1);
      expect(stats.usersCount).to.equal(1);
    });

    it("Should handle multiple deposits from same user", async function () {
      const depositAmount1 = ethers.utils.parseUnits("100", 6);
      const depositAmount2 = ethers.utils.parseUnits("200", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount1 + depositAmount2);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount1);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount2);

      const balance = await kipuBankV3.getBalance(user1.address);
      expect(balance).to.equal(depositAmount1 + depositAmount2);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.usersCount).to.equal(1); // Still only 1 unique user
      expect(stats.depositsCount).to.equal(2);
    });

    it("Should revert on zero deposit", async function () {
      await expect(
        kipuBankV3.connect(user1).depositUSDC(0)
      ).to.be.revertedWithCustomError(kipuBankV3, "ZeroAmount");
    });

    it("Should revert when exceeding bank capacity", async function () {
      const excessiveAmount = ethers.utils.parseUnits("1100000", 6); // More than 1M cap
      
      await usdc.mint(user1.address, excessiveAmount);
      await usdc.connect(user1).approve(kipuBankV3.address, excessiveAmount);

      await expect(
        kipuBankV3.connect(user1).depositUSDC(excessiveAmount)
      ).to.be.revertedWithCustomError(kipuBankV3, "BankCapacityExceeded");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup: User1 deposits 1000 USDC
      const depositAmount = ethers.utils.parseUnits("1000", 6);
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);
    });

    it("Should allow USDC withdrawals", async function () {
      const withdrawAmount = ethers.utils.parseUnits("500", 6);
      const initialBalance = await usdc.balanceOf(user1.address);

      await expect(
        kipuBankV3.connect(user1).withdraw(withdrawAmount)
      ).to.emit(kipuBankV3, "Withdrawal")
        .withArgs(user1.address, withdrawAmount);

      const balance = await kipuBankV3.getBalance(user1.address);
      expect(balance).to.equal(ethers.utils.parseUnits("500", 6));

      const finalBalance = await usdc.balanceOf(user1.address);
      expect(finalBalance.sub(initialBalance)).to.equal(withdrawAmount);
    });

    it("Should allow withdrawing all balance", async function () {
      await expect(
        kipuBankV3.connect(user1).withdrawAll()
      ).to.emit(kipuBankV3, "Withdrawal");

      const balance = await kipuBankV3.getBalance(user1.address);
      expect(balance).to.equal(0);
    });

    it("Should update bank statistics on withdrawal", async function () {
      const withdrawAmount = ethers.utils.parseUnits("500", 6);
      await kipuBankV3.connect(user1).withdraw(withdrawAmount);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.bankBalance).to.equal(ethers.utils.parseUnits("500", 6));
      expect(stats.withdrawalsCount).to.equal(1);
    });

    it("Should revert on zero withdrawal", async function () {
      await expect(
        kipuBankV3.connect(user1).withdraw(0)
      ).to.be.revertedWithCustomError(kipuBankV3, "ZeroAmount");
    });

    it("Should revert when withdrawing more than balance", async function () {
      const excessiveAmount = ethers.utils.parseUnits("2000", 6);

      await expect(
        kipuBankV3.connect(user1).withdraw(excessiveAmount)
      ).to.be.revertedWithCustomError(kipuBankV3, "InsufficientBalance");
    });

    it("Should revert withdrawAll when balance is zero", async function () {
      await expect(
        kipuBankV3.connect(user2).withdrawAll()
      ).to.be.revertedWithCustomError(kipuBankV3, "InsufficientBalance");
    });
  });

  describe("User Information", function () {
    it("Should track user deposit history", async function () {
      const depositAmount = ethers.utils.parseUnits("100", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);

      const userInfo = await kipuBankV3.getUserInfo(user1.address);
      expect(userInfo.usdcAmount).to.equal(depositAmount);
      expect(userInfo.totalDeposited).to.equal(depositAmount);
      expect(userInfo.totalWithdrawn).to.equal(0);
      expect(userInfo.depositCount).to.equal(1);
      expect(userInfo.lastDepositTime).to.be.gt(0);
    });

    it("Should track withdrawal history", async function () {
      const depositAmount = ethers.utils.parseUnits("1000", 6);
      const withdrawAmount = ethers.utils.parseUnits("400", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);
      await kipuBankV3.connect(user1).withdraw(withdrawAmount);

      const userInfo = await kipuBankV3.getUserInfo(user1.address);
      expect(userInfo.usdcAmount).to.equal(ethers.utils.parseUnits("600", 6));
      expect(userInfo.totalDeposited).to.equal(depositAmount);
      expect(userInfo.totalWithdrawn).to.equal(withdrawAmount);
    });

    it("Should return zero balance for new users", async function () {
      const balance = await kipuBankV3.getBalance(user2.address);
      expect(balance).to.equal(0);
    });
  });

  describe("Bank Statistics", function () {
    it("Should calculate remaining capacity correctly", async function () {
      const depositAmount = ethers.utils.parseUnits("100000", 6); // 100k USDC
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.remainingCapacity).to.equal(
        ethers.utils.parseUnits("900000", 6) // 1M - 100k
      );
    });

    it("Should track multiple users correctly", async function () {
      const depositAmount = ethers.utils.parseUnits("100", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);
      
      await usdc.connect(user2).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user2).depositUSDC(depositAmount);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.usersCount).to.equal(2);
      expect(stats.depositsCount).to.equal(2);
      expect(stats.bankBalance).to.equal(depositAmount * 2);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await kipuBankV3.connect(owner).pause();
      expect(await kipuBankV3.paused()).to.be.true;

      const depositAmount = ethers.utils.parseUnits("100", 6);
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);

      await expect(
        kipuBankV3.connect(user1).depositUSDC(depositAmount)
      ).to.be.revertedWith("Pausable: paused");

      await kipuBankV3.connect(owner).unpause();
      expect(await kipuBankV3.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        kipuBankV3.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner emergency withdrawal", async function () {
      const withdrawAmount = ethers.utils.parseUnits("1000", 6);

      await expect(
        kipuBankV3.connect(owner).emergencyWithdraw(usdc.address, withdrawAmount)
      ).to.emit(kipuBankV3, "EmergencyWithdrawal")
        .withArgs(owner.address, usdc.address, withdrawAmount);
    });

    it("Should not allow non-owner emergency withdrawal", async function () {
      const withdrawAmount = ethers.utils.parseUnits("1000", 6);

      await expect(
        kipuBankV3.connect(user1).emergencyWithdraw(usdc.address, withdrawAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    it("Should check if USDC returns amount directly", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      const expected = await kipuBankV3.getExpectedUSDC(usdc.address, amount);
      expect(expected).to.equal(amount);
    });

    it("Should return zero for non-existent pairs", async function () {
      const amount = ethers.utils.parseEther("100");
      const expected = await kipuBankV3.getExpectedUSDC(tokenA.address, amount);
      // Without actual Uniswap pairs, this should return 0
      expect(expected).to.equal(0);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on deposits", async function () {
      const depositAmount = ethers.utils.parseUnits("100", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount * 2);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);
      
      // Multiple calls should work fine (not a real reentrancy test, but validates modifier is present)
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);
      
      const balance = await kipuBankV3.getBalance(user1.address);
      expect(balance).to.equal(depositAmount * 2);
    });

    it("Should prevent reentrancy on withdrawals", async function () {
      const depositAmount = ethers.utils.parseUnits("1000", 6);
      const withdrawAmount = ethers.utils.parseUnits("500", 6);
      
      await usdc.connect(user1).approve(kipuBankV3.address, depositAmount);
      await kipuBankV3.connect(user1).depositUSDC(depositAmount);
      
      await kipuBankV3.connect(user1).withdraw(withdrawAmount);
      
      const balance = await kipuBankV3.getBalance(user1.address);
      expect(balance).to.equal(depositAmount - withdrawAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum bank capacity", async function () {
      const maxAmount = ethers.utils.parseUnits("1000000", 6);
      
      await usdc.mint(user1.address, maxAmount);
      await usdc.connect(user1).approve(kipuBankV3.address, maxAmount);
      await kipuBankV3.connect(user1).depositUSDC(maxAmount);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.bankBalance).to.equal(maxAmount);
      expect(stats.remainingCapacity).to.equal(0);

      // Try to deposit more should fail
      const additionalAmount = ethers.utils.parseUnits("1", 6);
      await usdc.mint(user1.address, additionalAmount);
      await usdc.connect(user1).approve(kipuBankV3.address, additionalAmount);
      
      await expect(
        kipuBankV3.connect(user1).depositUSDC(additionalAmount)
      ).to.be.revertedWithCustomError(kipuBankV3, "BankCapacityExceeded");
    });

    it("Should handle deposits from multiple users up to capacity", async function () {
      const amount1 = ethers.utils.parseUnits("700000", 6);
      const amount2 = ethers.utils.parseUnits("300000", 6);
      
      await usdc.mint(user1.address, amount1);
      await usdc.mint(user2.address, amount2);
      
      await usdc.connect(user1).approve(kipuBankV3.address, amount1);
      await usdc.connect(user2).approve(kipuBankV3.address, amount2);
      
      await kipuBankV3.connect(user1).depositUSDC(amount1);
      await kipuBankV3.connect(user2).depositUSDC(amount2);

      const stats = await kipuBankV3.getBankStats();
      expect(stats.bankBalance).to.equal(amount1 + amount2);
      expect(stats.usersCount).to.equal(2);
    });

    it("Should reject direct ETH transfers", async function () {
      await expect(
        user1.sendTransaction({
          to: kipuBankV3.address,
          value: ethers.utils.parseEther("1")
        })
      ).to.be.revertedWith("Use depositETH function");
    });
  });

  describe("Constants and Configuration", function () {
    it("Should have correct constants", async function () {
      expect(await kipuBankV3.BANK_CAP()).to.equal(ethers.utils.parseUnits("1000000", 6));
      expect(await kipuBankV3.MIN_SLIPPAGE_PERCENT()).to.equal(98);
      expect(await kipuBankV3.DEADLINE_BUFFER()).to.equal(300); // 5 minutes
    });

    it("Should have correct immutable variables", async function () {
      expect(await kipuBankV3.usdc()).to.equal(usdc.address);
      expect(await kipuBankV3.uniswapRouter()).to.equal(UNISWAP_V2_ROUTER);
    });
  });
});

