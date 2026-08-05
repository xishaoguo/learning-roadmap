# Week 7 — Erxiao 链上代币工坊

这是一个运行在 Ethereum Sepolia 测试网上的 ERC‑20 学习型 DApp。页面通过 MetaMask 完成钱包连接、网络切换、合约部署、余额读取、添加钱包资产和测试转账。

## 产品流程

1. 连接专用 MetaMask 测试钱包。
2. 切换到 Sepolia，并确认账户中有少量 SepoliaETH。
3. 在浏览器中使用 Hardhat 编译产物部署 `ErxiaoToken.sol`。
4. 等待 transaction receipt 后读取代币总供应量和当前账户余额。
5. 将 ERXIAO 添加到 MetaMask，或向另一个 Sepolia 钱包完成测试转账。

ERXIAO 名称为 `erxiao`，符号为 `ERXIAO`，精度为 18，部署时向部署账户铸造 1,000,000 枚。它只用于测试网学习，没有价格、兑换或投资属性。

## 本地运行

需要 Node.js 20 或更高版本：

```bash
npm install
npm run dev
```

质量检查与生产构建：

```bash
npm run lint
npm run build
```

## 项目结构

- `contracts/ErxiaoToken.sol`：最小 ERC‑20 测试代币
- `contracts/WalletStatus.sol`：钱包签到示例合约
- `src/App.jsx`：钱包、部署、余额与转账交互
- `src/App.css`：响应式绘本风格界面
- `artifacts/`：Hardhat 编译后的 ABI 与部署字节码

## 安全边界

- 只使用 Sepolia 测试账户和测试 ETH。
- 页面不会读取或保存助记词、私钥。
- 合约地址、钱包地址和交易记录会长期公开。
- 交易成功状态以链上 receipt 为准，不做本地乐观更新。
