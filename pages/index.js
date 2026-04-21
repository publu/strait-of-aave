import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const TYPE_COLORS = { stable:'#00e87a', eth:'#00d4ff', btc:'#ff8c42', volatile:'#9b59ff' }
const TYPE_LABELS = { stable:'STABLE', eth:'ETH/LST', btc:'BTC', volatile:'VOLATILE' }

const AAVE_MARKET = {
  Ethereum: 'proto_mainnet_v3',
  Arbitrum: 'proto_arbitrum_v3',
  Base:     'proto_base_v3',
  Optimism: 'proto_optimism_v3',
  Polygon:  'proto_polygon_v3',
  Avalanche:'proto_avalanche_v3',
  Gnosis:   'proto_gnosis_v3',
  BNB:      'proto_bnb_v3',
  Scroll:   'proto_scroll_v3',
  Mantle:   'proto_mantle_v3',
  MegaETH:  'proto_megaeth_v3',
  zkSync:   'proto_zksync_v3',
  Linea:    'proto_linea_v3',
  Metis:    'proto_metis_v3',
  Sonic:    'proto_sonic_v3',
  Celo:     'proto_celo_v3',
  Soneium:  'proto_soneium_v3',
  Ink:      'proto_ink_v3',
}

function aaveUrl(chain, assetAddress) {
  const market = AAVE_MARKET[chain] || 'proto_mainnet_v3'
  return `https://app.aave.com/reserve-overview/?underlyingAsset=${assetAddress}&marketName=${market}`
}

const CHAIN_CFG = {
  Ethereum:  { short:'ETH',  color:'#627EEA', bg:'rgba(99,126,234,.2)',  brd:'rgba(99,126,234,.5)'  },
  Arbitrum:  { short:'ARB',  color:'#28A0F0', bg:'rgba(40,160,240,.2)',  brd:'rgba(40,160,240,.5)'  },
  Base:      { short:'BASE', color:'#0052FF', bg:'rgba(0,82,255,.2)',    brd:'rgba(0,82,255,.5)'    },
  Optimism:  { short:'OP',   color:'#FF0420', bg:'rgba(255,4,32,.15)',   brd:'rgba(255,4,32,.4)'    },
  Polygon:   { short:'POL',  color:'#8247E5', bg:'rgba(130,71,229,.2)',  brd:'rgba(130,71,229,.5)'  },
  Avalanche: { short:'AVAX', color:'#E84142', bg:'rgba(232,65,66,.2)',   brd:'rgba(232,65,66,.5)'   },
  Gnosis:    { short:'GNO',  color:'#00A6C4', bg:'rgba(0,166,196,.2)',   brd:'rgba(0,166,196,.4)'   },
  BNB:       { short:'BNB',  color:'#F0B90B', bg:'rgba(240,185,11,.18)', brd:'rgba(240,185,11,.45)' },
  Scroll:    { short:'SCR',  color:'#EeCE90', bg:'rgba(238,206,144,.15)',brd:'rgba(238,206,144,.35)'},
  Mantle:    { short:'MNT',  color:'#00D4AA', bg:'rgba(0,212,170,.18)',  brd:'rgba(0,212,170,.4)'   },
  MegaETH:   { short:'METH', color:'#FF6B35', bg:'rgba(255,107,53,.18)', brd:'rgba(255,107,53,.4)'  },
  zkSync:    { short:'ZKS',  color:'#8B7CF6', bg:'rgba(139,124,246,.2)', brd:'rgba(139,124,246,.4)' },
  Linea:     { short:'LNA',  color:'#61DFFF', bg:'rgba(97,223,255,.15)', brd:'rgba(97,223,255,.35)' },
  Metis:     { short:'MTS',  color:'#00DACC', bg:'rgba(0,218,204,.15)',  brd:'rgba(0,218,204,.35)'  },
  Sonic:     { short:'SON',  color:'#FE7D00', bg:'rgba(254,125,0,.18)',  brd:'rgba(254,125,0,.4)'   },
  Celo:      { short:'CELO', color:'#FCFF52', bg:'rgba(252,255,82,.12)', brd:'rgba(252,255,82,.35)' },
  Soneium:   { short:'SNM',  color:'#A78BFA', bg:'rgba(167,139,250,.18)',brd:'rgba(167,139,250,.4)' },
  Ink:       { short:'INK',  color:'#7F5AF0', bg:'rgba(127,90,240,.18)', brd:'rgba(127,90,240,.4)'  },
}

function chainCfg(name) {
  return CHAIN_CFG[name] || { short: name.slice(0,4).toUpperCase(), color:'#888', bg:'rgba(136,136,136,.15)', brd:'rgba(136,136,136,.3)' }
}

function usd(n) {
  if (!n) return '$—'
  if (n >= 1e9) return '$'+(n/1e9).toFixed(2)+'B'
  if (n >= 1e6) return '$'+(n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return '$'+(n/1e3).toFixed(0)+'K'
  return '$'+n.toFixed(0)
}
function pct(n, d=2) { return (n||0).toFixed(d)+'%' }

function fmtAmt(n, sym='') {
  if (!n || isNaN(n)) return '—'
  const s = n >= 1e9 ? (n/1e9).toFixed(2)+'B'
    : n >= 1e6 ? (n/1e6).toFixed(2)+'M'
    : n >= 1e3 ? (n/1e3).toFixed(1)+'K'
    : n.toFixed(2)
  return sym ? s+' '+sym : s
}

function utilCls(u) {
  if (u >= 90) return 'crit'
  if (u >= 80) return 'high'
  if (u >= 60) return 'med'
  return 'low'
}

function utilColor(u) {
  if (u >= 90) return 'var(--red)'
  if (u >= 80) return 'var(--org)'
  if (u >= 60) return 'var(--yel)'
  return 'var(--green)'
}

function HormuzMap({ markets }) {
  const W = 900, H = 270
  const boatsRef   = useRef([])
  const lastAddRef = useRef(0)
  const idRef      = useRef(100)
  const [renderBoats, setRenderBoats] = useState([])

  const govFrozenMarkets = markets.filter(m => m.govFrozen)
  const stuckMarkets = markets.filter(m => !m.govFrozen && m.utilization >= 99).slice(0, 12)
  const activeMarkets = markets.filter(m => !m.govFrozen && m.utilization > 0 && m.utilization < 99)

  // Two lanes with 42px gap so labels don't overlap
  const LANE_OUT = 120  // left to right (deposits flowing in)
  const LANE_IN  = 162  // right to left (borrows flowing out)
  const HULL = 'M 18,0 L 12,-4 L -14,-4 L -18,-2 L -18,2 L -14,4 L 12,4 Z'
  const BRIDGE = 'M -12,-2.5 L -5,-2.5 L -5,2.5 L -12,2.5 Z'

  useEffect(() => {
    // seed boats on both lanes
    boatsRef.current = [
      { id:0, x:80,   y:LANE_OUT, speed:0.9,  dir:1  },
      { id:1, x:380,  y:LANE_IN,  speed:0.75, dir:-1 },
      { id:2, x:640,  y:LANE_OUT, speed:1.05, dir:1  },
      { id:3, x:900,  y:LANE_IN,  speed:0.85, dir:-1 },
      { id:4, x:1150, y:LANE_OUT, speed:0.95, dir:1  },
    ]
    lastAddRef.current = Date.now() - 4500
    let raf
    const frame = () => {
      const now = Date.now()
      boatsRef.current = boatsRef.current
        .map(b => ({ ...b, x: b.x + b.speed * b.dir }))
        .filter(b => b.x > -60 && b.x < W + 60)
      if (now - lastAddRef.current >= 5000) {
        lastAddRef.current = now
        const goRight = Math.random() > 0.5
        boatsRef.current.push({
          id: idRef.current++,
          x:  goRight ? -30 : W + 30,
          y:  goRight ? LANE_OUT : LANE_IN,
          speed: 0.8 + Math.random() * 0.35,
          dir: goRight ? 1 : -1,
        })
      }
      setRenderBoats([...boatsRef.current])
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Spread stuck ships across the channel between the two lanes
  const stuckPos = stuckMarkets.map((m, i) => ({
    market: m,
    x: 200 + (i % 6) * 90,
    y: LANE_OUT + 10 + Math.floor(i / 6) * 22,
    rot: (i % 5 - 2) * 18,
  }))

  // Gov-frozen ships: render off to the side (beached), amber color
  const govFrozenPos = govFrozenMarkets.slice(0, 10).map((m, i) => ({
    market: m,
    x: 60 + (i % 5) * 80,
    y: LANE_OUT - 28 - Math.floor(i / 5) * 20,
    rot: (i % 3 - 1) * 25,
  }))

  // Narrowest point x
  const NX = 530

  return (
    <div style={{width:'100%',background:'#04080e',borderBottom:'1px solid var(--brd)',overflow:'hidden',position:'relative'}}>
      {/* Stat panels */}
      <div style={{
        position:'absolute',top:12,left:12,background:'rgba(4,12,24,.85)',
        border:'1px solid #0e2038',padding:'10px 14px',fontFamily:'monospace',zIndex:2,
      }}>
        <div style={{fontSize:8,color:'#304858',letterSpacing:2,marginBottom:6}}>LIVE MARKETS</div>
        <div style={{fontSize:22,fontWeight:'bold',color:'var(--cyan)',lineHeight:1}}>{markets.length}</div>
        <div style={{fontSize:9,color:'#304858',marginTop:4}}>{activeMarkets.length} flowing · {stuckMarkets.length} util-stuck · {govFrozenMarkets.length} gov-frozen</div>
      </div>
      <div style={{
        position:'absolute',top:12,right:12,background:'rgba(4,12,24,.85)',
        border:'1px solid #0e2038',padding:'10px 14px',fontFamily:'monospace',zIndex:2,textAlign:'right',
      }}>
        <div style={{fontSize:8,color:'#304858',letterSpacing:2,marginBottom:4}}>AT 100% UTIL</div>
        <div style={{fontSize:22,fontWeight:'bold',color: stuckMarkets.length > 0 ? 'var(--red)' : 'var(--green)',lineHeight:1}}>{stuckMarkets.length}</div>
        <div style={{fontSize:9,color:'#304858',marginTop:4}}>withdrawals frozen</div>
        {govFrozenMarkets.length > 0 && (
          <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid #0e2038'}}>
            <div style={{fontSize:8,color:'#304858',letterSpacing:2,marginBottom:2}}>GOV FROZEN</div>
            <div style={{fontSize:16,fontWeight:'bold',color:'#f59e0b',lineHeight:1}}>{govFrozenMarkets.length}</div>
            <div style={{fontSize:9,color:'#304858',marginTop:2}}>by governance</div>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid slice" style={{display:'block'}}>
        <defs>
          {/* Glow filter for lane lines */}
          <filter id="glow" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Water */}
        <rect width={W} height={H} fill="#04080e"/>
        {/* Water channel highlight */}
        <rect x={0} y={100} width={W} height={90} fill="#050f1c" opacity={0.7}/>

        {/* LEND coastline — top */}
        <path
          d="M 0,0 L 900,0 L 900,78 C 840,70 780,80 710,92 C 660,100 620,95 575,103 C 545,108 520,105 495,109 C 470,105 445,98 410,94 C 365,88 310,86 240,81 C 170,76 90,75 30,80 C 14,81 4,79 0,79 Z"
          fill="#0d1a08" stroke="#162510" strokeWidth={1.5}
        />
        <text x={36} y={46} fontSize={9} fill="#1e2e12" letterSpacing={4} fontFamily="monospace">LEND</text>

        {/* Qeshm island */}
        <ellipse cx={390} cy={97} rx={22} ry={6} fill="#0f1e0a" stroke="#162510" strokeWidth={1}/>
        <text x={390} y={99} textAnchor="middle" fontSize={6} fill="#1a2810" fontFamily="monospace">QESHM</text>

        {/* Hormuz island at narrowest */}
        <ellipse cx={NX} cy={115} rx={11} ry={5} fill="#0f1e0a" stroke="#162510" strokeWidth={1}/>
        <text x={NX} y={117} textAnchor="middle" fontSize={5.5} fill="#1a2810" fontFamily="monospace">HORMUZ</text>

        {/* BORROW coastline — bottom */}
        <path
          d="M 0,270 L 900,270 L 900,202 C 840,208 780,200 710,192 C 660,187 620,193 575,187 C 545,183 520,187 495,182 C 470,187 445,194 410,198 C 365,204 310,207 240,209 C 170,211 90,209 30,205 C 14,204 4,203 0,203 Z"
          fill="#0d1a08" stroke="#162510" strokeWidth={1.5}
        />
        <text x={36} y={242} fontSize={9} fill="#1e2e12" letterSpacing={3} fontFamily="monospace">BORROW</text>
        <text x={660} y={242} fontSize={9} fill="#1e2e12" letterSpacing={2} fontFamily="monospace">BORROW</text>

        {/* Gulf labels in water */}
        <text x={80} y={148} fontSize={9} fill="#071424" letterSpacing={2} fontFamily="monospace">GULF OF ETHEREUM</text>
        <text x={690} y={148} fontSize={8} fill="#071424" letterSpacing={1} fontFamily="monospace">GULF OF OMAN</text>

        {/* Outbound lane line (→) */}
        <line x1={0} y1={LANE_OUT} x2={W} y2={LANE_OUT} stroke="rgba(0,190,230,.08)" strokeWidth={8}/>
        <line x1={0} y1={LANE_OUT} x2={W} y2={LANE_OUT} stroke="rgba(0,190,230,.25)" strokeWidth={1} strokeDasharray="24,8" filter="url(#glow)"/>
        <text x={W-8} y={LANE_OUT-6} textAnchor="end" fontSize={7} fill="rgba(0,190,230,.4)" fontFamily="monospace">OUTBOUND →</text>

        {/* Inbound lane line (←) */}
        <line x1={0} y1={LANE_IN} x2={W} y2={LANE_IN} stroke="rgba(0,190,230,.08)" strokeWidth={8}/>
        <line x1={0} y1={LANE_IN} x2={W} y2={LANE_IN} stroke="rgba(0,190,230,.2)" strokeWidth={1} strokeDasharray="24,8" filter="url(#glow)"/>
        <text x={8} y={LANE_IN+14} fontSize={7} fill="rgba(0,190,230,.4)" fontFamily="monospace">← INBOUND</text>

        {/* Narrowest point marker */}
        <line x1={NX} y1={110} x2={NX} y2={180} stroke="rgba(255,210,77,.18)" strokeWidth={0.8} strokeDasharray="3,3"/>
        <text x={NX} y={H-6} textAnchor="middle" fontSize={7} fill="rgba(255,210,77,.35)" fontFamily="monospace" letterSpacing={1}>NARROWEST POINT — KINK THRESHOLD</text>

        {/* Moving ships on lanes */}
        {renderBoats.map(b => (
          <g key={b.id} transform={`translate(${b.x.toFixed(1)},${b.y}) scale(${b.dir},1)`} style={{cursor:'crosshair'}}>
            <title>{`Liquidity in transit\nHeading: ${b.dir > 0 ? 'Outbound →' : '← Inbound'}`}</title>
            <line x1={-19} y1={0} x2={-48} y2={0} stroke="rgba(0,190,230,.1)" strokeWidth={5}/>
            <path d={HULL} fill="rgba(0,190,230,.22)" stroke="#00c0e8" strokeWidth={1.2}/>
            <path d={BRIDGE} fill="rgba(0,190,230,.4)" stroke="#00c0e8" strokeWidth={0.8}/>
          </g>
        ))}

        {/* Util-stuck ships: red, in the channel */}
        {stuckPos.map(({ market, x, y, rot }) => (
          <g key={market.symbol + market.chain}>
            <text x={x} y={y - 13} textAnchor="middle" fontSize={7} fill="#ff3a5c" fontFamily="monospace" fontWeight="bold">{market.symbol}</text>
            <g transform={`translate(${x},${y}) rotate(${rot})`}>
              <line x1={-19} y1={0} x2={-44} y2={0} stroke="rgba(255,58,92,.08)" strokeWidth={5}/>
              <path d={HULL} fill="rgba(255,58,92,.18)" stroke="#ff3a5c" strokeWidth={1.2}/>
              <path d={BRIDGE} fill="rgba(255,58,92,.32)" stroke="#ff3a5c" strokeWidth={0.8}/>
              <circle cx={3} cy={0} r={2} fill="#ff3a5c" opacity={0.85}/>
            </g>
          </g>
        ))}
        {/* Gov-frozen ships: amber, beached above the LEND coastline */}
        {govFrozenPos.map(({ market, x, y, rot }) => (
          <g key={'gf-' + market.symbol + market.chain}>
            <text x={x} y={y - 10} textAnchor="middle" fontSize={6} fill="#f59e0b" fontFamily="monospace" fontWeight="bold">{market.symbol}</text>
            <g transform={`translate(${x},${y}) rotate(${rot})`}>
              <path d={HULL} fill="rgba(245,158,11,.15)" stroke="#f59e0b" strokeWidth={1} opacity={0.7}/>
              <path d={BRIDGE} fill="rgba(245,158,11,.25)" stroke="#f59e0b" strokeWidth={0.7} opacity={0.7}/>
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}

function computeRate(util, irm) {
  const { optimal=80, base=0, slope1=4, slope2=75 } = irm || {}
  if (util <= optimal) return base + slope1 * (util / optimal)
  return base + slope1 + slope2 * ((util - optimal) / (100 - optimal))
}

function IRMCurve({ util, irm }) {
  const W = 200, H = 56
  const { optimal=80, base=0, slope1=4, slope2=75 } = irm || {}
  const maxR = base + slope1 + slope2 || 1
  const pts = []
  for (let u = 0; u <= 100; u += 2) {
    const r = computeRate(u, { optimal, base, slope1, slope2 })
    pts.push(`${(u/100*W).toFixed(1)},${(H - (r/maxR)*(H-6) - 3).toFixed(1)}`)
  }
  const cx = util / 100 * W
  const cy = H - (computeRate(util, { optimal, base, slope1, slope2 }) / maxR) * (H-6) - 3
  const kx = optimal / 100 * W
  const dot = utilColor(util)
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:'block'}}>
      <line x1={kx} y1={0} x2={kx} y2={H} stroke="#2a2a40" strokeWidth={1} strokeDasharray="3,3"/>
      <polyline points={pts.join(' ')} fill="none" stroke="#2a2a50" strokeWidth={1.5}/>
      <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={3} fill={dot}/>
    </svg>
  )
}

const KNOWN_DEC = { USDC:6, USDT:6, WBTC:8, USDBC:6, USDbC:6, GHO:18 }

function HoldersPanel({ m }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const dec = KNOWN_DEC[m.symbol] || 18
  const totalSupply = Number(BigInt(m.totalSupplyRaw || '0')) / 10**dec
  const totalDebt   = Number(BigInt(m.totalDebtRaw   || '0')) / 10**dec

  useEffect(() => {
    setLoading(true); setData(null)
    fetch(`/api/holders?chain=${encodeURIComponent(m.chain)}&reserve=${encodeURIComponent(m.assetAddress)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setData({ error:'fetch failed' }); setLoading(false) })
  }, [m.chain, m.assetAddress])

  const decimals = data?.decimals || dec

  if (loading) return (
    <div style={{padding:'10px 0',color:'var(--dim)',fontSize:10,display:'flex',gap:7,alignItems:'center'}}>
      <div style={{width:8,height:8,border:'1px solid var(--brd2)',borderTopColor:'var(--aave)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      Querying subgraph…
    </div>
  )
  if (data?.noData) return <div style={{padding:'10px 0',color:'var(--dim)',fontSize:10}}>No subgraph for {m.chain}</div>
  if (data?.error || !data) return <div style={{padding:'10px 0',color:'var(--red)',fontSize:10}}>Subgraph unavailable</div>

  const Row = ({ rank, addr, amount, share, color, collateral }) => (
    <div style={{marginBottom: collateral ? 6 : 0}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:'1px solid rgba(34,34,51,.4)',gap:6}}>
        <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
          <span style={{color:'var(--dim)',fontSize:9,width:13,flexShrink:0}}>{rank}</span>
          <span style={{fontSize:9,color:'var(--text)',fontFamily:'monospace'}}>{addr.slice(0,6)}…{addr.slice(-4)}</span>
        </div>
        <div style={{display:'flex',gap:9,flexShrink:0,alignItems:'center'}}>
          <span style={{fontSize:9,color:'var(--dim)'}}>{share.toFixed(1)}%</span>
          <span style={{fontSize:10,color,fontWeight:'bold'}}>{fmtAmt(amount)} {m.symbol}</span>
        </div>
      </div>
      {collateral?.length > 0 && (
        <div style={{display:'flex',gap:3,flexWrap:'wrap',paddingLeft:18,paddingTop:3,paddingBottom:2}}>
          <span style={{fontSize:8,color:'var(--dim)'}}>collateral:</span>
          {collateral.map(c => (
            <span key={c.symbol} style={{fontSize:8,padding:'1px 5px',background:'rgba(155,89,255,.12)',border:'1px solid rgba(155,89,255,.28)',color:'var(--pur)',borderRadius:2}}>{c.symbol}</span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{paddingTop:11,borderTop:'1px solid var(--brd)'}}>
      <div style={{marginBottom:11}}>
        <div style={{fontSize:9,letterSpacing:2,color:'var(--green)',marginBottom:5,display:'flex',justifyContent:'space-between'}}>
          <span>TOP DEPOSITORS</span>
          <span style={{color:'var(--dim)',letterSpacing:0}}>earning {pct(m.supplyApy,2)} APY</span>
        </div>
        {data.depositors.length === 0
          ? <div style={{color:'var(--dim)',fontSize:10}}>No data</div>
          : data.depositors.map((d,i) => (
            <Row key={d.address} rank={i+1} addr={d.address}
              amount={d.balance} share={totalSupply > 0 ? d.balance/totalSupply*100 : 0}
              color="var(--green)"
            />
          ))
        }
      </div>
      <div>
        <div style={{fontSize:9,letterSpacing:2,color:'var(--red)',marginBottom:5,display:'flex',justifyContent:'space-between'}}>
          <span>TOP BORROWERS</span>
          <span style={{color:'var(--dim)',letterSpacing:0}}>paying {pct(m.borrowApy,2)} APY</span>
        </div>
        {data.borrowers.length === 0
          ? <div style={{color:'var(--dim)',fontSize:10}}>No data</div>
          : data.borrowers.map((b,i) => (
            <Row key={b.address} rank={i+1} addr={b.address}
              amount={b.debt} share={totalDebt > 0 ? b.debt/totalDebt*100 : 0}
              color="var(--red)" collateral={b.collateral}
            />
          ))
        }
      </div>
    </div>
  )
}

function MarketCard({ m, sort }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = chainCfg(m.chain)
  const tc  = TYPE_COLORS[m.irm?.type] || '#888'
  const tl  = TYPE_LABELS[m.irm?.type] || 'OTHER'
  const rateAt100 = computeRate(100, m.irm)
  const leftBorderColor = utilColor(m.utilization)
  const hl = (field) => sort === field ? {color:'var(--cyan)',textShadow:'0 0 8px rgba(0,212,255,.6)'} : {}

  return (
    <div style={{
      background:'var(--bg2)', padding:'15px', position:'relative',
      borderLeft:`3px solid ${leftBorderColor}`, transition:'background .15s',
    }}
    onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
    onMouseLeave={e=>e.currentTarget.style.background='var(--bg2)'}
    >
      {/* IRM type label top-right */}
      <div style={{position:'absolute',top:7,right:9,fontSize:8,color:tc,letterSpacing:1,opacity:.8}}>{tl}</div>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:11}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img
            src={`https://raw.githubusercontent.com/reddavis/Crypto-Icons-API/refs/heads/master/public/svg/icon/${m.symbol.toLowerCase()}.svg`}
            width={22} height={22}
            style={{borderRadius:'50%',flexShrink:0}}
            onError={e=>{e.currentTarget.style.display='none'}}
          />
          <span style={{fontSize:15,fontWeight:'bold',color:'#fff'}}>{m.symbol}</span>
          <span style={{
            fontSize:8,padding:'2px 6px',borderRadius:2,letterSpacing:1,
            background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.brd}`,
          }}>{cfg.short}</span>
          <a
            href={aaveUrl(m.chain, m.assetAddress)}
            target="_blank" rel="noopener noreferrer"
            style={{fontSize:10,color:'var(--aave)',letterSpacing:1,textDecoration:'none',fontWeight:'bold',border:'1px solid rgba(180,100,255,.4)',borderRadius:3,padding:'2px 6px',background:'rgba(180,100,255,.1)'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(180,100,255,.25)';e.currentTarget.style.borderColor='var(--aave)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(180,100,255,.1)';e.currentTarget.style.borderColor='rgba(180,100,255,.4)'}}
          >↗ AAVE</a>
        </div>
        <span style={{fontSize:17,fontWeight:'bold',color:utilColor(m.utilization),...hl('util'),transition:'text-shadow .2s'}}>
          {pct(m.utilization,1)}
        </span>
      </div>

      {/* Utilization bar */}
      <div style={{marginBottom:11}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:9,color:'var(--dim)'}}>
          <span>UTILIZATION</span>
          <span style={{color: (100-m.utilization)<5 ? 'var(--red)' : (100-m.utilization)<20 ? 'var(--yel)' : 'var(--green)'}}>
            {(100 - m.utilization).toFixed(1)}% available
          </span>
        </div>
        <div style={{height:5,background:'var(--bg4)',borderRadius:1,position:'relative',overflow:'visible'}}>
          <div style={{
            height:'100%',borderRadius:1,width:`${Math.min(m.utilization,100).toFixed(2)}%`,
            background: m.utilization>=90
              ? 'linear-gradient(90deg,var(--org),var(--red))'
              : m.utilization>=80
              ? 'linear-gradient(90deg,var(--yel),var(--org))'
              : m.utilization>=60
              ? 'linear-gradient(90deg,#88cc44,var(--yel))'
              : 'var(--green)',
          }}/>
          {/* kink marker */}
          <div style={{
            position:'absolute',top:-3,left:`${m.irm?.optimal||80}%`,
            width:1,height:11,background:'var(--brd2)',
          }}>
            <div style={{
              position:'absolute',top:10,left:'50%',transform:'translateX(-50%)',
              fontSize:8,color:'var(--dim)',whiteSpace:'nowrap',
            }}>{m.irm?.optimal||80}%</div>
          </div>
        </div>
      </div>

      {/* Rates */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:11}}>
        <div style={{borderRadius:3,padding:'4px 5px',transition:'background .2s',...(sort==='supply'?{background:'rgba(0,212,255,.07)',outline:'1px solid rgba(0,212,255,.25)'}:{})}}>
          <div style={{fontSize:9,letterSpacing:1,marginBottom:2,...(sort==='supply'?{color:'var(--cyan)'}:{color:'var(--dim)'})}}>SUPPLY APY</div>
          <div style={{fontSize:13,fontWeight:'bold',color:'var(--green)',...hl('supply')}}>{pct(m.supplyApy,2)}</div>
        </div>
        <div style={{borderRadius:3,padding:'4px 5px',transition:'background .2s',...(sort==='borrow'?{background:'rgba(0,212,255,.07)',outline:'1px solid rgba(0,212,255,.25)'}:{})}}>
          <div style={{fontSize:9,letterSpacing:1,marginBottom:2,...(sort==='borrow'?{color:'var(--cyan)'}:{color:'var(--dim)'})}}>BORROW APY</div>
          <div style={{fontSize:13,fontWeight:'bold',color:'var(--red)',...hl('borrow')}}>{pct(m.borrowApy,2)}</div>
        </div>
        <div style={{borderRadius:3,padding:'4px 5px'}}>
          <div style={{fontSize:9,color:'var(--dim)',letterSpacing:1,marginBottom:2}}>@100% UTIL</div>
          <div style={{fontSize:13,fontWeight:'bold',color: m.utilization>=90?'var(--red)':'var(--dim)'}}>{pct(rateAt100,1)}</div>
        </div>
      </div>

      {/* IRM Curve */}
      <div style={{borderTop:'1px solid var(--brd)',paddingTop:9}}>
        <div style={{fontSize:9,color:tc,letterSpacing:1,marginBottom:5}}>■ {tl} IRM CURVE</div>
        <IRMCurve util={m.utilization} irm={m.irm}/>
        <div style={{display:'flex',gap:10,marginTop:4,fontSize:9,color:'var(--dim)',flexWrap:'wrap'}}>
          <span>OPT <span style={{color:'var(--text)'}}>{m.irm?.optimal??'—'}%</span></span>
          <span>S1 <span style={{color:'var(--text)'}}>{m.irm?.slope1?.toFixed(1)??'—'}%</span></span>
          <span>S2 <span style={{color:'var(--text)'}}>{m.irm?.slope2?.toFixed(0)??'—'}%</span></span>
          <span>BASE <span style={{color:'var(--text)'}}>{m.irm?.base?.toFixed(1)??'0'}%</span></span>
        </div>
      </div>

      {/* Expand toggle */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{marginTop:10,paddingTop:8,borderTop:'1px solid var(--brd)',textAlign:'center',
          fontSize:9,letterSpacing:1,color:'var(--dim)',cursor:'pointer',userSelect:'none'}}
        onMouseEnter={e=>e.currentTarget.style.color='var(--aave)'}
        onMouseLeave={e=>e.currentTarget.style.color='var(--dim)'}
      >
        {expanded ? '▲ COLLAPSE' : '▼ TOP HOLDERS'}
      </div>

      {expanded && <HoldersPanel m={m}/>}
    </div>
  )
}

export default function Home() {
  const [markets, setMarkets]     = useState([])
  const [status, setStatus]       = useState('loading') // loading | live | error
  const [fetchedAt, setFetchedAt] = useState(null)
  const [chain, setChain]         = useState('ALL')
  const [type, setType]           = useState('ALL')
  const [sort, setSort]           = useState('util')
  const [view, setView]           = useState('gallery')
  const [countdown, setCountdown] = useState(60)
  const cdRef = useRef(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/markets')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMarkets(data.markets || [])
      setFetchedAt(data.fetchedAt)
      setStatus('live')
      setCountdown(60)
      if (cdRef.current) clearInterval(cdRef.current)
      cdRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(cdRef.current); load(); return 60 }
          return c - 1
        })
      }, 1000)
    } catch(e) {
      console.error(e)
      setStatus('error')
    }
  }, [])

  useEffect(() => { load(); return () => { if(cdRef.current) clearInterval(cdRef.current) } }, [load])

  const chains = ['ALL', ...new Set(markets.map(m => m.chain))].filter((v,i,a)=>a.indexOf(v)===i)

  let filtered = markets
  if (chain !== 'ALL') filtered = filtered.filter(m => m.chain === chain)
  if (type  !== 'ALL') filtered = filtered.filter(m => m.irm?.type === type)

  // Deduplicate by assetAddress+chain (same token can appear twice if symbol decodes identically)
  const seen = new Set()
  filtered = filtered.filter(m => {
    const k = (m.assetAddress||m.symbol) + m.chain
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const sorted = [...filtered].sort((a,b) => {
    if (sort === 'util')   return b.utilization - a.utilization
    if (sort === 'supply') return Number(BigInt(b.totalSupplyRaw||'0') - BigInt(a.totalSupplyRaw||'0'))
    if (sort === 'borrow') return b.borrowApy - a.borrowApy
    if (sort === 'kink')   return (b.utilization-(b.irm?.optimal||80)) - (a.utilization-(a.irm?.optimal||80))
    if (sort === 'sym')    return a.symbol.localeCompare(b.symbol)
    return 0
  })

  const critical = markets.filter(m => m.utilization >= 90 && m.utilization < 99).length
  const high80   = markets.filter(m => m.utilization >= 80 && m.utilization < 90).length
  const totalAvailable = markets.reduce((s, m) => {
    if (!m.priceUsd || !m.totalSupplyRaw || !m.totalDebtRaw) return s
    const avail = Number(BigInt(m.totalSupplyRaw) - BigInt(m.totalDebtRaw))
    return s + Math.max(0, avail) / 10 ** (m.decimals || 18) * m.priceUsd
  }, 0)
  const aboveKink = markets.filter(m => m.utilization > (m.irm?.optimal || 80)).length
  const chainCount = new Set(markets.map(m => m.chain)).size
  const totalStuck = markets.reduce((s, m) => {
    if (!m.priceUsd || !m.totalDebtRaw) return s
    return s + Number(BigInt(m.totalDebtRaw)) / 10 ** (m.decimals || 18) * m.priceUsd
  }, 0)
  const maxBorrowApy = Math.max(...markets.map(m => m.borrowApy), 0)

  const topAlerts = [...markets].sort((a,b)=>b.utilization-a.utilization).filter(m=>m.utilization>=80).slice(0,14)


  const liveColor = status==='live' ? 'var(--green)' : status==='error' ? 'var(--red)' : 'var(--yel)'

  const Btn = ({active, onClick, children, cls='default'}) => (
    <button onClick={onClick} style={{
      padding:'4px 10px',border:`1px solid ${active ? (cls==='sort'?'var(--cyan)':cls==='type'?'var(--pur)':'var(--aave)') : 'var(--brd2)'}`,
      background: active ? (cls==='sort'?'rgba(0,212,255,.1)':cls==='type'?'rgba(155,89,255,.15)':'rgba(182,80,158,.18)') : 'transparent',
      color: active ? (cls==='sort'?'var(--cyan)':cls==='type'?'var(--pur)':'var(--aave)') : 'var(--dim)',
      cursor:'pointer',fontFamily:'inherit',fontSize:10,letterSpacing:.5,transition:'all .15s',
    }}
    onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor='var(--aave)';e.currentTarget.style.color='var(--text)'}}}
    onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor='var(--brd2)';e.currentTarget.style.color='var(--dim)'}}}
    >{children}</button>
  )

  return (
    <>
      <Head>
        <title>STRAIT OF AAVE — Live Liquidity Monitor</title>
        <meta name="description" content="Real-time Aave V3 utilization, IRM curves, and liquidity across all chains"/>
        <link rel="icon" href="/favicon.ico"/>
      </Head>

      {/* HEADER */}
      <header style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'10px 20px',borderBottom:'1px solid var(--brd)',
        background:'var(--bg2)',position:'sticky',top:0,zIndex:100,gap:12,flexWrap:'wrap',
      }}>
        <div style={{fontSize:15,fontWeight:'bold',letterSpacing:4,color:'var(--aave)'}}>
          STRAIT OF <span style={{color:'#fff'}}>AAVE</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:9,letterSpacing:2,color:liveColor}}>
          <div style={{
            width:7,height:7,borderRadius:'50%',background:liveColor,
            animation: status==='live'?'blink 2s infinite':'none',
          }}/>
          {status.toUpperCase()}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:18,fontSize:10,color:'var(--dim)'}}>
          <span>Next refresh <b style={{color:'var(--aave)'}}>{countdown}s</b></span>
          {fetchedAt && <span>Updated <span style={{color:'var(--text)'}}>{new Date(fetchedAt).toLocaleTimeString()}</span></span>}
        </div>
      </header>

      {/* HORMUZ MAP */}
      <HormuzMap markets={markets}/>

      {/* EXPLAINER */}
      <div style={{margin:'0 0 0 0',border:'none',borderBottom:'1px solid var(--brd)',background:'var(--bg2)',padding:20}}>
        <div style={{fontSize:10,letterSpacing:3,color:'var(--aave)',textTransform:'uppercase',marginBottom:14,borderBottom:'1px solid var(--brd)',paddingBottom:10}}>
          Interest Rate Model — Utilization, Kink Mechanics & Liquidation Risk
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
          <div>
            <h3 style={{fontSize:9,letterSpacing:2,color:'var(--cyan)',marginBottom:8,textTransform:'uppercase'}}>The Kink Model</h3>
            <p style={{fontSize:11,lineHeight:1.7}}>
              Aave uses a two-slope IRM. Below optimal utilization the rate rises slowly (slope1).
              Above the kink it escalates steeply (slope2) — designed to incentivize repayment and attract new deposits.
              The rate is <em>instantaneous</em>: it reacts to utilization changes immediately.
            </p>
            <pre style={{
              background:'var(--bg4)',border:'1px solid var(--brd)',
              padding:8,marginTop:7,fontSize:10,color:'var(--yel)',lineHeight:1.9,
              whiteSpace:'pre-wrap',
            }}>{`util ≤ optimal:
  rate = base + slope1 × (util / optimal)

util > optimal:
  rate = base + slope1
       + slope2 × (util − opt)
                / (1 − opt)`}</pre>
          </div>

          <div>
            <h3 style={{fontSize:9,letterSpacing:2,color:'var(--cyan)',marginBottom:8,textTransform:'uppercase'}}>IRM Types</h3>
            {[
              { type:'stable',   title:'STABLECOINS',  desc:'Kink 80-90% · Slope2 60-75%. Gentle ceiling — 100% util hits ~14% borrow APY. Backbone of lending.' },
              { type:'eth',      title:'ETH / LSTs',   desc:'Kink 80% · Slope2 80%. Calibrated against staking yield. Leverage staking still profitable.' },
              { type:'btc',      title:'BTC / WBTC',   desc:'Kink 45% · Slope2 300%. Nuclear above kink. No native yield — Aave keeps rates painful to deter over-borrowing.' },
              { type:'volatile', title:'VOLATILE',      desc:'Kink 45% · Slope2 300%. Same as BTC. Used as collateral not borrow asset. High rates protect protocol.' },
            ].map(({ type, title, desc }) => (
              <div key={type} style={{
                background:'var(--bg4)',border:'1px solid var(--brd)',padding:9,marginBottom:6,
              }}>
                <div style={{fontSize:9,letterSpacing:2,color:TYPE_COLORS[type],marginBottom:4}}>{title}</div>
                <div style={{fontSize:10,color:'var(--dim)',lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{fontSize:9,letterSpacing:2,color:'var(--cyan)',marginBottom:8,textTransform:'uppercase'}}>Rate Spike — Liquidation Pressure</h3>
            <p style={{fontSize:11,lineHeight:1.7,marginBottom:10}}>
              Peak borrow APY: <strong style={{color:'var(--red)'}}>{pct(maxBorrowApy,1)}</strong>. Spikes cluster with collateral drawdowns — debt grows while your collateral shrinks.
            </p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
              <thead>
                <tr>
                  {['Duration','Debt added','per $1M position'].map(h => (
                    <th key={h} style={{textAlign:'left',color:'var(--dim)',borderBottom:'1px solid var(--brd)',padding:'3px 6px 3px 0',fontWeight:'normal',fontSize:9,letterSpacing:1}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['1 hour',  maxBorrowApy/8760],
                  ['24 hours',maxBorrowApy/365],
                  ['72 hours',maxBorrowApy*3/365],
                  ['7 days',  maxBorrowApy*7/365],
                ].map(([dur, acc]) => {
                  const dollars = (acc / 100 * 1_000_000)
                  const color = acc < 0.01 ? 'var(--green)' : acc < 0.15 ? 'var(--yel)' : acc < 0.5 ? 'var(--org)' : 'var(--red)'
                  return (
                    <tr key={dur}>
                      <td style={{padding:'4px 6px 4px 0',color:'var(--dim)',borderBottom:'1px solid rgba(34,34,51,.5)'}}>{dur}</td>
                      <td style={{padding:'4px 6px 4px 0',fontWeight:'bold',color,borderBottom:'1px solid rgba(34,34,51,.5)'}}>{acc.toFixed(4)}%</td>
                      <td style={{padding:'4px 6px 4px 0',color,borderBottom:'1px solid rgba(34,34,51,.5)'}}>
                        ${dollars >= 1000 ? (dollars/1000).toFixed(1)+'K' : dollars.toFixed(0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p style={{marginTop:10,fontSize:10,color:'var(--dim)',lineHeight:1.6}}>
              A leveraged position at 80% LTV can absorb maybe 1–2% of collateral drift before liquidation.
              A 7-day spike at peak rates adds ~{pct(maxBorrowApy*7/365,2)} to your debt — on top of any collateral price move.
              That's the squeeze.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:1,background:'var(--brd)',borderBottom:'1px solid var(--brd)'}}>
        {[
          { lbl:'Markets',          val: markets.length || '—',                             color:'#fff',                                          sub: `across ${chainCount} chains` },
          { lbl:'Above Kink',       val: aboveKink || '0',                                   color: aboveKink>0?'var(--red)':'var(--green)',         sub: 'past optimal — steep rate zone' },
          { lbl:'Critical >90%',    val: critical || '0',                                    color: critical>0?'var(--red)':'var(--green)',           sub: '90–99% util' },
          { lbl:'High 80–90%',      val: high80 || '0',                                      color: high80>0?'var(--yel)':'var(--green)',             sub: 'approaching kink' },
          { lbl:'Liquidity Stuck',  val: totalStuck > 0 ? usd(totalStuck) : '—',            color:'var(--red)',                                     sub: 'total borrowed' },
          { lbl:'Available',        val: totalAvailable > 0 ? usd(totalAvailable) : '—',    color:'var(--green)',                                   sub: 'withdrawable right now' },
          { lbl:'Peak Borrow APY',  val: pct(maxBorrowApy,1),                               color:'var(--red)',                                     sub: 'highest active rate' },
        ].map(({lbl,val,color,sub}) => (
          <div key={lbl} style={{background:'var(--bg2)',padding:'13px 16px'}}>
            <div style={{fontSize:9,letterSpacing:2,color:'var(--dim)',textTransform:'uppercase',marginBottom:5}}>{lbl}</div>
            <div style={{fontSize:20,fontWeight:'bold',color}}>{val}</div>
            <div style={{fontSize:9,color:'var(--dim)',marginTop:3}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ALERTS */}
      <div style={{
        display:'flex',alignItems:'center',gap:8,padding:'7px 20px',
        background:'var(--bg3)',borderBottom:'1px solid var(--brd)',
        overflowX:'auto',minHeight:34,
      }}>
        <span style={{fontSize:9,letterSpacing:2,color:'var(--dim)',whiteSpace:'nowrap',flexShrink:0}}>ALERTS</span>
        {topAlerts.length === 0 && <span style={{color:'var(--green)',fontSize:10}}>All markets below 80% utilization</span>}
        {topAlerts.map(m => (
          <span key={(m.assetAddress||m.symbol)+m.chain} style={{
            display:'inline-flex',alignItems:'center',gap:4,
            padding:'2px 7px',borderRadius:2,fontSize:10,whiteSpace:'nowrap',flexShrink:0,
            background: m.utilization>=90?'rgba(255,58,92,.15)':'rgba(255,140,66,.12)',
            border: `1px solid ${m.utilization>=90?'rgba(255,58,92,.4)':'rgba(255,140,66,.35)'}`,
            color: m.utilization>=90?'var(--red)':'var(--org)',
          }}>
            {m.utilization>=99?'⬛':'▲'} {m.symbol} {chainCfg(m.chain).short} {pct(m.utilization,1)}
          </span>
        ))}
      </div>

      {/* CONTROLS */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'9px 20px',borderBottom:'1px solid var(--brd)',
        background:'var(--bg2)',gap:10,flexWrap:'wrap',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontSize:9,letterSpacing:2,color:'var(--dim)'}}>CHAIN</span>
          {chains.map(c => (
            <Btn key={c} active={chain===c} onClick={()=>setChain(c)}>
              {c==='ALL' ? 'ALL' : chainCfg(c).short}
            </Btn>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontSize:9,letterSpacing:2,color:'var(--dim)'}}>TYPE</span>
          {[['ALL','ALL'],['stable','STABLE'],['eth','ETH/LST'],['btc','BTC'],['volatile','VOLATILE']].map(([v,l]) => (
            <Btn key={v} active={type===v} onClick={()=>setType(v)} cls="type">{l}</Btn>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontSize:9,letterSpacing:2,color:'var(--dim)'}}>SORT</span>
          {[['util','UTIL%'],['supply','SUPPLY'],['borrow','BORROW APY'],['kink','KINK GAP'],['sym','SYMBOL']].map(([v,l]) => (
            <Btn key={v} active={sort===v} onClick={()=>setSort(v)} cls="sort">{l}</Btn>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:9,letterSpacing:2,color:'var(--dim)'}}>VIEW</span>
          {[['gallery','⊞ GALLERY'],['list','≡ LIST']].map(([v,l]) => (
            <Btn key={v} active={view===v} onClick={()=>setView(v)} cls="sort">{l}</Btn>
          ))}
        </div>
      </div>

      {/* GALLERY / LIST */}
      {view === 'gallery' ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:1,background:'var(--brd)',padding:1}}>
          {status === 'loading' && markets.length === 0 && (
            <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',justifyContent:'center',height:220,color:'var(--dim)',fontSize:11,letterSpacing:2}}>
              <span style={{display:'inline-block',width:11,height:11,border:'2px solid var(--brd2)',borderTopColor:'var(--aave)',borderRadius:'50%',animation:'spin .7s linear infinite',marginRight:9}}/>
              FETCHING ON-CHAIN DATA...
            </div>
          )}
          {status === 'error' && <div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'var(--red)'}}>Failed to fetch market data. Retrying...</div>}
          {sorted.map(m => <MarketCard key={(m.assetAddress||m.symbol)+m.chain} m={m} sort={sort}/>)}
          {sorted.length === 0 && markets.length > 0 && <div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'var(--dim)'}}>No markets match current filters.</div>}
        </div>
      ) : (
        <div style={{borderTop:'1px solid var(--brd)'}}>
          {/* List header */}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',gap:4,padding:'6px 14px',background:'var(--bg3)',fontSize:9,color:'var(--dim)',letterSpacing:1,borderBottom:'1px solid var(--brd)'}}>
            {['ASSET','CHAIN','UTIL%','SUPPLY APY','BORROW APY','AVAILABLE'].map((h,i) => {
              const sortKey = ['sym','sym','util','supply','borrow','kink'][i]
              const active = sort === sortKey && i > 0
              return <span key={h} style={active?{color:'var(--cyan)',fontWeight:'bold'}:{}}>{h}{active?' ▲':''}</span>
            })}
          </div>
          {status === 'loading' && markets.length === 0 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:120,color:'var(--dim)',fontSize:11,letterSpacing:2}}>
              <span style={{display:'inline-block',width:11,height:11,border:'2px solid var(--brd2)',borderTopColor:'var(--aave)',borderRadius:'50%',animation:'spin .7s linear infinite',marginRight:9}}/>
              FETCHING ON-CHAIN DATA...
            </div>
          )}
          {sorted.map(m => {
            const cfg2 = chainCfg(m.chain)
            const avail = (100 - m.utilization).toFixed(1)
            const availColor = (100-m.utilization)<5 ? 'var(--red)' : (100-m.utilization)<20 ? 'var(--yel)' : 'var(--green)'
            const hl2 = (field) => sort === field ? {color:'var(--cyan)',fontWeight:'bold',textShadow:'0 0 8px rgba(0,212,255,.5)'} : {}
            return (
              <div key={(m.assetAddress||m.symbol)+m.chain} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',gap:4,padding:'9px 14px',borderBottom:'1px solid var(--brd)',fontSize:12,alignItems:'center',transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <img src={`https://raw.githubusercontent.com/reddavis/Crypto-Icons-API/refs/heads/master/public/svg/icon/${m.symbol.toLowerCase()}.svg`} width={16} height={16} style={{borderRadius:'50%',flexShrink:0}} onError={e=>{e.currentTarget.style.display='none'}}/>
                  <span style={{fontWeight:'bold',color:'#fff',...hl2('sym')}}>{m.symbol}</span>
                  <a href={aaveUrl(m.chain, m.assetAddress)} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:'var(--aave)',textDecoration:'none',border:'1px solid rgba(180,100,255,.3)',borderRadius:2,padding:'1px 4px'}}>↗</a>
                </div>
                <span style={{fontSize:9,padding:'2px 5px',borderRadius:2,background:cfg2.bg,color:cfg2.color,border:`1px solid ${cfg2.brd}`,display:'inline-block',width:'fit-content'}}>{cfg2.short}</span>
                <span style={{color:utilColor(m.utilization),fontWeight:'bold',...hl2('util')}}>{pct(m.utilization,1)}</span>
                <span style={{color:'var(--green)',...hl2('supply')}}>{pct(m.supplyApy,2)}</span>
                <span style={{color:'var(--red)',...hl2('borrow')}}>{pct(m.borrowApy,2)}</span>
                <span style={{color:availColor}}>{avail}%</span>
              </div>
            )
          })}
          {sorted.length === 0 && markets.length > 0 && <div style={{padding:40,textAlign:'center',color:'var(--dim)'}}>No markets match current filters.</div>}
        </div>
      )}

      {/* FOOTER */}
      <footer style={{padding:'14px 20px',borderTop:'1px solid var(--brd)',display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--dim)'}}>
        <span>Data: Direct Aave V3 on-chain RPC · {markets.length} markets · {new Set(markets.map(m=>m.chain)).size} chains</span>
        <span>github.com/publu/strait-of-aave</span>
      </footer>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}
