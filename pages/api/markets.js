// Real on-chain Aave V3 data via direct RPC calls
// Selectors (keccak256):
// getReservesList()         0xd1946dbc
// getReserveData(address)   0x35ea6a75
// totalSupply()             0x18160ddd
// symbol()                  0x95d89b41
// decimals()                0x313ce567
// OPTIMAL_USAGE_RATIO()     0x54c365c6
// getVariableRateSlope1()   0x0b3429a2
// getVariableRateSlope2()   0xf4202409
// BASE_VARIABLE_BORROW_RATE() 0x37c24aa4

const RAY = BigInt('1000000000000000000000000000') // 1e27

const CHAINS = {
  Ethereum:  { rpcs: ['https://eth.drpc.org', 'https://ethereum-rpc.publicnode.com'], pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', chainId: 1 },
  Arbitrum:  { rpcs: ['https://arbitrum.drpc.org', 'https://arb1.arbitrum.io/rpc'],  pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', chainId: 42161 },
  Base:      { rpcs: ['https://base.drpc.org', 'https://mainnet.base.org'],           pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', chainId: 8453 },
  Optimism:  { rpcs: ['https://optimism.drpc.org', 'https://mainnet.optimism.io'],   pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', chainId: 10 },
  Polygon:   { rpcs: ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'], pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', chainId: 137 },
  Avalanche: { rpcs: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.drpc.org'], pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', chainId: 43114 },
  Gnosis:    { rpcs: ['https://rpc.gnosischain.com', 'https://gnosis.drpc.org'],     pool: '0xb50201558B00496A145fE76f7424749556E326D8', chainId: 100 },
  BNB:       { rpcs: ['https://bsc-rpc.publicnode.com', 'https://bsc.drpc.org'],     pool: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB', chainId: 56 },
  Scroll:    { rpcs: ['https://rpc.scroll.io'],                                      pool: '0x11fCfe756c05AD438e312a7fd934381537D3cFfe', chainId: 534352 },
  Mantle:    { rpcs: ['https://rpc.mantle.xyz'],                                     pool: '0x458F293454fE0d67EC0655f3672301301DD51422', chainId: 5000 },
  MegaETH:   { rpcs: ['https://mainnet.megaeth.com/rpc'],                            pool: '0x7e324AbC5De01d112AfC03a584966ff199741C28', chainId: 4326 },
  zkSync:    { rpcs: ['https://mainnet.era.zksync.io'],                              pool: '0x78e30497a3c7527d953c6B1E3541b021A98Ac43c', chainId: 324 },
  Linea:     { rpcs: ['https://rpc.linea.build'],                                    pool: '0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac', chainId: 59144 },
  Metis:     { rpcs: ['https://andromeda.metis.io/?owner=1088'],                     pool: '0x90df02551bB792286e8D4f13E0e357b4Bf1D6a57', chainId: 1088 },
  Sonic:     { rpcs: ['https://rpc.soniclabs.com'],                                  pool: '0x5362dBb1e601abF3a4c14c22ffEdA64042E5eAA3', chainId: 146 },
  Celo:      { rpcs: ['https://forno.celo.org'],                                     pool: '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402', chainId: 42220 },
  Soneium:   { rpcs: ['https://rpc.soneium.org'],                                    pool: '0xDd3d7A7d03D9fD9ef45f3E587287922eF65CA38B', chainId: 1868 },
  Ink:       { rpcs: ['https://rpc-gel.inkonchain.com'],                             pool: '0x2816cf15F6d2A220E789aA011D5EE4eB6c47FEbA', chainId: 57073 },
}

// Known token symbols by address (lowercase) — avoids symbol() call failures on bytes32 tokens
const KNOWN_SYMBOLS = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'wstETH',
  '0xae78736cd615f374d3085123a210448e74fc6393': 'rETH',
  '0x5979d7b546e38e414f7e9822514be443a4800529': 'wstETH',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE',
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 'BAT',
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'MKR',
  '0xc00e94cb662c3520282e6f5717214004a7f26888': 'COMP',
  '0xba100000625a3754423978a60c9317c58a424e3d': 'BAL',
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 'CRV',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': 'ENS',
  '0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3': 'EURS',
  '0x83f20f44975d03b1b09e64809b757c47f942beea': 'sDAI',
  '0x40d16fc0246ad3160278095345664f6f4d50f7ae': 'GHO',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'stETH',
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC',
  '0x8236a87084f8b84306f72007f36f2618a5634494': 'LBTC',
  '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee': 'weETH',
  '0xa1290d69c65a6fe4df752f95823fae25cb99e5a7': 'rsETH',
  '0xbf5495efe5db9ce00f80364c8b423567e58d2110': 'ezETH',
  '0xf951e335afb289353dc249e82926178eac7ded78': 'swETH',
  '0x35fa164735182de50811e8e2e824cfb9b6118ac2': 'eETH',
  '0xd9a442856c234a39a81a089c06451ebaa4306a72': 'pufETH',
  '0x4c9edd5852cd905f086c759e8383e09bff1e68b3': 'USDe',
  '0x9d39a5de30e57443bff2a8307a4256c8797a3497': 'sUSDe',
  '0xdde0107038bef48e4c3e4a7dca9e0fb19f29e38b': 'USDC.e',
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USDC.e',
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT',
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'WBTC',
  '0xd22a58f79e9481d1a88e00c343885a588b34b68b': 'EURS',
  '0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a': 'MIM',
  '0x4200000000000000000000000000000000000006': 'WETH',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'USDbC',
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH',
  '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452': 'wstETH',
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 'USDC',
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'USDT',
  '0x4200000000000000000000000000000000000042': 'OP',
  '0x68f180fcce6836688e9084f035309e29bf0a2095': 'WBTC',
  '0xb0b195aefa3650a6908f15cdac7d92f8a5791b0b': 'BOB',
}

async function tryRpc(rpcs, body, timeout = 8000) {
  for (const rpc of rpcs) {
    try {
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), timeout)
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'strait-of-aave/1.0' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      clearTimeout(id)
      if (!res.ok) continue
      return await res.json()
    } catch { continue }
  }
  return null
}

function pad(addr) {
  return '000000000000000000000000' + addr.replace('0x', '').toLowerCase()
}

function decodeUint(hex, slot) {
  return BigInt('0x' + hex.slice(slot * 64, slot * 64 + 64))
}

function decodeAddr(hex, slot) {
  return '0x' + hex.slice(slot * 64 + 24, slot * 64 + 64)
}

function decodeAddressArray(hex) {
  if (!hex || hex === '0x') return []
  const data = hex.slice(2)
  const len = Number(decodeUint(data, 1))
  const addrs = []
  for (let i = 0; i < len; i++) {
    addrs.push('0x' + data.slice((2 + i) * 64 + 24, (2 + i) * 64 + 64))
  }
  return addrs
}

function decodeString(hex) {
  if (!hex || hex === '0x' || hex.length < 4) return ''
  try {
    const data = hex.slice(2)
    const offset = Number(decodeUint(data, 0)) * 2
    const length = Number(BigInt('0x' + data.slice(offset, offset + 64)))
    const raw = data.slice(offset + 64, offset + 64 + length * 2)
    return Buffer.from(raw, 'hex').toString('utf8').replace(/\0/g, '')
  } catch {
    // bytes32 fallback
    try {
      const raw = hex.slice(2, 66)
      return Buffer.from(raw, 'hex').toString('utf8').replace(/\0/g, '').trim()
    } catch { return '' }
  }
}

function rayToApy(ray) {
  const r = Number(ray) / 1e27
  return (Math.pow(1 + r / 31536000, 31536000) - 1) * 100
}

async function fetchChain(chainName, cfg) {
  const { rpcs, pool } = cfg
  const markets = []

  // Step 1: get reserve list
  const listRes = await tryRpc(rpcs, {
    jsonrpc: '2.0', method: 'eth_call',
    params: [{ to: pool, data: '0xd1946dbc' }, 'latest'], id: 1,
  })
  const reserves = decodeAddressArray(listRes?.result)
  if (!reserves.length) return []

  // Step 2: batch getReserveData for all reserves
  const batch2 = reserves.map((addr, i) => ({
    jsonrpc: '2.0', method: 'eth_call',
    params: [{ to: pool, data: '0x35ea6a75' + pad(addr) }, 'latest'], id: i,
  }))
  const res2 = await tryRpc(rpcs, batch2)
  if (!res2) return []
  const reserveDataMap = {}
  for (const r of res2) {
    if (r?.result && r.result !== '0x' && r.result.length >= 962) {
      reserveDataMap[reserves[r.id]] = r.result.slice(2)
    }
  }

  // Parse reserve data to get aToken, debtToken, IRS addresses
  const parsed = []
  for (const addr of reserves) {
    const d = reserveDataMap[addr]
    if (!d) continue
    try {
      const liqRate = decodeUint(d, 2)
      const varRate = decodeUint(d, 4)
      const aToken = decodeAddr(d, 8)
      const varDebt = decodeAddr(d, 10)
      const irs = decodeAddr(d, 11)
      // Check isActive from configuration bitmap (bit 56)
      const config = decodeUint(d, 0)
      const isActive = (config >> 56n) & 1n
      const isFrozen = (config >> 57n) & 1n
      if (!isActive) continue
      const decimals = Number((config >> 48n) & 0xFFn) || 18
      parsed.push({ addr, liqRate, varRate, aToken, varDebt, irs, decimals, govFrozen: isFrozen === 1n })
    } catch { continue }
  }

  // Step 3: batch totalSupply calls + symbol calls
  const batch3 = []
  const callIndex = {}
  let idx = 0
  for (const p of parsed) {
    callIndex[p.addr] = { aTokenIdx: idx, varDebtIdx: idx + 1, symIdx: idx + 2 }
    batch3.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: p.aToken, data: '0x18160ddd' }, 'latest'], id: idx++ })
    batch3.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: p.varDebt, data: '0x18160ddd' }, 'latest'], id: idx++ })
    // symbol on underlying
    const sym = KNOWN_SYMBOLS[p.addr.toLowerCase()]
    if (!sym) {
      batch3.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: p.addr, data: '0x95d89b41' }, 'latest'], id: idx++ })
    } else {
      callIndex[p.addr].symIdx = -1 // skip
      callIndex[p.addr].knownSym = sym
    }
  }

  const res3 = await tryRpc(rpcs, batch3)
  const res3map = {}
  if (res3) for (const r of res3) res3map[r.id] = r.result

  // Step 4: batch IRM params per unique strategy
  const uniqueIRS = [...new Set(parsed.map(p => p.irs))]
  const irsCache = {}
  const batch4 = []
  let irsIdx = 0
  const irsIndexMap = {}
  for (const irs of uniqueIRS) {
    irsIndexMap[irs] = irsIdx
    batch4.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: irs, data: '0x54c365c6' }, 'latest'], id: irsIdx++ })
    batch4.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: irs, data: '0x0b3429a2' }, 'latest'], id: irsIdx++ })
    batch4.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: irs, data: '0xf4202409' }, 'latest'], id: irsIdx++ })
    batch4.push({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: irs, data: '0x37c24aa4' }, 'latest'], id: irsIdx++ })
  }
  const res4 = await tryRpc(rpcs, batch4)
  const res4map = {}
  if (res4) for (const r of res4) res4map[r.id] = r.result

  for (const irs of uniqueIRS) {
    const base = irsIndexMap[irs]
    const toNum = (h) => h && h !== '0x' ? Number(BigInt('0x' + h.slice(2).padStart(64, '0'))) / 1e27 * 100 : null
    irsCache[irs] = {
      optimal: toNum(res4map[base]),
      slope1:  toNum(res4map[base + 1]),
      slope2:  toNum(res4map[base + 2]),
      base:    toNum(res4map[base + 3]),
    }
  }

  // Step 5: get price oracle and batch asset prices
  const oracleRes = await tryRpc(rpcs, { jsonrpc:'2.0', method:'eth_call', params:[{ to: pool, data:'0xfca513a8' }, 'latest'], id:0 })
  const oracleAddr = oracleRes?.result?.length >= 42 ? '0x' + oracleRes.result.slice(-40) : null
  const priceMap = {}
  if (oracleAddr && oracleAddr !== '0x' + '0'.repeat(40)) {
    const priceBatch = parsed.map((p, i) => ({
      jsonrpc:'2.0', method:'eth_call',
      params:[{ to: oracleAddr, data: '0xb3596f07' + p.addr.replace('0x','').toLowerCase().padStart(64,'0') }, 'latest'],
      id: i,
    }))
    const priceRes = await tryRpc(rpcs, priceBatch)
    if (priceRes) for (const r of (Array.isArray(priceRes) ? priceRes : [priceRes])) {
      if (r?.result && r.result.length > 2) {
        priceMap[parsed[r.id]?.addr] = Number(BigInt(r.result)) / 1e8
      }
    }
  }

  // Assemble markets
  for (const p of parsed) {
    const ci = callIndex[p.addr]
    const aSupply = res3map[ci.aTokenIdx]
    const varDebt = res3map[ci.varDebtIdx]
    if (!aSupply || !varDebt) continue

    const supplyRaw = BigInt(aSupply)
    const debtRaw   = BigInt(varDebt)
    const utilization = supplyRaw > 0n ? Number(debtRaw * 10000n / supplyRaw) / 100 : 0

    const symHex = ci.symIdx >= 0 ? res3map[ci.symIdx] : null
    const symbol = ci.knownSym || decodeString(symHex) || p.addr.slice(0, 8)

    const irm = irsCache[p.irs] || {}
    // Fallback IRM if strategy doesn't expose constants (newer V3.2 strategies)
    const optimal = irm.optimal ?? getDefaultIRM(symbol).optimal
    const slope1  = irm.slope1  ?? getDefaultIRM(symbol).slope1
    const slope2  = irm.slope2  ?? getDefaultIRM(symbol).slope2
    const baseRate = irm.base   ?? getDefaultIRM(symbol).base

    const supplyApy = rayToApy(p.liqRate)
    const borrowApy = rayToApy(p.varRate)

    // Skip dust markets
    if (supplyRaw < BigInt('1000000')) continue

    markets.push({
      symbol: symbol.toUpperCase().replace(/\s/g, ''),
      chain: chainName,
      utilization: Math.min(utilization, 100),
      supplyApy,
      borrowApy,
      totalSupplyRaw: supplyRaw.toString(),
      totalDebtRaw:   debtRaw.toString(),
      decimals: p.decimals,
      priceUsd: priceMap[p.addr] ?? null,
      irm: { optimal, slope1, slope2, base: baseRate, type: getIRMType(symbol) },
      assetAddress: p.addr,
      govFrozen: p.govFrozen || false,
    })
  }

  return markets
}

// Per-token IRM params from Aave governance proposals (canonical, change only via governance vote)
const KNOWN_IRM = {
  USDC:    { optimal:90, base:0,   slope1:5.5,  slope2:60,  type:'stable'   },
  USDT:    { optimal:90, base:0,   slope1:5.5,  slope2:75,  type:'stable'   },
  DAI:     { optimal:80, base:0,   slope1:5,    slope2:75,  type:'stable'   },
  SDAI:    { optimal:80, base:0,   slope1:5,    slope2:75,  type:'stable'   },
  USDS:    { optimal:90, base:0,   slope1:5.5,  slope2:60,  type:'stable'   },
  GHO:     { optimal:90, base:1.5, slope1:3.5,  slope2:50,  type:'stable'   },
  LUSD:    { optimal:80, base:0,   slope1:4,    slope2:87,  type:'stable'   },
  FRAX:    { optimal:80, base:0,   slope1:4,    slope2:75,  type:'stable'   },
  PYUSD:   { optimal:90, base:0,   slope1:5,    slope2:75,  type:'stable'   },
  USDE:    { optimal:90, base:0,   slope1:5,    slope2:75,  type:'stable'   },
  SUSDE:   { optimal:90, base:0,   slope1:5,    slope2:75,  type:'stable'   },
  CRVUSD:  { optimal:80, base:0,   slope1:4,    slope2:75,  type:'stable'   },
  SUSD:    { optimal:80, base:0,   slope1:4,    slope2:100, type:'stable'   },
  EURC:    { optimal:90, base:0,   slope1:5,    slope2:60,  type:'stable'   },
  EURS:    { optimal:80, base:0,   slope1:4,    slope2:87,  type:'stable'   },
  AGEUR:   { optimal:80, base:0,   slope1:4,    slope2:75,  type:'stable'   },
  MAI:     { optimal:80, base:0,   slope1:4,    slope2:75,  type:'stable'   },
  USDBC:   { optimal:90, base:0,   slope1:5.5,  slope2:60,  type:'stable'   },
  USDC_E:  { optimal:90, base:0,   slope1:5.5,  slope2:60,  type:'stable'   },
  WETH:    { optimal:80, base:0,   slope1:3.3,  slope2:80,  type:'eth'      },
  ETH:     { optimal:80, base:0,   slope1:3.3,  slope2:80,  type:'eth'      },
  WSTETH:  { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  STETH:   { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  CBETH:   { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  RETH:    { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  WEETH:   { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  EZETH:   { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  RSETH:   { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  OSETH:   { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  FRXETH:  { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  METH:    { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  PUFETH:  { optimal:45, base:0,   slope1:4.5,  slope2:80,  type:'eth'      },
  WBTC:    { optimal:45, base:0,   slope1:4,    slope2:300, type:'btc'      },
  TBTC:    { optimal:45, base:0,   slope1:4,    slope2:300, type:'btc'      },
  CBBTC:   { optimal:45, base:0,   slope1:4,    slope2:300, type:'btc'      },
  LBTC:    { optimal:45, base:0,   slope1:4,    slope2:300, type:'btc'      },
  LINK:    { optimal:45, base:0,   slope1:4,    slope2:300, type:'volatile' },
  AAVE:    { optimal:45, base:0,   slope1:7,    slope2:300, type:'volatile' },
  UNI:     { optimal:45, base:0,   slope1:4,    slope2:300, type:'volatile' },
  MKR:     { optimal:45, base:0,   slope1:7,    slope2:300, type:'volatile' },
  SNX:     { optimal:80, base:3,   slope1:12,   slope2:100, type:'volatile' },
  CRV:     { optimal:70, base:3,   slope1:14,   slope2:300, type:'volatile' },
  BAL:     { optimal:80, base:5,   slope1:22,   slope2:150, type:'volatile' },
  ENS:     { optimal:45, base:0,   slope1:7,    slope2:300, type:'volatile' },
  RPL:     { optimal:45, base:0,   slope1:7,    slope2:300, type:'volatile' },
  OP:      { optimal:45, base:0,   slope1:4,    slope2:300, type:'volatile' },
  ARB:     { optimal:45, base:0,   slope1:4,    slope2:300, type:'volatile' },
  GNO:     { optimal:45, base:0,   slope1:7,    slope2:300, type:'volatile' },
}

function getIRMType(sym) {
  const s = sym.toUpperCase().replace(/[.\-]/g, '')
  if (KNOWN_IRM[s]) return KNOWN_IRM[s].type
  if (/USD|DAI|FRAX|LUSD|GHO|SUSD|TUSD|BUSD|PYUSD|USDE|CRVUSD|AGEUR|EURS|JEUR/.test(s)) return 'stable'
  if (/ETH|STETH|WSTETH|CBETH|RETH|FRXETH|WEETH|OSETH|EZETH|RSETH|METH/.test(s)) return 'eth'
  if (/BTC|TBTC|CBBTC|LBTC/.test(s)) return 'btc'
  return 'volatile'
}

function getDefaultIRM(sym) {
  const s = sym.toUpperCase().replace(/[.\-]/g, '')
  if (KNOWN_IRM[s]) return KNOWN_IRM[s]
  const TYPE_DEFAULTS = {
    stable:   { optimal:90, slope1:5.5,  slope2:60,  base:0 },
    eth:      { optimal:80, slope1:3.3,  slope2:80,  base:0 },
    btc:      { optimal:45, slope1:4,    slope2:300, base:0 },
    volatile: { optimal:45, slope1:4,    slope2:300, base:0 },
  }
  return TYPE_DEFAULTS[getIRMType(sym)]
}

let cache = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 60 seconds

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache)
  }

  try {
    const results = await Promise.allSettled(
      Object.entries(CHAINS).map(([name, cfg]) => fetchChain(name, cfg))
    )

    const allMarkets = []
    for (const r of results) {
      if (r.status === 'fulfilled') allMarkets.push(...r.value)
    }

    const payload = {
      markets: allMarkets,
      fetchedAt: new Date().toISOString(),
      chainCount: new Set(allMarkets.map(m => m.chain)).size,
    }

    cache = payload
    cacheTime = Date.now()

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    res.status(200).json(payload)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
