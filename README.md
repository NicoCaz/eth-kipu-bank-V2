# KipuBankV2 🏦

Vault multi-token con precios en tiempo real de Chainlink y control de acceso por roles.

## 🚀 Qué hace

Un contrato inteligente que permite:
- Depositar y retirar ETH y tokens ERC-20
- Ver el valor de tu portfolio en USD en tiempo real
- Control de acceso Admin/Emergency
- Límite total del banco: $1,000,000 USD

## ✨ Mejoras vs Versión Anterior

| Feature | Por qué |
|---------|---------|
| **Multi-token** | Antes solo ETH, ahora cualquier ERC-20 |
| **Precios Chainlink** | Valoración en USD en tiempo real |
| **Roles (Admin/Emergency)** | Seguridad y permisos granulares |
| **Contabilidad USD** | Todo normalizado a 6 decimales |
| **Seguridad++ (ReentrancyGuard, Pausable, SafeERC20)** | Protección contra hacks comunes |

## 📦 Instalación

```bash
npm install
```

Crea `.env`:
```bash
INFURA_PROJECT_ID=tu-project-id
PRIVATE_KEY=tu-private-key
ETHERSCAN_API_KEY=tu-api-key
```

## 🔨 Deploy

```bash
# Compilar
npm run compile

# Testing
npm run test

# Deploy a Sepolia
npm run deploy:sepolia

# Verificar en Etherscan
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "ADMIN_ADDRESS" "0x694AA1769357215DE4FAC081bf1f309aDC325306"
```

**Chainlink Price Feeds:**
- Sepolia ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- Mainnet ETH/USD: `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`

## 💻 Uso

### Depositar ETH
```javascript
await contract.depositETH({ value: ethers.utils.parseEther("1.0") });
```

### Retirar ETH
```javascript
await contract.withdrawETH(ethers.utils.parseEther("0.5"));
```

### Depositar Token
```javascript
await token.approve(contractAddress, amount);
await contract.depositToken(tokenAddress, amount);
```

### Ver Portfolio en USD
```javascript
const totalUSD = await contract.getUserTotalValueUSD(userAddress);
console.log(`Portfolio: $${ethers.utils.formatUnits(totalUSD, 6)}`);
```

### Admin: Agregar Token
```javascript
await contract.connect(admin).addToken(
  tokenAddress,
  decimals,
  withdrawalLimit,
  priceFeedAddress
);
```

### Emergencia: Pausar
```javascript
await contract.connect(admin).pause();
```

## 🎯 Decisiones de Diseño

| Decisión | Ventaja | Trade-off |
|----------|---------|-----------|
| **USD con 6 decimales** | Fácil gestión multi-token | Depende de oráculos |
| **Roles OpenZeppelin** | Seguridad enterprise | +Gas en deploy |
| **Chainlink** | Precios confiables | Dependencia externa |
| **Mappings anidados** | Portfolios complejos | +Gas en queries |
| **Pausable** | Pausa de emergencia | Riesgo centralización |

**Filosofía**: Seguridad > Gas, Flexibilidad > Simplicidad

## ⚠️ Disclaimer

Proyecto educativo. Audita antes de producción.

---

MIT License
