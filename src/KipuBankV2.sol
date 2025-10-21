// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title KipuBankV2
 * @dev Advanced multi-token vault with Chainlink price feeds and role-based access control
 * @author KipuBank Team
 * @notice Production-ready vault supporting ETH and ERC-20 tokens with USD-based limits
 */
contract KipuBankV2 is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Structure to store token information
    struct TokenInfo {
        bool isSupported;
        uint8 decimals;
        uint256 withdrawalLimit; // In token's native decimals
        AggregatorV3Interface priceFeed;
        bool useCustomPrice; // If true, use custom price instead of Chainlink
        uint256 customPrice; // Custom price in USD (8 decimals)
    }

    /// @dev Structure for user balance information
    struct UserBalance {
        uint256 amount;
        uint256 lastDepositTime;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Role for bank administrators
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @dev Maximum bank capacity in USD (with 6 decimals like USDC)
    uint256 public constant BANK_CAP_USD = 1_000_000 * 1e6; // $1M USD

    /// @dev Native ETH address representation
    address public constant NATIVE_TOKEN = address(0);

    /// @dev USDC decimals for internal accounting
    uint8 public constant ACCOUNTING_DECIMALS = 6;

    /// @dev Maximum allowed tokens
    uint256 public constant MAX_SUPPORTED_TOKENS = 50;

    /// @dev Price feed staleness threshold (24 hours)
    uint256 public constant PRICE_STALENESS_THRESHOLD = 24 hours;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when deposit amount is zero
    error ZeroAmount();

    /// @dev Thrown when token is not supported
    error TokenNotSupported();

    /// @dev Thrown when withdrawal exceeds limit
    error WithdrawalExceedsLimit();

    /// @dev Thrown when user has insufficient balance
    error InsufficientBalance();

    /// @dev Thrown when bank capacity would be exceeded
    error BankCapacityExceeded();

    /// @dev Thrown when transfer fails
    error TransferFailed();

    /// @dev Thrown when price feed is stale or invalid
    error InvalidPriceFeed();

    /// @dev Thrown when trying to add too many tokens
    error TooManyTokens();

    /// @dev Thrown when token is already supported
    error TokenAlreadySupported();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a user deposits tokens
     * @param user User address
     * @param token Token address (address(0) for ETH)
     * @param amount Amount in token's native decimals
     * @param usdValue USD value of the deposit (6 decimals)
     */
    event Deposit(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 usdValue
    );

    /**
     * @dev Emitted when a user withdraws tokens
     * @param user User address
     * @param token Token address (address(0) for ETH)
     * @param amount Amount in token's native decimals
     * @param usdValue USD value of the withdrawal (6 decimals)
     */
    event Withdrawal(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 usdValue
    );

    /**
     * @dev Emitted when a new token is added
     * @param token Token address
     * @param decimals Token decimals
     * @param withdrawalLimit Withdrawal limit in token decimals
     * @param priceFeed Chainlink price feed address
     */
    event TokenAdded(
        address indexed token,
        uint8 decimals,
        uint256 withdrawalLimit,
        address priceFeed
    );

    /**
     * @dev Emitted when token configuration is updated
     * @param token Token address
     * @param withdrawalLimit New withdrawal limit
     */
    event TokenConfigUpdated(address indexed token, uint256 withdrawalLimit);

    /**
     * @dev Emitted when emergency withdrawal is executed
     * @param admin Admin address
     * @param token Token address
     * @param amount Amount withdrawn
     */
    event EmergencyWithdrawal(
        address indexed admin,
        address indexed token,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev Nested mapping: user => token => balance info
    mapping(address => mapping(address => UserBalance)) private _userBalances;

    /// @dev Mapping of supported tokens and their configuration
    mapping(address => TokenInfo) public supportedTokens;

    /// @dev Array of supported token addresses for enumeration
    address[] public tokenList;

    /// @dev Total USD value deposited in the bank (6 decimals)
    uint256 public totalBankValueUSD;

    /// @dev Total number of deposits across all tokens
    uint256 public totalDeposits;

    /// @dev Total number of withdrawals across all tokens
    uint256 public totalWithdrawals;

    /// @dev Mapping to track total deposits per token
    mapping(address => uint256) public tokenTotalDeposits;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor sets up roles and initial token support
     * @param _admin Address to be granted admin role
     * @param _ethPriceFeed Chainlink ETH/USD price feed address
     */
    constructor(address _admin, address _ethPriceFeed) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        // Add native ETH support
        supportedTokens[NATIVE_TOKEN] = TokenInfo({
            isSupported: true,
            decimals: 18,
            withdrawalLimit: 10 ether, // 10 ETH default limit
            priceFeed: AggregatorV3Interface(_ethPriceFeed),
            useCustomPrice: false,
            customPrice: 0
        });

        tokenList.push(NATIVE_TOKEN);

        emit TokenAdded(NATIVE_TOKEN, 18, 10 ether, _ethPriceFeed);
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Modifier to check if token is supported
     * @param token Token address to check
     */
    modifier onlySupportedToken(address token) {
        if (!supportedTokens[token].isSupported) revert TokenNotSupported();
        _;
    }

    /**
     * @dev Modifier to validate deposit amount and bank capacity
     * @param token Token address
     * @param amount Amount to deposit
     */
    modifier validDeposit(address token, uint256 amount) {
        if (amount == 0) revert ZeroAmount();

        uint256 usdValue = _convertToUSD(token, amount);
        if (totalBankValueUSD + usdValue > BANK_CAP_USD) {
            revert BankCapacityExceeded();
        }
        _;
    }

    /**
     * @dev Modifier to validate withdrawal
     * @param token Token address
     * @param amount Amount to withdraw
     */
    modifier validWithdrawal(address token, uint256 amount) {
        if (amount == 0) revert ZeroAmount();
        if (amount > supportedTokens[token].withdrawalLimit) {
            revert WithdrawalExceedsLimit();
        }
        if (amount > _userBalances[msg.sender][token].amount) {
            revert InsufficientBalance();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS - DEPOSITS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Deposit native ETH to the vault
     * @notice Deposit ETH to your personal vault
     */
    function depositETH()
        external
        payable
        nonReentrant
        whenNotPaused
        onlySupportedToken(NATIVE_TOKEN)
        validDeposit(NATIVE_TOKEN, msg.value)
    {
        _processDeposit(NATIVE_TOKEN, msg.value);
    }

    /**
     * @dev Deposit ERC-20 tokens to the vault
     * @param token ERC-20 token address
     * @param amount Amount to deposit in token's native decimals
     * @notice Deposit ERC-20 tokens to your personal vault
     */
    function depositToken(
        address token,
        uint256 amount
    )
        external
        nonReentrant
        whenNotPaused
        onlySupportedToken(token)
        validDeposit(token, amount)
    {
        if (token == NATIVE_TOKEN) revert TokenNotSupported();

        // Transfer tokens from user to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        _processDeposit(token, amount);
    }

    /*//////////////////////////////////////////////////////////////
                       EXTERNAL FUNCTIONS - WITHDRAWALS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Withdraw native ETH from the vault
     * @param amount Amount to withdraw in wei
     * @notice Withdraw ETH from your vault (subject to limits)
     */
    function withdrawETH(
        uint256 amount
    )
        external
        nonReentrant
        whenNotPaused
        onlySupportedToken(NATIVE_TOKEN)
        validWithdrawal(NATIVE_TOKEN, amount)
    {
        _processWithdrawal(NATIVE_TOKEN, amount);

        // Transfer ETH to user
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev Withdraw ERC-20 tokens from the vault
     * @param token ERC-20 token address
     * @param amount Amount to withdraw in token's native decimals
     * @notice Withdraw ERC-20 tokens from your vault (subject to limits)
     */
    function withdrawToken(
        address token,
        uint256 amount
    )
        external
        nonReentrant
        whenNotPaused
        onlySupportedToken(token)
        validWithdrawal(token, amount)
    {
        if (token == NATIVE_TOKEN) revert TokenNotSupported();

        _processWithdrawal(token, amount);

        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS - ADMIN
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Add support for a new ERC-20 token
     * @param token Token address
     * @param decimals Token decimals
     * @param withdrawalLimit Withdrawal limit in token's native decimals
     * @param priceFeed Chainlink price feed address for token/USD
     */
    function addToken(
        address token,
        uint8 decimals,
        uint256 withdrawalLimit,
        address priceFeed
    ) external onlyRole(ADMIN_ROLE) {
        if (token == NATIVE_TOKEN) revert TokenNotSupported();
        if (supportedTokens[token].isSupported) revert TokenAlreadySupported();
        if (tokenList.length >= MAX_SUPPORTED_TOKENS) revert TooManyTokens();

        supportedTokens[token] = TokenInfo({
            isSupported: true,
            decimals: decimals,
            withdrawalLimit: withdrawalLimit,
            priceFeed: AggregatorV3Interface(priceFeed),
            useCustomPrice: false,
            customPrice: 0
        });

        tokenList.push(token);

        emit TokenAdded(token, decimals, withdrawalLimit, priceFeed);
    }

    /**
     * @dev Add support for a new ERC-20 token with custom price
     * @param token Token address
     * @param decimals Token decimals
     * @param withdrawalLimit Withdrawal limit in token's native decimals
     * @param customPrice Custom price in USD (8 decimals)
     */
    function addTokenWithCustomPrice(
        address token,
        uint8 decimals,
        uint256 withdrawalLimit,
        uint256 customPrice
    ) external onlyRole(ADMIN_ROLE) {
        if (token == NATIVE_TOKEN) revert TokenNotSupported();
        if (supportedTokens[token].isSupported) revert TokenAlreadySupported();
        if (tokenList.length >= MAX_SUPPORTED_TOKENS) revert TooManyTokens();

        supportedTokens[token] = TokenInfo({
            isSupported: true,
            decimals: decimals,
            withdrawalLimit: withdrawalLimit,
            priceFeed: AggregatorV3Interface(address(0)), // No Chainlink feed
            useCustomPrice: true,
            customPrice: customPrice
        });

        tokenList.push(token);

        emit TokenAdded(token, decimals, withdrawalLimit, address(0));
    }

    /**
     * @dev Update withdrawal limit for a token
     * @param token Token address
     * @param newLimit New withdrawal limit in token's native decimals
     */
    function updateWithdrawalLimit(
        address token,
        uint256 newLimit
    ) external onlyRole(ADMIN_ROLE) onlySupportedToken(token) {
        supportedTokens[token].withdrawalLimit = newLimit;
        emit TokenConfigUpdated(token, newLimit);
    }

    /**
     * @dev Update custom price for a token
     * @param token Token address
     * @param newPrice New price in USD (8 decimals)
     */
    function updateCustomPrice(
        address token,
        uint256 newPrice
    ) external onlyRole(ADMIN_ROLE) onlySupportedToken(token) {
        if (!supportedTokens[token].useCustomPrice) revert TokenNotSupported();
        supportedTokens[token].customPrice = newPrice;
        emit TokenConfigUpdated(token, newPrice);
    }

    /**
     * @dev Emergency withdrawal function for admin
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
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
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS - VIEW
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get user's balance for a specific token
     * @param user User address
     * @param token Token address
     * @return balance User's balance in token's native decimals
     * @return usdValue USD value of the balance (6 decimals)
     */
    function getUserBalance(
        address user,
        address token
    )
        external
        view
        onlySupportedToken(token)
        returns (uint256 balance, uint256 usdValue)
    {
        balance = _userBalances[user][token].amount;
        usdValue = _convertToUSD(token, balance);
    }

    /**
     * @dev Get user's complete balance information for a token
     * @param user User address
     * @param token Token address
     * @return User's balance information
     */
    function getUserBalanceInfo(
        address user,
        address token
    ) external view onlySupportedToken(token) returns (UserBalance memory) {
        return _userBalances[user][token];
    }

    /**
     * @dev Get user's total portfolio value in USD
     * @param user User address
     * @return totalUSD Total portfolio value in USD (6 decimals)
     */
    function getUserTotalValueUSD(
        address user
    ) external view returns (uint256 totalUSD) {
        for (uint256 i = 0; i < tokenList.length; i++) {
            address token = tokenList[i];
            uint256 balance = _userBalances[user][token].amount;
            if (balance > 0) {
                totalUSD += _convertToUSD(token, balance);
            }
        }
    }

    /**
     * @dev Get comprehensive bank statistics
     * @return bankValueUSD Total bank value in USD (6 decimals)
     * @return remainingCapacityUSD Remaining capacity in USD (6 decimals)
     * @return totalDepositsCount Total number of deposits
     * @return totalWithdrawalsCount Total number of withdrawals
     * @return supportedTokensCount Number of supported tokens
     */
    function getBankStats()
        external
        view
        returns (
            uint256 bankValueUSD,
            uint256 remainingCapacityUSD,
            uint256 totalDepositsCount,
            uint256 totalWithdrawalsCount,
            uint256 supportedTokensCount
        )
    {
        return (
            totalBankValueUSD,
            BANK_CAP_USD - totalBankValueUSD,
            totalDeposits,
            totalWithdrawals,
            tokenList.length
        );
    }

    /**
     * @dev Get list of all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @dev Get current price of a token in USD
     * @param token Token address
     * @return price Price in USD (8 decimals from Chainlink)
     */
    function getTokenPriceUSD(
        address token
    ) external view onlySupportedToken(token) returns (uint256 price) {
        TokenInfo memory tokenInfo = supportedTokens[token];
        if (tokenInfo.useCustomPrice) {
            return tokenInfo.customPrice;
        } else {
            return _getLatestPrice(tokenInfo.priceFeed);
        }
    }

    /*//////////////////////////////////////////////////////////////
                            PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Process deposit logic (common for ETH and ERC-20)
     * @param token Token address
     * @param amount Amount to deposit
     */
    function _processDeposit(address token, uint256 amount) private {
        uint256 usdValue = _convertToUSD(token, amount);

        // Update user balance
        UserBalance storage userBalance = _userBalances[msg.sender][token];
        userBalance.amount += amount;
        userBalance.lastDepositTime = block.timestamp;
        userBalance.totalDeposited += amount;

        // Update global state
        totalBankValueUSD += usdValue;
        totalDeposits++;
        tokenTotalDeposits[token] += amount;

        emit Deposit(msg.sender, token, amount, usdValue);
    }

    /**
     * @dev Process withdrawal logic (common for ETH and ERC-20)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function _processWithdrawal(address token, uint256 amount) private {
        uint256 usdValue = _convertToUSD(token, amount);

        // Update user balance
        UserBalance storage userBalance = _userBalances[msg.sender][token];
        userBalance.amount -= amount;
        userBalance.totalWithdrawn += amount;

        // Update global state
        totalBankValueUSD -= usdValue;
        totalWithdrawals++;

        emit Withdrawal(msg.sender, token, amount, usdValue);
    }

    /**
     * @dev Convert token amount to USD value
     * @param token Token address
     * @param amount Amount in token's native decimals
     * @return usdValue USD value with 6 decimals
     */
    function _convertToUSD(
        address token,
        uint256 amount
    ) private view returns (uint256 usdValue) {
        if (amount == 0) return 0;

        TokenInfo memory tokenInfo = supportedTokens[token];
        uint256 price;

        if (tokenInfo.useCustomPrice) {
            price = tokenInfo.customPrice; // 8 decimals
        } else {
            price = _getLatestPrice(tokenInfo.priceFeed); // 8 decimals
        }

        // Convert to USD with proper decimal handling
        // Formula: (amount * price) / (10^tokenDecimals) * (10^6) / (10^8)
        // Simplified: (amount * price * 10^6) / (10^(tokenDecimals + 8))
        usdValue = (amount * price * 1e6) / (10 ** (tokenInfo.decimals + 8));
    }

    /**
     * @dev Get latest price from Chainlink price feed
     * @param priceFeed Chainlink price feed interface
     * @return price Latest price (8 decimals)
     */
    function _getLatestPrice(
        AggregatorV3Interface priceFeed
    ) private view returns (uint256 price) {
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();

        if (answer <= 0) revert InvalidPriceFeed();
        if (block.timestamp - updatedAt > PRICE_STALENESS_THRESHOLD) {
            revert InvalidPriceFeed();
        }

        price = uint256(answer);
    }

    /*//////////////////////////////////////////////////////////////
                            RECEIVE FUNCTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Receive function to handle direct ETH transfers
     */
    receive() external payable {
        // Redirect to depositETH function
        if (msg.value > 0) {
            // This will trigger the same validations as depositETH
            if (!supportedTokens[NATIVE_TOKEN].isSupported)
                revert TokenNotSupported();
            if (paused()) revert("Pausable: paused");

            uint256 usdValue = _convertToUSD(NATIVE_TOKEN, msg.value);
            if (totalBankValueUSD + usdValue > BANK_CAP_USD) {
                revert BankCapacityExceeded();
            }

            _processDeposit(NATIVE_TOKEN, msg.value);
        }
    }
}
