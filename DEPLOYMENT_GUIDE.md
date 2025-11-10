# 🚀 KipuBankV3 - Guía de Despliegue

Esta guía proporciona instrucciones paso a paso para desplegar KipuBankV3 en diferentes redes.

## 📋 Tabla de Contenidos

- [Pre-requisitos](#pre-requisitos)
- [Configuración Inicial](#configuración-inicial)
- [Despliegue en Testnet (Sepolia)](#despliegue-en-testnet-sepolia)
- [Despliegue en Mainnet](#despliegue-en-mainnet)
- [Verificación en Etherscan](#verificación-en-etherscan)
- [Testing Post-Despliegue](#testing-post-despliegue)
- [Troubleshooting](#troubleshooting)

## Pre-requisitos

### Software Requerido

- Node.js >= 16.0.0
- npm >= 7.0.0
- Git

### Cuentas y API Keys

1. **Wallet con ETH**
   - Testnet: Obtener ETH de Sepolia desde [faucet](https://sepoliafaucet.com/)
   - Mainnet: Wallet con ETH suficiente para gas

2. **Infura Account**
   - Crear cuenta en [Infura](https://infura.io/)
   - Crear proyecto y obtener Project ID

3. **Etherscan API Key**
   - Crear cuenta en [Etherscan](https://etherscan.io/)
   - Ir a API Keys y generar una nueva

## Configuración Inicial

### 1. Clonar el Repositorio

```bash
git clone https://github.com/YOUR-USERNAME/eth-kipu-bank-V2.git
cd eth-kipu-bank-V2
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
cp env.example .env
```

Editar `.env` con tus credenciales:

```env
# Infura Project ID
INFURA_PROJECT_ID=your_infura_project_id_here

# Private Key (sin 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# CoinMarketCap API Key (opcional, para gas reporting)
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
```

⚠️ **IMPORTANTE**: Nunca commits tu archivo `.env` al repositorio!

### 4. Compilar Contratos

```bash
npm run compile
```

Deberías ver:
```
Compiled 22 Solidity files successfully
```

### 5. Ejecutar Tests (Opcional pero Recomendado)

```bash
npm run test:v3
```

## Despliegue en Testnet (Sepolia)

### Paso 1: Verificar Balance

```bash
npx hardhat run scripts/check-balance.js --network sepolia
```

O manualmente en etherscan: `https://sepolia.etherscan.io/address/YOUR_ADDRESS`

### Paso 2: Obtener Testnet ETH

Si necesitas más ETH de prueba:
- [Sepolia Faucet 1](https://sepoliafaucet.com/)
- [Sepolia Faucet 2](https://faucet.sepolia.dev/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

### Paso 3: Desplegar KipuBankV3

```bash
npm run deploy:v3:sepolia
```

El script mostrará:

```
🚀 Starting KipuBankV3 Deployment...

📋 Deployment Information:
   Network: sepolia
   Deployer: 0x...
   Balance: 0.5 ETH

📍 Using network configuration:
   USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   Uniswap Router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

🏗️  Deploying KipuBankV3...
✅ KipuBankV3 deployed successfully!

📝 Contract Address: 0xYourContractAddress
   Owner: 0xYourAddress
   USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   Uniswap Router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
   Bank Cap: 1000000 USDC

⏳ Waiting for block confirmations...
✅ Block confirmations received

🔍 Verifying contract on Etherscan...
✅ Contract verified successfully!

🎉 Deployment completed successfully!
```

### Paso 4: Guardar Información

**IMPORTANTE**: Guardar la siguiente información:

```
Contract Address: 0x...
Transaction Hash: 0x...
Network: Sepolia
Deployer: 0x...
Timestamp: 2025-11-05T...
```

### Paso 5: Verificar en Etherscan

Visita: `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`

Deberías ver:
- ✅ Contrato verificado (checkmark verde)
- Código fuente visible
- Read/Write contract tabs disponibles

## Despliegue en Mainnet

⚠️ **ADVERTENCIA**: Desplegar en mainnet usa ETH real. Asegúrate de haber testeado extensivamente en testnet primero.

### Pre-checks de Seguridad

Antes de desplegar en mainnet, verifica:

- [ ] Todos los tests pasan exitosamente
- [ ] Contrato auditado (recomendado para producción)
- [ ] Variables de entorno correctas
- [ ] Wallet tiene suficiente ETH para gas (~0.05 ETH estimado)
- [ ] Has testeado en Sepolia exitosamente
- [ ] Tienes backup de tu private key de forma segura

### Paso 1: Verificar Configuración de Mainnet

```javascript
// hardhat.config.js
mainnet: {
  url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
  accounts: [PRIVATE_KEY],
  chainId: 1,
  gasPrice: 30000000000, // 30 gwei - ajustar según network conditions
  gas: 6000000
}
```

### Paso 2: Verificar Gas Price

Antes de desplegar, verifica el gas price actual:
- [Etherscan Gas Tracker](https://etherscan.io/gastracker)
- [ETH Gas Station](https://ethgasstation.info/)

Espera a que el gas esté razonablemente bajo (<50 gwei).

### Paso 3: Desplegar

```bash
npm run deploy:v3:mainnet
```

### Paso 4: Verificar Despliegue

```bash
# Verificar en Etherscan
https://etherscan.io/address/YOUR_CONTRACT_ADDRESS

# Interactuar con el contrato
KIPUBANK_V3_ADDRESS=0xYourAddress npm run interact:v3 -- --network mainnet
```

### Paso 5: Anunciar el Contrato

Una vez desplegado y verificado:

1. Actualiza el README con la dirección del contrato
2. Anuncia en redes sociales/comunidad
3. Configura monitoring (opcional)

## Verificación en Etherscan

### Verificación Automática

El script de despliegue intenta verificar automáticamente. Si falla:

### Verificación Manual

```bash
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "USDC_ADDRESS" "ROUTER_ADDRESS"
```

Ejemplo para Sepolia:
```bash
npx hardhat verify --network sepolia 0xYourContractAddress "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
```

Si aún falla, puedes verificar manualmente en Etherscan:

1. Ve a tu contrato en Etherscan
2. Click en "Contract" tab
3. Click en "Verify and Publish"
4. Selecciona:
   - Compiler: v0.8.19
   - Optimization: Yes (200 runs)
   - Constructor arguments: (ver abajo)

Para obtener constructor arguments codificados:
```javascript
const { ethers } = require("hardhat");
const encoded = ethers.utils.defaultAbiCoder.encode(
  ["address", "address"],
  ["USDC_ADDRESS", "ROUTER_ADDRESS"]
);
console.log(encoded);
```

## Testing Post-Despliegue

### 1. Verificar Configuración

```bash
KIPUBANK_V3_ADDRESS=0xYourAddress npm run interact:v3
```

Verifica:
- ✅ USDC address es correcto
- ✅ Uniswap Router es correcto
- ✅ Bank Cap es 1,000,000 USDC
- ✅ Owner es tu dirección
- ✅ Contrato no está pausado

### 2. Test de Depósito USDC (Testnet)

```javascript
const { ethers } = require("hardhat");

async function testDeposit() {
  const [signer] = await ethers.getSigners();
  const kipuBank = await ethers.getContractAt("KipuBankV3", "YOUR_CONTRACT_ADDRESS");
  const usdc = await ethers.getContractAt("IERC20", await kipuBank.usdc());
  
  // Obtener testnet USDC de faucet
  const amount = ethers.utils.parseUnits("10", 6); // 10 USDC
  
  // Aprobar
  await usdc.approve(kipuBank.address, amount);
  console.log("✅ USDC approved");
  
  // Depositar
  const tx = await kipuBank.depositUSDC(amount);
  await tx.wait();
  console.log("✅ Deposit successful");
  
  // Verificar balance
  const balance = await kipuBank.getBalance(signer.address);
  console.log("Balance:", ethers.utils.formatUnits(balance, 6), "USDC");
}

testDeposit();
```

### 3. Test de Retiro

```javascript
async function testWithdraw() {
  const [signer] = await ethers.getSigners();
  const kipuBank = await ethers.getContractAt("KipuBankV3", "YOUR_CONTRACT_ADDRESS");
  
  const amount = ethers.utils.parseUnits("5", 6); // 5 USDC
  
  const tx = await kipuBank.withdraw(amount);
  await tx.wait();
  console.log("✅ Withdrawal successful");
}

testWithdraw();
```

## Troubleshooting

### Error: "insufficient funds for intrinsic transaction cost"

**Problema**: No tienes suficiente ETH para el gas.

**Solución**:
```bash
# Verifica tu balance
npx hardhat run scripts/check-balance.js --network sepolia

# Obtén más ETH de testnet
# O transfiere más ETH a tu wallet
```

### Error: "nonce has already been used"

**Problema**: La transacción ya fue enviada.

**Solución**:
```bash
# Espera a que la transacción anterior se confirme
# O incrementa el nonce manualmente
```

### Error: "Contract verification failed"

**Problema**: Etherscan no pudo verificar el contrato.

**Solución**:
```bash
# Intenta verificar manualmente con constructor args
npx hardhat verify --network sepolia ADDRESS "ARG1" "ARG2"

# O verifica en etherscan.io directamente
```

### Error: "replacement fee too low"

**Problema**: El gas price es muy bajo.

**Solución**:
```javascript
// Incrementa el gas price en hardhat.config.js
gasPrice: 50000000000, // 50 gwei
```

### Error: "VM Exception: NoPairExists"

**Problema**: No existe par Uniswap para el token.

**Solución**:
```javascript
// Verifica que el par existe antes de depositar
const pairInfo = await kipuBank.checkPairExists(tokenAddress);
if (!pairInfo.exists) {
  console.log("No pair exists for this token");
}
```

### Contrato pausado

**Problema**: "Pausable: paused"

**Solución**:
```javascript
// Despausar como owner
await kipuBank.unpause();
```

## Mejores Prácticas

### Seguridad

1. **Nunca** compartas tu private key
2. Usa un hardware wallet para mainnet
3. Testea extensivamente en testnet primero
4. Considera una auditoría para producción
5. Implementa monitoring post-despliegue

### Gas Optimization

1. Despliega cuando el gas esté bajo (<50 gwei)
2. Usa gas price oracles para estimaciones
3. Considera Layer 2 para reducir costos

### Testing

1. Ejecuta tests completos antes de desplegar
2. Testea todas las funciones críticas post-despliegue
3. Monitorea eventos del contrato

### Backup

1. Guarda toda la información de despliegue
2. Backup de private keys de forma segura
3. Documenta configuraciones y decisiones

## Recursos Adicionales

- [Hardhat Deployment Docs](https://hardhat.org/guides/deploying.html)
- [Etherscan Verification Docs](https://docs.etherscan.io/tutorials/verifying-contracts-programmatically)
- [Uniswap V2 Docs](https://docs.uniswap.org/contracts/v2/overview)
- [OpenZeppelin Security Best Practices](https://docs.openzeppelin.com/contracts/4.x/security)

## Soporte

Si encuentras problemas:

1. Revisa esta guía y el README
2. Busca en [GitHub Issues](https://github.com/YOUR-USERNAME/eth-kipu-bank-V2/issues)
3. Crea un nuevo issue con detalles completos
4. Contacta al equipo en Discord/Telegram

---

**¡Buena suerte con tu despliegue! 🚀**

