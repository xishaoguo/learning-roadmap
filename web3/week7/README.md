# Week 7 — MetaMask 连接示例

React + Vite 前端通过 EIP-1193 的 `window.ethereum` 调用 MetaMask；`contracts/WalletStatus.sol` 是可部署的示例合约。

## 运行前端

```bash
npm install
npm run dev
```

打开终端显示的本地地址，点击“连接 MetaMask”，然后在 MetaMask 弹窗中手动确认即可。

## 合约

`WalletStatus.sol` 提供 `checkIn()`，用于在链上记录调用者已签到。`ErxiaoToken.sol` 是标准 ERC-20 测试币，名称为 `erxiao`，符号为 `ERXIAO`，部署时会向部署钱包铸造 1,000,000 枚。

连接 MetaMask 后，在前端切换到 Sepolia 并点击“部署 erxiao 测试币”。部署需要测试网 SepoliaETH 支付 Gas；交易确认完成后，点击“添加 ERXIAO 到 MetaMask”。
