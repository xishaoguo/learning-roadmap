import { useEffect, useState } from 'react'
import { BrowserProvider, ContractFactory, parseUnits } from 'ethers'
import erxiaoArtifact from '../artifacts/contracts/ErxiaoToken.sol/ErxiaoToken.json'
import './App.css'

const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`

// Several wallets can be injected into one page. The default window.ethereum can
// point to OKX, so a provider is accepted only when it identifies itself as MetaMask.
const META_MASK_RDNS = 'io.metamask'
const DISCONNECT_KEY = 'erxiao-wallet-disconnected'

function App() {
  const [metaMask, setMetaMask] = useState(null)
  const [account, setAccount] = useState('')
  const [chainId, setChainId] = useState('')
  const [isDisconnected, setIsDisconnected] = useState(
    () => window.localStorage.getItem(DISCONNECT_KEY) === 'true',
  )
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [tokenAddress, setTokenAddress] = useState('')
  const [message, setMessage] = useState('')

  // EIP-6963 returns a provider together with its reverse-domain identifier.
  // Do not fall back to window.ethereum: it may be the user's primary OKX wallet.
  useEffect(() => {
    const handleProviderAnnouncement = (event) => {
      const { info, provider } = event.detail
      if (info.rdns === META_MASK_RDNS) {
        setMetaMask(provider)
      }
    }

    window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    return () => window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement)
  }, [])

  useEffect(() => {
    if (!metaMask || isDisconnected) return undefined

    const updateWallet = async (accounts) => {
      const nextAccount = accounts?.[0] ?? ''
      setAccount(nextAccount)

      if (nextAccount) {
        const provider = new BrowserProvider(metaMask)
        const network = await provider.getNetwork()
        setChainId(network.chainId.toString())
      } else {
        setChainId('')
      }
    }
    const handleAccountsChanged = (accounts) => updateWallet(accounts).catch(() => {})
    const handleChainChanged = () => window.location.reload()

    metaMask.request({ method: 'eth_accounts' }).then(updateWallet).catch(() => {})
    metaMask.on('accountsChanged', handleAccountsChanged)
    metaMask.on('chainChanged', handleChainChanged)

    return () => {
      metaMask.removeListener('accountsChanged', handleAccountsChanged)
      metaMask.removeListener('chainChanged', handleChainChanged)
    }
  }, [metaMask, isDisconnected])

  const connectWallet = async () => {
    if (!metaMask) {
      setMessage('未检测到 MetaMask。请确认扩展已启用后刷新页面。')
      return
    }

    try {
      setIsConnecting(true)
      setMessage('请在 MetaMask 弹窗中确认连接。')
      const accounts = await metaMask.request({ method: 'eth_requestAccounts' })
      window.localStorage.removeItem(DISCONNECT_KEY)
      setIsDisconnected(false)
      const nextAccount = accounts?.[0] ?? ''
      setAccount(nextAccount)
      const network = await new BrowserProvider(metaMask).getNetwork()
      setChainId(network.chainId.toString())
      setMessage('钱包已成功连接。')
    } catch (error) {
      if (error.code === 4001) {
        setMessage('你取消了 MetaMask 的连接请求。')
      } else {
        setMessage(error.message || '连接钱包时发生错误，请重试。')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    window.localStorage.setItem(DISCONNECT_KEY, 'true')
    setAccount('')
    setChainId('')
    setIsDisconnected(true)
    setMessage('已断开本网站的钱包连接。')
  }

  const switchToSepolia = async () => {
    if (!metaMask) return

    try {
      setMessage('请在 MetaMask 弹窗中确认切换到 Sepolia。')
      await metaMask.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      })
    } catch (error) {
      if (error.code === 4902) {
        await metaMask.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia test network',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        })
      } else if (error.code !== 4001) {
        setMessage(error.message || '切换网络失败，请在 MetaMask 中手动切换。')
      }
    }
  }

  const deployErxiao = async () => {
    if (!metaMask || !account) return
    if (chainId !== '11155111') {
      setMessage('请先切换到 Sepolia 测试网络，然后再部署测试币。')
      return
    }

    try {
      setIsDeploying(true)
      setMessage('请在 MetaMask 中确认部署交易（需要少量 SepoliaETH Gas）。')
      const provider = new BrowserProvider(metaMask)
      const signer = await provider.getSigner()
      const factory = new ContractFactory(erxiaoArtifact.abi, erxiaoArtifact.bytecode, signer)
      const token = await factory.deploy(parseUnits('1000000', 18))
      setMessage('交易已发送，正在等待 Sepolia 确认…')
      await token.waitForDeployment()
      setTokenAddress(await token.getAddress())
      setMessage('erxiao 已部署。现在可将它添加到 MetaMask。')
    } catch (error) {
      setMessage(error.code === 4001 ? '你取消了部署交易。' : (error.message || '部署失败，请重试。'))
    } finally {
      setIsDeploying(false)
    }
  }

  const addErxiaoToMetaMask = async () => {
    if (!metaMask || !tokenAddress) return

    try {
      const added = await metaMask.request({
        method: 'wallet_watchAsset',
        params: [{ type: 'ERC20', options: { address: tokenAddress, symbol: 'ERXIAO', decimals: 18 } }],
      })
      setMessage(added ? 'ERXIAO 已添加到 MetaMask。' : '未添加 ERXIAO。')
    } catch (error) {
      setMessage(error.code === 4001 ? '你取消了添加代币。' : (error.message || '添加代币失败。'))
    }
  }

  return (
    <main className="app-shell">
      <section className="wallet-card" aria-labelledby="page-title">
        <span className="eyebrow">WEEK 7 · WEB3</span>
        <h1 id="page-title">连接你的钱包</h1>
        <p className="intro">使用 MetaMask 连接以开始与本项目的智能合约交互。</p>

        {account ? (
          <>
            <div className="wallet-info">
              <span className="status-dot" aria-hidden="true" />
              <div>
                <p className="wallet-label">已连接账户</p>
                <strong>{shortAddress(account)}</strong>
                <p className="network">Chain ID: {chainId}</p>
              </div>
            </div>
            <button className="secondary-button disconnect-button" type="button" onClick={disconnectWallet}>
              断开钱包连接
            </button>
          </>
        ) : (
          <button className="connect-button" type="button" onClick={connectWallet} disabled={isConnecting}>
            <span className="metamask-mark">◇</span>
            {isConnecting ? '正在请求连接…' : '连接 MetaMask'}
          </button>
        )}

        {account && (
          <div className="token-actions">
            <p className="token-title">erxiao (ERXIAO) · 1,000,000 初始供应量</p>
            {chainId !== '11155111' && <button className="secondary-button" type="button" onClick={switchToSepolia}>切换至 Sepolia</button>}
            {!tokenAddress ? (
              <button className="connect-button" type="button" onClick={deployErxiao} disabled={isDeploying || chainId !== '11155111'}>
                {isDeploying ? '正在部署 erxiao…' : '部署 erxiao 测试币'}
              </button>
            ) : (
              <>
                <p className="token-address">{tokenAddress}</p>
                <button className="connect-button" type="button" onClick={addErxiaoToMetaMask}>添加 ERXIAO 到 MetaMask</button>
              </>
            )}
          </div>
        )}

        {message && <p className="message" role="status">{message}</p>}
      </section>
    </main>
  )
}

export default App
