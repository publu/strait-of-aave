const SUBGRAPHS = {
  Ethereum: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
  Arbitrum: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-arbitrum',
  Optimism: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-optimism',
  Polygon:  'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon',
  Avalanche:'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-avalanche',
  Gnosis:   'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-gnosis',
  BNB:      'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-bnb',
  Base:     'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-base',
  Scroll:   null,
}

async function gql(url, query) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = await res.json()
    if (j.errors) throw new Error(j.errors[0].message)
    return j.data
  } finally {
    clearTimeout(t)
  }
}

function rawToAmt(raw, decimals) {
  try {
    const d = parseInt(decimals) || 18
    const n = BigInt(raw || '0')
    const div = BigInt(10) ** BigInt(d)
    const whole = n / div
    const rem   = n % div
    return Number(whole) + Number(rem) / 10 ** d
  } catch { return 0 }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { chain, reserve } = req.query
  const url = SUBGRAPHS[chain]

  if (!url) {
    return res.status(200).json({ depositors: [], borrowers: [], noData: true })
  }

  const r = (reserve || '').toLowerCase()

  try {
    // Round 1: top depositors + top borrowers
    const d1 = await gql(url, `{
      depositors: userReserves(
        where: { reserve: "${r}", currentATokenBalance_gt: "0" }
        orderBy: currentATokenBalance orderDirection: desc first: 10
      ) {
        user { id }
        currentATokenBalance
        scaledATokenBalance
        reserve { decimals liquidityIndex }
      }
      borrowers: userReserves(
        where: { reserve: "${r}", currentVariableDebt_gt: "0" }
        orderBy: currentVariableDebt orderDirection: desc first: 10
      ) {
        user { id }
        currentVariableDebt
        reserve { decimals }
      }
    }`)

    const decimals = parseInt(
      d1.depositors?.[0]?.reserve?.decimals ||
      d1.borrowers?.[0]?.reserve?.decimals || '18'
    )
    const liquidityIndex = BigInt(d1.depositors?.[0]?.reserve?.liquidityIndex || '1000000000000000000000000000')
    const RAY = BigInt('1000000000000000000000000000')

    const depositors = (d1.depositors || []).map(u => {
      const current  = BigInt(u.currentATokenBalance || '0')
      const scaled   = BigInt(u.scaledATokenBalance  || '0')
      // principal = scaledBalance * currentLiquidityIndex / RAY
      // interest ≈ current - principal (approximate; exact would need deposit-time index)
      const principal = scaled * liquidityIndex / RAY
      const interestRaw = current > principal ? current - principal : 0n
      const interestPct = current > 0n
        ? Number(interestRaw * 10000n / current) / 100
        : 0
      return {
        address:  u.user.id,
        balance:  rawToAmt(u.currentATokenBalance, decimals),
        interestPct,
      }
    })

    const borrowers = (d1.borrowers || []).map(u => ({
      address: u.user.id,
      debt:    rawToAmt(u.currentVariableDebt, decimals),
    }))

    // Round 2: collateral for top borrowers
    if (borrowers.length > 0) {
      const ids = borrowers.map(b => `"${b.address}"`).join(',')
      const d2 = await gql(url, `{
        userReserves(
          where: { user_in: [${ids}], usageAsCollateralEnabledOnUser: true, currentATokenBalance_gt: "0" }
          first: 100 orderBy: currentATokenBalance orderDirection: desc
        ) {
          user { id }
          reserve { symbol decimals }
          currentATokenBalance
        }
      }`)

      const collMap = {}
      for (const ur of (d2.userReserves || [])) {
        const uid = ur.user.id
        if (!collMap[uid]) collMap[uid] = []
        collMap[uid].push({
          symbol:  ur.reserve.symbol.toUpperCase(),
          balance: rawToAmt(ur.currentATokenBalance, ur.reserve.decimals),
        })
      }
      for (const b of borrowers) {
        b.collateral = (collMap[b.address] || []).slice(0, 6)
      }
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60')
    res.status(200).json({ depositors, borrowers, decimals })
  } catch (e) {
    res.status(200).json({ depositors: [], borrowers: [], error: e.message })
  }
}
