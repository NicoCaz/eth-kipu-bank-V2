// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title IUniswapV2Router02
 * @dev Interface for Uniswap V2 Router
 */
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

/**
 * @title IUniswapV2Factory
 * @dev Interface for Uniswap V2 Factory
 */
interface IUniswapV2Factory {
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);
}

/**
 * @title KipuBankV3
 * @dev Advanced vault with Uniswap V2 integration for automatic token swaps to USDC
 * @author KipuBank Team
 * @notice Production-ready vault supporting ETH and ERC-20 tokens with automatic USDC conversion
 *
 * Key Features:
 * - Accepts ETH, USDC, and any ERC20 token with a USDC pair on Uniswap V2
 * - Automatically swaps deposited tokens to USDC
 * - Maintains bank capacity limit in USDC
 * - Secure withdrawal system
 * - Pausable for emergency situations
 * - Owner-controlled access
 */
contract KipuBankV3 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Structure for user balance information
    struct UserBalance {
        uint256 usdcAmount; // Total USDC balance
        uint256 totalDeposited; // Total USDC deposited (after swaps)
        uint256 totalWithdrawn; // Total USDC withdrawn
        uint256 lastDepositTime; // Last deposit timestamp
        uint256 depositCount; // Number of deposits
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Maximum bank capacity in USDC (6 decimals)
    uint256 public constant BANK_CAP = 1_000_000 * 1e6; // $1M USDC

    /// @dev Native ETH address representation
    address public constant NATIVE_TOKEN = address(0);

    /// @dev Minimum tokens out for swap (slippage protection: 2%)
    uint256 public constant MIN_SLIPPAGE_PERCENT = 98;

    /// @dev Deadline buffer for swaps (5 minutes)
    uint256 public constant DEADLINE_BUFFER = 5 minutes;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when deposit amount is zero
    error ZeroAmount();

    /// @dev Thrown when bank capacity would be exceeded
    error BankCapacityExceeded();

    /// @dev Thrown when user has insufficient balance
    error InsufficientBalance();

    /// @dev Thrown when transfer fails
    error TransferFailed();

    /// @dev Thrown when no Uniswap pair exists for token
    error NoPairExists();

    /// @dev Thrown when swap fails
    error SwapFailed();

    /// @dev Thrown when withdrawal amount is invalid
    error InvalidWithdrawalAmount();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a user deposits tokens
     * @param user User address
     * @param tokenIn Token deposited (address(0) for ETH)
     * @param amountIn Amount of tokens deposited
     * @param usdcReceived Amount of USDC received after swap
     * @param swapped Whether a swap occurred
     */
    event Deposit(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 usdcReceived,
        bool swapped
    );

    /**
     * @dev Emitted when a user withdraws USDC
     * @param user User address
     * @param amount Amount of USDC withdrawn
     */
    event Withdrawal(address indexed user, uint256 amount);

    /**
     * @dev Emitted when owner withdraws funds
     * @param owner Owner address
     * @param token Token address (address(0) for ETH)
     * @param amount Amount withdrawn
     */
    event EmergencyWithdrawal(
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    /**
     * @dev Emitted when a token swap occurs
     * @param user User address
     * @param tokenIn Input token
     * @param tokenOut Output token (USDC)
     * @param amountIn Input amount
     * @param amountOut Output amount
     */
    event TokenSwapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev USDC token contract
    IERC20 public immutable usdc;

    /// @dev Uniswap V2 Router
    IUniswapV2Router02 public immutable uniswapRouter;

    /// @dev Uniswap V2 Factory
    IUniswapV2Factory public immutable uniswapFactory;

    /// @dev Mapping of user balances
    mapping(address => UserBalance) private _balances;

    /// @dev Total USDC held in the bank
    uint256 public totalBankBalance;

    /// @dev Total number of deposits
    uint256 public totalDeposits;

    /// @dev Total number of withdrawals
    uint256 public totalWithdrawals;

    /// @dev Total number of unique depositors
    uint256 public totalUsers;

    /// @dev Track if user has ever deposited
    mapping(address => bool) private _hasDeposited;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor sets up the bank with USDC and Uniswap integration
     * @param _usdc USDC token address
     * @param _uniswapRouter Uniswap V2 Router address
     */
    constructor(address _usdc, address _uniswapRouter) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_uniswapRouter != address(0), "Invalid router address");

        usdc = IERC20(_usdc);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        uniswapFactory = IUniswapV2Factory(uniswapRouter.factory());
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS - DEPOSITS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Deposit ETH and swap to USDC via Uniswap V2
     * @notice Deposits ETH, automatically swaps to USDC, and credits your balance
     */
    function depositETH() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();

        // Get expected USDC output
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();
        path[1] = address(usdc);

        // Check if pair exists
        address pair = uniswapFactory.getPair(path[0], path[1]);
        if (pair == address(0)) revert NoPairExists();

        // Get amounts out
        uint[] memory amountsOut = uniswapRouter.getAmountsOut(msg.value, path);
        uint256 expectedUsdc = amountsOut[1];
        uint256 minUsdc = (expectedUsdc * MIN_SLIPPAGE_PERCENT) / 100;

        // Check bank capacity
        if (totalBankBalance + expectedUsdc > BANK_CAP) {
            revert BankCapacityExceeded();
        }

        // Perform swap
        uint[] memory amounts = uniswapRouter.swapExactETHForTokens{
            value: msg.value
        }(minUsdc, path, address(this), block.timestamp + DEADLINE_BUFFER);

        uint256 usdcReceived = amounts[1];

        // Update balances
        _processDeposit(msg.sender, usdcReceived);

        emit Deposit(msg.sender, NATIVE_TOKEN, msg.value, usdcReceived, true);
        emit TokenSwapped(
            msg.sender,
            NATIVE_TOKEN,
            address(usdc),
            msg.value,
            usdcReceived
        );
    }

    /**
     * @dev Deposit USDC directly (no swap needed)
     * @param amount Amount of USDC to deposit
     * @notice Deposits USDC directly to your balance
     */
    function depositUSDC(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (totalBankBalance + amount > BANK_CAP) {
            revert BankCapacityExceeded();
        }

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update balances
        _processDeposit(msg.sender, amount);

        emit Deposit(msg.sender, address(usdc), amount, amount, false);
    }

    /**
     * @dev Deposit any ERC20 token and swap to USDC via Uniswap V2
     * @param token ERC20 token address to deposit
     * @param amount Amount of tokens to deposit
     * @notice Deposits any ERC20 token, swaps to USDC, and credits your balance
     */
    function depositToken(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (token == address(usdc)) revert("Use depositUSDC");
        if (token == NATIVE_TOKEN) revert("Use depositETH");

        // Check if pair exists
        address pair = uniswapFactory.getPair(token, address(usdc));
        if (pair == address(0)) revert NoPairExists();

        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Approve router to spend tokens
        IERC20(token).safeApprove(address(uniswapRouter), 0);
        IERC20(token).safeApprove(address(uniswapRouter), amount);

        // Get expected USDC output
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = address(usdc);

        uint[] memory amountsOut = uniswapRouter.getAmountsOut(amount, path);
        uint256 expectedUsdc = amountsOut[1];
        uint256 minUsdc = (expectedUsdc * MIN_SLIPPAGE_PERCENT) / 100;

        // Check bank capacity
        if (totalBankBalance + expectedUsdc > BANK_CAP) {
            revert BankCapacityExceeded();
        }

        // Perform swap
        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            amount,
            minUsdc,
            path,
            address(this),
            block.timestamp + DEADLINE_BUFFER
        );

        uint256 usdcReceived = amounts[1];

        // Update balances
        _processDeposit(msg.sender, usdcReceived);

        emit Deposit(msg.sender, token, amount, usdcReceived, true);
        emit TokenSwapped(
            msg.sender,
            token,
            address(usdc),
            amount,
            usdcReceived
        );
    }

    /*//////////////////////////////////////////////////////////////
                       EXTERNAL FUNCTIONS - WITHDRAWALS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw
     * @notice Withdraws USDC from your balance
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        UserBalance storage userBalance = _balances[msg.sender];
        if (amount > userBalance.usdcAmount) revert InsufficientBalance();

        // Update balances
        userBalance.usdcAmount -= amount;
        userBalance.totalWithdrawn += amount;
        totalBankBalance -= amount;
        totalWithdrawals++;

        // Transfer USDC to user
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @dev Withdraw all USDC from the vault
     * @notice Withdraws your entire USDC balance
     */
    function withdrawAll() external {
        uint256 balance = _balances[msg.sender].usdcAmount;
        if (balance == 0) revert InsufficientBalance();

        // Call the main withdraw function
        this.withdraw(balance);
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS - OWNER
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emergency withdrawal function for owner
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (token == NATIVE_TOKEN) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit EmergencyWithdrawal(msg.sender, token, amount);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS - VIEW
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get user's USDC balance
     * @param user User address
     * @return USDC balance
     */
    function getBalance(address user) external view returns (uint256) {
        return _balances[user].usdcAmount;
    }

    /**
     * @dev Get user's complete balance information
     * @param user User address
     * @return User's balance information
     */
    function getUserInfo(
        address user
    ) external view returns (UserBalance memory) {
        return _balances[user];
    }

    /**
     * @dev Get comprehensive bank statistics
     * @return bankBalance Total USDC in bank
     * @return remainingCapacity Remaining capacity in USDC
     * @return depositsCount Total number of deposits
     * @return withdrawalsCount Total number of withdrawals
     * @return usersCount Total number of users
     */
    function getBankStats()
        external
        view
        returns (
            uint256 bankBalance,
            uint256 remainingCapacity,
            uint256 depositsCount,
            uint256 withdrawalsCount,
            uint256 usersCount
        )
    {
        return (
            totalBankBalance,
            BANK_CAP - totalBankBalance,
            totalDeposits,
            totalWithdrawals,
            totalUsers
        );
    }

    /**
     * @dev Check if a token has a USDC pair on Uniswap V2
     * @param token Token address
     * @return exists Whether pair exists
     * @return pairAddress Pair address (address(0) if doesn't exist)
     */
    function checkPairExists(
        address token
    ) external view returns (bool exists, address pairAddress) {
        pairAddress = uniswapFactory.getPair(token, address(usdc));
        exists = pairAddress != address(0);
    }

    /**
     * @dev Get expected USDC output for a token deposit
     * @param token Token address (address(0) for ETH)
     * @param amount Amount of tokens
     * @return expectedUsdc Expected USDC output
     */
    function getExpectedUSDC(
        address token,
        uint256 amount
    ) external view returns (uint256 expectedUsdc) {
        if (token == address(usdc)) {
            return amount;
        }

        address[] memory path = new address[](2);

        if (token == NATIVE_TOKEN) {
            path[0] = uniswapRouter.WETH();
        } else {
            path[0] = token;
        }

        path[1] = address(usdc);

        // Check if pair exists
        address pair = uniswapFactory.getPair(path[0], path[1]);
        if (pair == address(0)) return 0;

        try uniswapRouter.getAmountsOut(amount, path) returns (
            uint[] memory amounts
        ) {
            expectedUsdc = amounts[1];
        } catch {
            expectedUsdc = 0;
        }
    }

    /*//////////////////////////////////////////////////////////////
                            PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Process deposit logic
     * @param user User address
     * @param usdcAmount Amount of USDC to credit
     */
    function _processDeposit(address user, uint256 usdcAmount) private {
        // Track new users
        if (!_hasDeposited[user]) {
            _hasDeposited[user] = true;
            totalUsers++;
        }

        // Update user balance
        UserBalance storage userBalance = _balances[user];
        userBalance.usdcAmount += usdcAmount;
        userBalance.totalDeposited += usdcAmount;
        userBalance.lastDepositTime = block.timestamp;
        userBalance.depositCount++;

        // Update global state
        totalBankBalance += usdcAmount;
        totalDeposits++;
    }

    /*//////////////////////////////////////////////////////////////
                            RECEIVE FUNCTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Receive function to handle direct ETH transfers
     * @notice Direct ETH transfers are redirected to depositETH
     */
    receive() external payable {
        revert("Use depositETH function");
    }

    /**
     * @dev Fallback function
     */
    fallback() external payable {
        revert("Use depositETH function");
    }
}
