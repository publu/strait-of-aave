// Gets top holders by scanning recent Transfer events on-chain then batch balanceOf
// No external API key needed — uses same RPCs as markets.js

const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ZERO_ADDR = '0'.repeat(40)

const CHAINS = {
  Ethereum: { rpcs: ['https://eth.drpc.org','https://ethereum-rpc.publicnode.com'], pool:'0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' },
  Arbitrum: { rpcs: ['https://arbitrum.drpc.org','https://arb1.arbitrum.io/rpc'],   pool:'0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
  Base:     { rpcs: ['https://base.drpc.org','https://mainnet.base.org'],            pool:'0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' },
  Optimism: { rpcs: ['https://optimism.drpc.org','https://mainnet.optimism.io'],    pool:'0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
  Polygon:  { rpcs: ['https://polygon.drpc.org','https://polygon-bor-rpc.publicnode.com'], pool:'0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
  Avalanche:{ rpcs: ['https://api.avax.network/ext/bc/C/rpc','https://avalanche.drpc.org'], pool:'0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
  Gnosis:   { rpcs: ['https://rpc.gnosischain.com','https://gnosis.drpc.org'],      pool:'0xb50201558B00496A145fE76f7424749556E326D8' },
  BNB:      { rpcs: ['https://bsc-rpc.publicnode.com','https://bsc.drpc.org'],      pool:'0x6807dc923806fE8Fd134338EABCA509979a7e0cB' },
  Scroll:   { rpcs: ['https://rpc.scroll.io'],                                      pool:'0x11fCfe756c05AD438e312a7fd934381537D3cFfe' },
}

async function tryRpc(rpcs, body, timeout = 10000) {
  for (const url of rpcs) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeout)
      const res = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json','User-Agent':'strait-of-aave/1.0'},
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (!res.ok) continue
      return await res.json()
    } catch { continue }
  }
  return null
}

function pad(addr) { return '000000000000000000000000' + addr.replace('0x','').toLowerCase() }
function decodeAddr(hex, slot) { return '0x' + hex.slice(slot*64+24, slot*64+64) }

async function getTopHolders(rpcs, tokenAddr, decimals, blockRange = 10000) {
  // Latest block
  const blkRes = await tryRpc(rpcs, { jsonrpc:'2.0', method:'eth_blockNumber', params:[], id:0 })
  if (!blkRes?.result) return []
  const latest = Number(blkRes.result)
  const fromBlock = '0x' + Math.max(0, latest - blockRange).toString(16)

  // Transfer events
  const logRes = await tryRpc(rpcs, {
    jsonrpc:'2.0', method:'eth_getLogs',
    params:[{ address: tokenAddr, topics:[TRANSFER], fromBlock, toBlock:'latest' }],
    id:1,
  }, 12000)

  const logs = logRes?.result
  if (!Array.isArray(logs) || !logs.length) return []

  // Unique non-zero recipients from topics[2]
  const seen = new Set()
  for (const log of logs) {
    if (log.topics?.[2]) {
      const addr = log.topics[2].slice(26).toLowerCase()
      if (addr !== ZERO_ADDR) seen.add(addr)
    }
  }

  const addrs = [...seen].slice(0, 120)
  if (!addrs.length) return []

  // Batch balanceOf (selector 0x70a08231)
  const batch = addrs.map((a, i) => ({
    jsonrpc:'2.0', method:'eth_call',
    params:[{ to: tokenAddr, data: '0x70a08231' + a.padStart(64,'0') }, 'latest'],
    id: i,
  }))
  const bals = await tryRpc(rpcs, batch)
  if (!bals) return []

  const dec = Math.min(parseInt(decimals)||18, 18)
  return (Array.isArray(bals) ? bals : [bals])
    .filter(r => r?.result && r.result.length > 2 && r.result !== '0x' + '0'.repeat(64))
    .map(r => ({
      address: '0x' + addrs[r.id],
      balance: Number(BigInt(r.result)) / 10**dec,
    }))
    .filter(h => h.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { chain, reserve } = req.query
  const cfg = CHAINS[chain]
  if (!cfg) return res.status(200).json({ depositors:[], borrowers:[], noData:true })

  try {
    // Resolve aToken + varDebt addresses from pool
    const rdRes = await tryRpc(cfg.rpcs, {
      jsonrpc:'2.0', method:'eth_call',
      params:[{ to: cfg.pool, data: '0x35ea6a75' + pad(reserve) }, 'latest'], id:0,
    })
    const rd = rdRes?.result?.slice(2)
    if (!rd || rd.length < 640) return res.status(200).json({ depositors:[], borrowers:[], error:'Reserve not found' })

    const aToken  = decodeAddr(rd, 8)
    const varDebt = decodeAddr(rd, 10)

    // Get decimals from underlying asset
    const decRes = await tryRpc(cfg.rpcs, {
      jsonrpc:'2.0', method:'eth_call',
      params:[{ to: reserve, data: '0x313ce567' }, 'latest'], id:1,
    })
    const decimals = decRes?.result && decRes.result.length > 2
      ? Number(BigInt(decRes.result))
      : 18

    const [depositors, borrowers] = await Promise.all([
      getTopHolders(cfg.rpcs, aToken, decimals),
      getTopHolders(cfg.rpcs, varDebt, decimals),
    ])

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60')
    res.status(200).json({ depositors, borrowers, decimals })
  } catch (e) {
    res.status(200).json({ depositors:[], borrowers:[], error: e.message })
  }
}
