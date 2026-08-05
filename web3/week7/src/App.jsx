import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BrowserProvider,
  Contract,
  ContractFactory,
  formatUnits,
  isAddress,
  parseUnits,
} from 'ethers'
import erxiaoArtifact from '../artifacts/contracts/ErxiaoToken.sol/ErxiaoToken.json'
import './App.css'

const SEPOLIA_CHAIN_ID = '11155111'
const SEPOLIA_CHAIN_HEX = '0xaa36a7'
const META_MASK_RDNS = 'io.metamask'
const TOKEN_KEY = 'erxiao-token-address'
const INITIAL_SUPPLY = '1000000'

const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`
const displayTokenAmount = (value) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(Number(value || 0))

function Icon({ name }) {
  const paths = {
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    wallet: <><path d="M4 6.5h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h12" /><path d="M16 11h6v4h-6a2 2 0 0 1 0-4Z" /></>,
    shield: <><path d="M12 2 4.5 5v5.4c0 4.8 3.1 9.2 7.5 11.1 4.4-1.9 7.5-6.3 7.5-11.1V5Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    rocket: <><path d="M14 4c2.6-2.6 5.8-2 5.8-2s.6 3.2-2 5.8l-5.1 5.1-4-4Z" /><path d="m7.7 9-3.4.8L2 12l5 1m4 4 1 5 2.2-2.3.8-3.4M9 15l-3 3" /><circle cx="15.4" cy="6.4" r="1.4" /></>,
    coin: <><ellipse cx="12" cy="6" rx="8" ry="3.5" /><path d="M4 6v6c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V6M4 12v6c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5v-6" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    code: <><path d="m8 9-4 3 4 3m8-6 4 3-4 3m-2-9-4 12" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function TokenBuddy() {
  return (
    <div className="token-buddy" aria-hidden="true">
      <span className="orbit orbit--one" />
      <span className="orbit orbit--two" />
      <div className="token-buddy__coin">
        <span className="token-buddy__spark">✦</span>
        <strong>二</strong>
        <span className="token-buddy__face">⌣</span>
      </div>
      <span className="token-buddy__shadow" />
      <span className="token-buddy__label">ERXIAO</span>
    </div>
  )
}

function App() {
  const [metaMask, setMetaMask] = useState(null)
  const [account, setAccount] = useState('')
  const [chainId, setChainId] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [tokenAddress, setTokenAddress] = useState(
    () => window.localStorage.getItem(TOKEN_KEY) || '',
  )
  const [tokenBalance, setTokenBalance] = useState('')
  const [totalSupply, setTotalSupply] = useState('')
  const [recipient, setRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [message, setMessage] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [copied, setCopied] = useState(false)

  const isSepolia = chainId === SEPOLIA_CHAIN_ID
  const explorerAddressUrl = tokenAddress
    ? `https://sepolia.etherscan.io/address/${tokenAddress}`
    : ''

  useEffect(() => {
    const handleProviderAnnouncement = (event) => {
      const { info, provider } = event.detail
      if (info.rdns === META_MASK_RDNS) setMetaMask(provider)
    }

    window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    return () => window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement)
  }, [])

  useEffect(() => {
    if (!metaMask) return undefined

    const updateWallet = async (accounts) => {
      const nextAccount = accounts?.[0] ?? ''
      setAccount(nextAccount)
      if (!nextAccount) {
        setChainId('')
        return
      }
      const network = await new BrowserProvider(metaMask).getNetwork()
      setChainId(network.chainId.toString())
    }
    const handleAccountsChanged = (accounts) => updateWallet(accounts).catch(() => {})
    const handleChainChanged = (nextChainId) => {
      setChainId(BigInt(nextChainId).toString())
      setMessage('钱包网络已更新。')
    }

    metaMask.on?.('accountsChanged', handleAccountsChanged)
    metaMask.on?.('chainChanged', handleChainChanged)
    return () => {
      metaMask.removeListener?.('accountsChanged', handleAccountsChanged)
      metaMask.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [metaMask])

  const loadTokenData = useCallback(async () => {
    if (!metaMask || !account || !tokenAddress || !isSepolia) {
      setTokenBalance('')
      setTotalSupply('')
      return
    }
    try {
      const provider = new BrowserProvider(metaMask)
      const token = new Contract(tokenAddress, erxiaoArtifact.abi, provider)
      const [balance, supply] = await Promise.all([
        token.balanceOf(account),
        token.totalSupply(),
      ])
      setTokenBalance(formatUnits(balance, 18))
      setTotalSupply(formatUnits(supply, 18))
    } catch {
      setTokenBalance('')
      setTotalSupply('')
      setMessage('无法读取这个地址的 ERXIAO 数据，请确认它是 Sepolia 上的代币合约。')
    }
  }, [account, isSepolia, metaMask, tokenAddress])

  useEffect(() => {
    loadTokenData()
  }, [loadTokenData])

  const connectWallet = async () => {
    if (!metaMask) {
      setMessage('未检测到 MetaMask。请安装或启用扩展后刷新页面。')
      return
    }
    try {
      setIsConnecting(true)
      setMessage('正在打开 MetaMask，请确认本次账户授权。')
      await metaMask.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      })
      const accounts = await metaMask.request({ method: 'eth_accounts' })
      const nextAccount = accounts?.[0] ?? ''
      if (!nextAccount) throw new Error('MetaMask 没有返回已授权账户。')
      setAccount(nextAccount)
      const network = await new BrowserProvider(metaMask).getNetwork()
      setChainId(network.chainId.toString())
      setMessage('测试钱包已连接。')
    } catch (error) {
      setMessage(error.code === 4001 ? '你取消了连接请求。' : (error.shortMessage || error.message || '连接失败，请重试。'))
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      await metaMask?.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      })
      setMessage('账户授权已撤销，下次连接会再次打开 MetaMask 确认。')
    } catch {
      setMessage('已断开本页面的钱包会话；下次连接仍会重新请求授权。')
    } finally {
      setAccount('')
      setChainId('')
    }
  }

  const switchToSepolia = async () => {
    if (!metaMask) return
    try {
      setMessage('请在 MetaMask 中确认切换到 Sepolia。')
      await metaMask.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_HEX }],
      })
    } catch (error) {
      if (error.code === 4902) {
        await metaMask.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: SEPOLIA_CHAIN_HEX,
            chainName: 'Sepolia test network',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        })
      } else {
        setMessage(error.code === 4001 ? '你取消了网络切换。' : '切换失败，请在 MetaMask 中手动选择 Sepolia。')
      }
    }
  }

  const deployErxiao = async () => {
    if (!metaMask || !account || !isSepolia) return
    try {
      setIsDeploying(true)
      setTransactionHash('')
      setMessage('请确认部署交易；它会消耗少量 SepoliaETH。')
      const provider = new BrowserProvider(metaMask)
      const signer = await provider.getSigner()
      const factory = new ContractFactory(erxiaoArtifact.abi, erxiaoArtifact.bytecode, signer)
      const token = await factory.deploy(parseUnits(INITIAL_SUPPLY, 18))
      const deploymentTransaction = token.deploymentTransaction()
      setTransactionHash(deploymentTransaction?.hash || '')
      setMessage('交易已广播，正在等待 Sepolia 确认…')
      await token.waitForDeployment()
      const address = await token.getAddress()
      setTokenAddress(address)
      window.localStorage.setItem(TOKEN_KEY, address)
      setMessage('ERXIAO 已部署成功，链上数据正在同步。')
    } catch (error) {
      setMessage(error.code === 4001 ? '你取消了部署交易。' : (error.shortMessage || error.message || '部署失败，请重试。'))
    } finally {
      setIsDeploying(false)
    }
  }

  const addErxiaoToMetaMask = async () => {
    if (!metaMask || !tokenAddress) return
    try {
      const added = await metaMask.request({
        method: 'wallet_watchAsset',
        params: [{
          type: 'ERC20',
          options: { address: tokenAddress, symbol: 'ERXIAO', decimals: 18 },
        }],
      })
      setMessage(added ? 'ERXIAO 已添加到 MetaMask。' : '你暂时没有添加 ERXIAO。')
    } catch (error) {
      setMessage(error.code === 4001 ? '你取消了添加代币。' : '添加代币失败，请稍后重试。')
    }
  }

  const transferError = useMemo(() => {
    if (!recipient && !transferAmount) return ''
    if (!isAddress(recipient)) return '请输入有效的 0x 钱包地址'
    if (recipient.toLowerCase() === account.toLowerCase()) return '不能转给当前连接的钱包'
    if (!/^\d+(\.\d{1,18})?$/.test(transferAmount) || Number(transferAmount) <= 0) {
      return '请输入大于 0 的代币数量'
    }
    if (tokenBalance && Number(transferAmount) > Number(tokenBalance)) return '转账数量超过当前余额'
    return ''
  }, [account, recipient, tokenBalance, transferAmount])

  const transferToken = async (event) => {
    event.preventDefault()
    if (!metaMask || !account || !tokenAddress || transferError || !recipient || !transferAmount) return
    try {
      setIsTransferring(true)
      setTransactionHash('')
      setMessage('请在 MetaMask 中核对收款地址和数量。')
      const provider = new BrowserProvider(metaMask)
      const signer = await provider.getSigner()
      const token = new Contract(tokenAddress, erxiaoArtifact.abi, signer)
      const transaction = await token.transfer(recipient, parseUnits(transferAmount, 18))
      setTransactionHash(transaction.hash)
      setMessage('转账已广播，正在等待链上确认…')
      await transaction.wait()
      setRecipient('')
      setTransferAmount('')
      await loadTokenData()
      setMessage('ERXIAO 转账成功，余额已刷新。')
    } catch (error) {
      setMessage(error.code === 4001 ? '你取消了转账。' : (error.shortMessage || error.message || '转账失败，请重试。'))
    } finally {
      setIsTransferring(false)
    }
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setMessage('浏览器未允许自动复制，请从合约地址卡片中手动复制。')
    }
  }

  const forgetDeployment = () => {
    window.localStorage.removeItem(TOKEN_KEY)
    setTokenAddress('')
    setTokenBalance('')
    setTotalSupply('')
    setMessage('已从本页面移除旧地址；链上合约不会被删除。')
  }

  return (
    <main className="page-shell">
      <section className="story-card hero-panel" aria-labelledby="page-title">
        <div className="hero-panel__copy">
          <p className="eyebrow">WEEK 7 · SEPOLIA LAB</p>
          <h1 id="page-title">Erxiao ·<br />链上代币工坊</h1>
          <p className="hero-lead">从连接钱包到完成一次测试转账，亲手走完 ERC‑20 的完整链上旅程。</p>
          <p className="hero-note">ERXIAO 没有价格，只用于 Sepolia 学习与测试；不可兑换，也不代表任何投资权益。</p>
          <ul className="chip-list" aria-label="项目能力">
            <li>浏览器内编译产物部署</li>
            <li>真实链上余额</li>
            <li>测试钱包转账</li>
          </ul>
        </div>
        <div className="hero-showcase">
          <TokenBuddy />
          <ol className="journey-list">
            <li><span>01</span>连接钱包</li>
            <li><span>02</span>部署合约</li>
            <li><span>03</span>完成转账</li>
          </ol>
        </div>
      </section>

      <section className="safety-grid" aria-label="测试前须知">
        <article className="story-card safety-card">
          <span className="icon-box"><Icon name="globe" /></span>
          <strong>测试链长期公开</strong>
          <p>钱包地址、合约和交易都可被公开查询，请使用专门的 Sepolia 测试账户。</p>
        </article>
        <article className="story-card safety-card">
          <span className="icon-box"><Icon name="wallet" /></span>
          <strong>只需要测试 ETH</strong>
          <p>部署与转账仅消耗 SepoliaETH Gas，不要向本项目转入任何主网真实资产。</p>
        </article>
        <article className="story-card safety-card">
          <span className="icon-box"><Icon name="shield" /></span>
          <strong>私钥永不离开钱包</strong>
          <p>页面只请求 MetaMask 签名，绝不会要求填写助记词、私钥或真实身份信息。</p>
        </article>
      </section>

      <section className="story-card section-card" aria-labelledby="wallet-heading">
        <div className="section-heading">
          <div>
            <p className="step-label">STEP 01</p>
            <h2 id="wallet-heading">连接 Sepolia 测试钱包</h2>
            <p>先确认账户和网络，再开始任何需要 Gas 的链上操作。</p>
          </div>
          <span className={`status-pill ${account && isSepolia ? 'status-pill--success' : 'status-pill--neutral'}`}>
            {account ? (isSepolia ? 'Sepolia 已就绪' : '需要切换网络') : '等待连接'}
          </span>
        </div>
        <div className="two-column">
          <div className="inset-card wallet-summary">
            {account ? (
              <>
                <span className="live-dot" />
                <p className="small-label">当前测试账户</p>
                <strong className="address-display">{shortAddress(account)}</strong>
                <p className="muted">Chain ID · {chainId || '读取中'}</p>
              </>
            ) : (
              <>
                <p className="small-label">尚未连接测试钱包</p>
                <strong className="summary-title">准备好后，从这里开始</strong>
                <p className="muted">连接只会读取公开地址，不会自动发起交易。</p>
              </>
            )}
          </div>
          <div className="inset-card checklist-card">
            <p className="small-label">连接后请检查</p>
            <ul className="check-list">
              <li>MetaMask 中是专用测试账户</li>
              <li>网络名称显示 Sepolia</li>
              <li>账户中有少量 SepoliaETH</li>
            </ul>
          </div>
        </div>
        <div className="button-row">
          {!account && (
            <button className="button button--web3" type="button" onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? '正在连接…' : '连接 MetaMask'}
            </button>
          )}
          {account && !isSepolia && (
            <button className="button button--web3" type="button" onClick={switchToSepolia}>切换到 Sepolia</button>
          )}
          {account && (
            <button className="button button--ghost" type="button" onClick={disconnectWallet}>断开页面连接</button>
          )}
        </div>
      </section>

      <section className="story-card section-card" aria-labelledby="deploy-heading">
        <div className="section-heading">
          <div>
            <p className="step-label">STEP 02</p>
            <h2 id="deploy-heading">把 ERXIAO 部署到测试链</h2>
            <p>部署后，合约地址和初始代币将真实写入 Sepolia。</p>
          </div>
          <span className="icon-box icon-box--warm"><Icon name="rocket" /></span>
        </div>
        <div className="two-column">
          <div className="token-blueprint">
            <div className="blueprint-coin">二</div>
            <div>
              <p className="small-label">代币名称</p>
              <h3>erxiao <span>ERXIAO</span></h3>
              <p>一个用于理解 ERC‑20 标准、部署流程和钱包交互的学习型测试代币。</p>
            </div>
          </div>
          <dl className="spec-grid">
            <div><dt>初始供应量</dt><dd>1,000,000</dd></div>
            <div><dt>精度</dt><dd>18</dd></div>
            <div><dt>目标网络</dt><dd>Sepolia</dd></div>
            <div><dt>标准</dt><dd>ERC‑20</dd></div>
          </dl>
        </div>
        <div className="deploy-callout">
          <div>
            <strong>{tokenAddress ? '已有一份部署记录' : '准备创建你的代币合约'}</strong>
            <p>{tokenAddress ? '本机已保存合约地址，可继续查看资产或重新部署一份新合约。' : '点击后 MetaMask 会展示预计 Gas，只有确认签名后才会广播。'}</p>
          </div>
          <button className="button button--primary" type="button" onClick={deployErxiao} disabled={!account || !isSepolia || isDeploying}>
            {isDeploying ? '等待链上确认…' : tokenAddress ? '重新部署一份' : '部署 ERXIAO'}
          </button>
        </div>
      </section>

      <section className="story-card section-card" aria-labelledby="asset-heading">
        <div className="section-heading">
          <div>
            <p className="step-label">STEP 03</p>
            <h2 id="asset-heading">读取你的链上资产</h2>
            <p>页面直接从合约读取总供应量和当前账户余额，不使用本地模拟数据。</p>
          </div>
          <span className={`status-pill ${tokenAddress ? 'status-pill--success' : 'status-pill--neutral'}`}>
            {tokenAddress ? '合约已记录' : '等待部署'}
          </span>
        </div>
        <div className="asset-layout">
          <div className="asset-card asset-card--hero">
            <span className="asset-card__icon"><Icon name="coin" /></span>
            <p>我的 ERXIAO 余额</p>
            <strong>{tokenBalance ? displayTokenAmount(tokenBalance) : '—'}</strong>
            <span>{tokenAddress ? (isSepolia ? '来自 Sepolia 实时读取' : '切换到 Sepolia 后读取') : '部署合约后显示'}</span>
          </div>
          <div className="metric-stack">
            <div className="asset-card">
              <p>代币总供应量</p>
              <strong>{totalSupply ? displayTokenAmount(totalSupply) : '—'}</strong>
              <span>ERXIAO</span>
            </div>
            <div className="asset-card contract-address-card">
              <p>合约地址</p>
              <strong>{tokenAddress ? shortAddress(tokenAddress) : '尚未部署'}</strong>
              {tokenAddress && <span title={tokenAddress}>{tokenAddress}</span>}
            </div>
          </div>
        </div>
        {tokenAddress && (
          <div className="button-row asset-actions">
            <button className="button button--web3" type="button" onClick={addErxiaoToMetaMask} disabled={!account || !isSepolia}>添加到 MetaMask</button>
            <button className="button button--secondary" type="button" onClick={copyAddress}>{copied ? '已复制地址' : '复制合约地址'}</button>
            <a className="button button--secondary" href={explorerAddressUrl} target="_blank" rel="noreferrer">在 Etherscan 查看</a>
            <button className="text-button" type="button" onClick={forgetDeployment}>移除本机记录</button>
          </div>
        )}
      </section>

      <section className="story-card section-card" aria-labelledby="transfer-heading">
        <div className="section-heading">
          <div>
            <p className="step-label">STEP 04</p>
            <h2 id="transfer-heading">完成一次测试转账</h2>
            <p>把少量 ERXIAO 发给另一个 Sepolia 钱包，验证 ERC‑20 的 transfer 流程。</p>
          </div>
          <span className="icon-box icon-box--sage"><Icon name="send" /></span>
        </div>
        <div className="two-column transfer-layout">
          <div className="transfer-note">
            <p className="small-label">发出前逐项核对</p>
            <h3>链上交易无法撤回</h3>
            <p>收款地址、数量和交易时间会长期公开。建议先发送 1 枚测试代币，确认到账后再继续。</p>
            <div className="balance-strip">
              <span>当前可用余额</span>
              <strong>{tokenBalance ? `${displayTokenAmount(tokenBalance)} ERXIAO` : '等待读取'}</strong>
            </div>
          </div>
          <form className="transfer-form" onSubmit={transferToken}>
            <label>
              <span>Sepolia 收款钱包地址</span>
              <input value={recipient} onChange={(event) => setRecipient(event.target.value.trim())} placeholder="0x…" aria-invalid={Boolean(transferError)} />
            </label>
            <label>
              <span>转账数量</span>
              <input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value.trim())} inputMode="decimal" placeholder="例如：1" aria-invalid={Boolean(transferError)} />
            </label>
            <button className="button button--primary" type="submit" disabled={!account || !isSepolia || !tokenAddress || !recipient || !transferAmount || Boolean(transferError) || isTransferring}>
              {isTransferring ? '等待链上确认…' : '确认转账 ERXIAO'}
            </button>
            <p className={`form-hint ${transferError ? 'form-hint--error' : ''}`}>{transferError || '只使用 Sepolia 测试地址，不要填写交易所充值地址。'}</p>
          </form>
        </div>
      </section>

      <section className={`global-message ${message ? 'global-message--visible' : ''}`} aria-live="polite">
        <span className="live-dot" />
        <div>
          <strong>链上操作状态</strong>
          <p>{message || '准备就绪。'}</p>
          {transactionHash && (
            <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noreferrer">
              查看本次交易 ↗
            </a>
          )}
        </div>
      </section>

      <footer className="story-card course-footer">
        <div>
          <p className="step-label">COURSE EVIDENCE</p>
          <h2>这份作业完成了什么？</h2>
          <ul>
            <li>React + ethers 通过 EIP‑1193 连接 MetaMask</li>
            <li>Hardhat 编译 Solidity 0.8.24 合约并生成部署字节码</li>
            <li>等待 transaction receipt 后再更新页面状态</li>
            <li>读取 ERC‑20 余额、添加钱包资产并完成 transfer</li>
          </ul>
        </div>
        <div className="footer-card">
          <span className="icon-box"><Icon name="code" /></span>
          <strong>完整链上闭环</strong>
          <p>连接 → 切链 → 部署 → 读取 → 转账，每一步都由真实 Sepolia 数据驱动。</p>
          <a href="https://sepolia.etherscan.io/" target="_blank" rel="noreferrer">打开 Sepolia Etherscan ↗</a>
        </div>
      </footer>
    </main>
  )
}

export default App
