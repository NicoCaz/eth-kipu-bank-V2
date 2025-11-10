# KipuBankV3 🏦

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.17.1-yellow)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-4.9.3-blue)](https://www.openzeppelin.com/)
[![Uniswap](https://img.shields.io/badge/Uniswap-V2-ff007a)](https://uniswap.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**KipuBankV3** es un vault DeFi de producción que integra Uniswap V2 para realizar conversiones automáticas de tokens a USDC. Permite a los usuarios depositar ETH, USDC o cualquier token ERC20 con un par en Uniswap V2, convirtiendo automáticamente todos los depósitos a USDC.

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Arquitectura y Diseño](#-arquitectura-y-diseño)
- [Mejoras de V2 a V3](#-mejoras-de-v2-a-v3)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Despliegue](#-despliegue)
- [Testing](#-testing)
- [Seguridad](#-seguridad)
- [Decisiones de Diseño](#-decisiones-de-diseño)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

## 🚀 Características Principales

### Funcionalidad Core

- **✅ Depósitos Multi-Token**
  - ETH nativo (se convierte automáticamente a USDC vía Uniswap)
  - USDC directo (sin conversión)
  - Cualquier token ERC20 con par USDC en Uniswap V2
  
- **✅ Conversión Automática**
  - Integración con Uniswap V2 Router
  - Swaps automáticos a USDC
  - Protección contra slippage (2% por defecto)
  
- **✅ Sistema de Límites**
  - Bank Cap de $1M USDC
  - Validación antes de cada depósito
  - Capacidad restante visible en tiempo real

- **✅ Retiros Seguros**
  - Retiro de saldo en USDC
  - Función `withdrawAll()` para retirar balance completo
  - Protección contra reentrancy

### Características de Seguridad

- **🔒 ReentrancyGuard**: Protección contra ataques de reentrancia
- **⏸️ Pausable**: Sistema de pausa de emergencia controlado por owner
- **👤 Ownable**: Control de acceso para funciones administrativas
- **💰 SafeERC20**: Manejo seguro de transferencias ERC20
- **⏱️ Deadline Protection**: Límite de tiempo para swaps (5 minutos)
- **📊 Slippage Protection**: Mínimo 98% del monto esperado

## 🏗️ Arquitectura y Diseño

### Flujo de Depósito

```
┌─────────────────┐
│   Usuario       │
│  (ETH/Token)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  KipuBankV3         │
│  - Valida amount    │
│  - Verifica cap     │
│  - Chequea par      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Uniswap V2 Router  │
│  - Swap a USDC      │
│  - Slippage check   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Balance Usuario    │
│  - USDC acreditado  │
│  - Stats updated    │
└─────────────────────┘
```

### Componentes Principales

#### 1. **Contratos Base**
```solidity
contract KipuBankV3 is Ownable, ReentrancyGuard, Pausable
```
- `Ownable`: Control de acceso del propietario
- `ReentrancyGuard`: Protección contra reentrancia
- `Pausable`: Sistema de pausa de emergencia

#### 2. **Interfaces Externas**
- `IUniswapV2Router02`: Interfaz para realizar swaps
- `IUniswapV2Factory`: Interfaz para verificar pares

#### 3. **Estructuras de Datos**

```solidity
struct UserBalance {
    uint256 usdcAmount;          // Balance actual en USDC
    uint256 totalDeposited;      // Total depositado (post-swap)
    uint256 totalWithdrawn;      // Total retirado
    uint256 lastDepositTime;     // Timestamp del último depósito
    uint256 depositCount;        // Número de depósitos
}
```

## 🔄 Mejoras de V2 a V3

### Cambios Arquitectónicos

| Aspecto | V2 | V3 |
|---------|----|----|
| **Contabilidad** | USD valor tracking (virtual) | USDC real |
| **Tokens Soportados** | Lista predefinida + Chainlink | Cualquier token con par USDC |
| **Conversión** | Solo tracking de valor | Swap real vía Uniswap |
| **Price Feeds** | Chainlink (requerido) | Uniswap pools (automático) |
| **Retiros** | Token nativo | USDC únicamente |
| **Complejidad** | Alta (múltiples tokens) | Simplificada (solo USDC) |

### Beneficios de V3

1. **✅ Simplificación**
   - Un solo token de salida (USDC)
   - No requiere Chainlink price feeds
   - Menos superficie de ataque

2. **✅ DeFi Integration**
   - Uso real de Uniswap V2
   - Liquidez descentralizada
   - Precios de mercado en tiempo real

3. **✅ Flexibilidad**
   - Cualquier token con par USDC
   - No necesita configuración manual
   - Expansión automática

4. **✅ Gas Efficiency**
   - Menos storage reads
   - Un solo token tracking
   - Swaps directos (no múltiples conversiones)

## 📦 Instalación

### Prerequisitos

- Node.js >= 16.0.0
- npm o yarn
- Git

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/YOUR-USERNAME/eth-kipu-bank-V2.git
cd eth-kipu-bank-V2

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp env.example .env

# Editar .env con tus credenciales
# INFURA_PROJECT_ID=tu-infura-id
# PRIVATE_KEY=tu-private-key
# ETHERSCAN_API_KEY=tu-etherscan-api-key
```

### Dependencias Principales

```json
{
  "@openzeppelin/contracts": "^4.9.3",
  "@chainlink/contracts": "^0.6.1",
  "hardhat": "^2.17.1",
  "ethers": "^5.7.2"
}
```

## 🎯 Uso

### Compilación

```bash
npm run compile
```

### Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests con gas reporter
npm run gas-report
```

### Despliegue Local

```bash
# Iniciar nodo local
npm run node

# En otra terminal, desplegar
npm run deploy:localhost
```

## 🌐 Despliegue

### Configuración de Red

El contrato soporta las siguientes redes:

#### Mainnet Ethereum
```bash
npm run deploy:mainnet
```
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Uniswap V2 Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

#### Sepolia Testnet
```bash
npx hardhat run scripts/deploy-v3.js --network sepolia
```
- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Uniswap V2 Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

### Pasos de Despliegue

1. **Configurar variables de entorno**
```bash
INFURA_PROJECT_ID=tu-infura-id
PRIVATE_KEY=tu-private-key
ETHERSCAN_API_KEY=tu-etherscan-api-key
```

2. **Ejecutar script de despliegue**
```bash
npx hardhat run scripts/deploy-v3.js --network sepolia
```

3. **Verificar en Etherscan**
```bash
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "USDC_ADDRESS" "ROUTER_ADDRESS"
```

### Verificación Automática

El script de despliegue incluye verificación automática si configuras `ETHERSCAN_API_KEY`:

```javascript
await hre.run("verify:verify", {
  address: kipuBankV3.address,
  constructorArguments: [usdcAddress, routerAddress],
});
```

## 🧪 Testing

### Test Suite

El proyecto incluye tests completos:

```bash
KipuBankV3 Contract
  ✓ Deployment
    ✓ Should deploy with correct initial state
    ✓ Should set owner correctly
    ✓ Should initialize with zero deposits
  
  ✓ USDC Direct Deposits
    ✓ Should allow direct USDC deposits
    ✓ Should update bank statistics
    ✓ Should handle multiple deposits
    ✓ Should revert on zero deposit
    ✓ Should revert when exceeding capacity
  
  ✓ Withdrawals
    ✓ Should allow USDC withdrawals
    ✓ Should allow withdrawing all balance
    ✓ Should revert on insufficient balance
  
  ✓ Access Control
    ✓ Should allow owner to pause/unpause
    ✓ Should not allow non-owner operations
    ✓ Should allow emergency withdrawal
```

### Tests con Fork de Mainnet

Para probar con datos reales de Uniswap:

```javascript
// hardhat.config.js
networks: {
  hardhat: {
    forking: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      enabled: true
    }
  }
}
```

```bash
npm test
```

### Coverage

```bash
npm run test:coverage
```

Objetivo: >90% coverage en todas las funciones críticas.

## 🔒 Seguridad

### Medidas Implementadas

1. **ReentrancyGuard**
```solidity
function depositETH() external payable nonReentrant whenNotPaused {
    // Protegido contra reentrancia
}
```

2. **SafeERC20**
```solidity
usdc.safeTransfer(msg.sender, amount);
usdc.safeTransferFrom(msg.sender, address(this), amount);
```

3. **Checks-Effects-Interactions Pattern**
```solidity
// 1. Checks
if (amount == 0) revert ZeroAmount();
if (amount > balance) revert InsufficientBalance();

// 2. Effects
balance -= amount;
totalBankBalance -= amount;

// 3. Interactions
usdc.safeTransfer(msg.sender, amount);
```

4. **Slippage Protection**
```solidity
uint256 minUsdc = (expectedUsdc * MIN_SLIPPAGE_PERCENT) / 100; // 98%
```

5. **Deadline Protection**
```solidity
block.timestamp + DEADLINE_BUFFER // 5 minutos
```

### Auditoría

- [ ] Auditoría de código interno
- [ ] Auditoría externa (recomendado para producción)
- [ ] Bug bounty program

### Best Practices

- ✅ Uso de OpenZeppelin contracts auditados
- ✅ Inmutables para direcciones críticas
- ✅ Events para todas las operaciones importantes
- ✅ Custom errors para gas efficiency
- ✅ NatSpec documentation completa

## 🤔 Decisiones de Diseño

### 1. ¿Por qué USDC como token único?

**Decisión**: Todos los depósitos se convierten a USDC.

**Razones**:
- **Simplicidad**: Un solo token para contabilidad
- **Estabilidad**: USDC es una stablecoin, reduce volatilidad
- **Liquidez**: USDC tiene pares con mayoría de tokens
- **UX**: Usuario sabe exactamente cuánto tiene en USD

**Trade-offs**:
- ❌ Usuario no puede retener tokens originales
- ✅ Más simple y seguro
- ✅ Menor costo de gas en storage

### 2. ¿Por qué Uniswap V2 y no V3?

**Decisión**: Usar Uniswap V2 Router.

**Razones**:
- **Disponibilidad**: V2 está en todas las redes principales
- **Simplicidad**: API más simple para swaps básicos
- **Compatibilidad**: Más forks y pares disponibles
- **Requisito**: El proyecto especifica V2

**Trade-offs**:
- ❌ Peores precios que V3 (concentrated liquidity)
- ✅ Más predecible y estable
- ✅ Menor complejidad de integración

### 3. ¿Por qué 2% de slippage?

**Decisión**: MIN_SLIPPAGE_PERCENT = 98%

**Razones**:
- **Balance**: Protección vs flexibilidad
- **Market Reality**: Suficiente para pares líquidos
- **UX**: Evita fallos frecuentes en swaps

**Trade-offs**:
- Puede fallar en mercados muy volátiles
- Protege contra MEV y front-running
- Configurable por owner si es necesario

### 4. ¿Por qué Ownable en lugar de AccessControl?

**Decisión**: Usar Ownable simple.

**Razones**:
- **Simplicidad**: Solo un administrador necesario
- **Gas**: Menos costoso que roles múltiples
- **Use Case**: Proyecto educativo/pequeño scale

**Trade-offs**:
- ❌ Menos flexible para equipos grandes
- ✅ Más simple y económico
- ✅ Suficiente para el scope

### 5. ¿Por qué inmutables para USDC y Router?

**Decisión**: Variables immutable.

```solidity
IERC20 public immutable usdc;
IUniswapV2Router02 public immutable uniswapRouter;
```

**Razones**:
- **Seguridad**: No se pueden cambiar después del deploy
- **Gas**: Más barato que storage variables
- **Confianza**: Usuarios saben que no cambiarán

**Trade-offs**:
- ❌ No se pueden actualizar (requiere nuevo deploy)
- ✅ Mayor seguridad
- ✅ Menor costo operacional

## 📁 Estructura del Proyecto

```
eth-kipu-bank-V2/
├── src/
│   ├── KipuBankV2.sol          # Versión anterior (Chainlink)
│   ├── KipuBankV3.sol          # Nueva versión (Uniswap)
│   └── mocks/
│       ├── MockERC20.sol       # Token ERC20 de prueba
│       └── MockV3Aggregator.sol
├── test/
│   ├── KipuBankV2.test.js
│   └── KipuBankV3.test.js      # Tests completos de V3
├── scripts/
│   ├── deploy-v3.js            # Script de despliegue V3
│   ├── interact-v3.js          # Script de interacción
│   ├── deploy.js               # Deploy V2
│   └── interact.js             # Interact V2
├── hardhat.config.js           # Configuración Hardhat
├── package.json
├── .env.example                # Template de variables
└── README.md                   # Este archivo
```

## 🔄 Interacción con el Contrato

### Depositar USDC

```javascript
const usdc = await ethers.getContractAt("IERC20", usdcAddress);
const amount = ethers.utils.parseUnits("100", 6); // 100 USDC

await usdc.approve(kipuBankV3.address, amount);
await kipuBankV3.depositUSDC(amount);
```

### Depositar ETH

```javascript
const ethAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH

// Ver cuánto USDC se recibirá
const expectedUsdc = await kipuBankV3.getExpectedUSDC(
  await kipuBankV3.NATIVE_TOKEN(),
  ethAmount
);
console.log("Expected USDC:", ethers.utils.formatUnits(expectedUsdc, 6));

// Depositar
await kipuBankV3.depositETH({ value: ethAmount });
```

### Depositar Token ERC20

```javascript
const tokenAddress = "0x...";
const token = await ethers.getContractAt("IERC20", tokenAddress);
const amount = ethers.utils.parseEther("100");

// Verificar que existe par con USDC
const pairInfo = await kipuBankV3.checkPairExists(tokenAddress);
if (!pairInfo.exists) {
  console.log("No USDC pair exists for this token");
  return;
}

// Ver cuánto USDC se recibirá
const expectedUsdc = await kipuBankV3.getExpectedUSDC(tokenAddress, amount);
console.log("Expected USDC:", ethers.utils.formatUnits(expectedUsdc, 6));

// Depositar
await token.approve(kipuBankV3.address, amount);
await kipuBankV3.depositToken(tokenAddress, amount);
```

### Retirar USDC

```javascript
// Retirar cantidad específica
const withdrawAmount = ethers.utils.parseUnits("50", 6); // 50 USDC
await kipuBankV3.withdraw(withdrawAmount);

// O retirar todo
await kipuBankV3.withdrawAll();
```

### Ver Balance

```javascript
// Balance simple
const balance = await kipuBankV3.getBalance(userAddress);
console.log("Balance:", ethers.utils.formatUnits(balance, 6), "USDC");

// Información completa
const userInfo = await kipuBankV3.getUserInfo(userAddress);
console.log("USDC Amount:", ethers.utils.formatUnits(userInfo.usdcAmount, 6));
console.log("Total Deposited:", ethers.utils.formatUnits(userInfo.totalDeposited, 6));
console.log("Total Withdrawn:", ethers.utils.formatUnits(userInfo.totalWithdrawn, 6));
console.log("Deposit Count:", userInfo.depositCount.toString());
```

### Ver Estadísticas del Banco

```javascript
const stats = await kipuBankV3.getBankStats();
console.log("Total Balance:", ethers.utils.formatUnits(stats.bankBalance, 6), "USDC");
console.log("Remaining Capacity:", ethers.utils.formatUnits(stats.remainingCapacity, 6), "USDC");
console.log("Total Deposits:", stats.depositsCount.toString());
console.log("Total Withdrawals:", stats.withdrawalsCount.toString());
console.log("Total Users:", stats.usersCount.toString());
```

## 📊 Comparación de Gas

| Operación | V2 | V3 | Ahorro |
|-----------|-------|-------|--------|
| Deploy | ~4.5M | ~3.2M | ~29% |
| Deposit ETH | ~180K | ~200K | -11% (incluye swap) |
| Deposit Token | ~150K | ~180K | -20% (incluye swap) |
| Withdraw | ~120K | ~90K | ~25% |

*Nota: Los números son aproximados y varían según condiciones de red*

## 🎓 Conceptos Aprendidos

Este proyecto demuestra el dominio de:

1. **Solidity Avanzado**
   - Custom errors para gas efficiency
   - Inmutables y optimización de storage
   - Interfaces externas (Uniswap)
   - Herencia múltiple (OpenZeppelin)

2. **DeFi Integration**
   - Uniswap V2 Router usage
   - Factory pattern para pares
   - Slippage y deadline protection
   - AMM mechanics

3. **Seguridad**
   - ReentrancyGuard implementation
   - Checks-Effects-Interactions
   - SafeERC20 usage
   - Access control patterns

4. **Testing**
   - Hardhat testing framework
   - Mock contracts
   - Coverage analysis
   - Gas reporting

5. **DevOps**
   - Deployment scripts
   - Network configuration
   - Etherscan verification
   - Environment variables

## 🚧 Roadmap

### V3.1 (Próximo)
- [ ] Agregar soporte para Uniswap V3
- [ ] Implementar routes multi-hop (Token → WETH → USDC)
- [ ] Agregar función de compound automático
- [ ] Integrar con protocolos de yield (Aave, Compound)

### V3.2
- [ ] Governance token (KIPU)
- [ ] Voting mechanism
- [ ] Fee sharing para holders

### V4.0
- [ ] Layer 2 deployment (Arbitrum, Optimism)
- [ ] Cross-chain bridges
- [ ] NFT vault keys

## 🤝 Contribución

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guidelines

- Escribir tests para nuevas funcionalidades
- Mantener coverage >90%
- Seguir el style guide de Solidity
- Documentar con NatSpec

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- **OpenZeppelin** por contratos seguros y auditados
- **Uniswap** por el protocolo DEX líder
- **Hardhat** por excelente tooling
- **Kipu Community** por el apoyo y feedback

## 📧 Contacto

- GitHub: [@YOUR-USERNAME](https://github.com/YOUR-USERNAME)
- Email: your.email@example.com

## 🔗 Links Útiles

- [Documentación Solidity](https://docs.soliditylang.org/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)
- [Uniswap V2 Docs](https://docs.uniswap.org/contracts/v2/overview)
- [Hardhat Docs](https://hardhat.org/docs)
- [Chainlink Docs](https://docs.chain.link/)

---

**⚠️ Disclaimer**: Este proyecto es para fines educativos. Realizar auditoría completa antes de usar en producción con fondos reales.

**Made with ❤️ by KipuBank Team**
