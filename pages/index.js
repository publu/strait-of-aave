import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const TYPE_COLORS = { stable:'#00e87a', eth:'#00d4ff', btc:'#ff8c42', volatile:'#9b59ff' }
const TYPE_LABELS = { stable:'STABLE', eth:'ETH/LST', btc:'BTC', volatile:'VOLATILE' }

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
  const W = 800, H = 130
  const boatsRef   = useRef([])
  const lastAddRef = useRef(0)
  const idRef      = useRef(100)
  const [renderBoats, setRenderBoats] = useState([])

  const stuckMarkets = markets.filter(m => m.utilization >= 99).slice(0, 10)

  useEffect(() => {
    boatsRef.current = [0,1,2,3].map(i => ({
      id: i,
      x: 80 + i * 190,
      y: 70 + (i % 3 - 1) * 8,
      speed: 1.0 + i * 0.12,
      dir: i % 2 === 0 ? 1 : -1,
    }))
    lastAddRef.current = Date.now() - 2500
    let raf
    const frame = () => {
      const now = Date.now()
      boatsRef.current = boatsRef.current
        .map(b => ({ ...b, x: b.x + b.speed * b.dir }))
        .filter(b => b.x > -50 && b.x < W + 50)
      if (now - lastAddRef.current >= 3000) {
        lastAddRef.current = now
        const fromLeft = Math.random() > 0.5
        boatsRef.current.push({
          id: idRef.current++,
          x: fromLeft ? -20 : W + 20,
          y: 66 + Math.random() * 16,
          speed: 0.85 + Math.random() * 0.4,
          dir: fromLeft ? 1 : -1,
        })
      }
      setRenderBoats([...boatsRef.current])
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Spread stuck boats across the full strait width, 2 rows max
  const stuckPos = stuckMarkets.map((m, i) => ({
    market: m,
    x: 160 + (i % 8) * 68,
    y: 70 + Math.floor(i / 8) * 14,
  }))

  const shipPts = (dir) => dir > 0
    ? '-9,3.5 7,3.5 11,0 7,-3.5 -9,-3.5'
    : '9,3.5 -7,3.5 -11,0 -7,-3.5 9,-3.5'

  return (
    <div style={{width:'100%',background:'#04080f',borderBottom:'1px solid var(--brd)',overflow:'hidden'}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid slice" style={{display:'block'}}>

        {/* Water */}
        <rect width={W} height={H} fill="#04080f"/>
        <rect x={0} y={52} width={W} height={26} fill="#050d1a" opacity={0.6}/>

        {/* Iran — north coast */}
        <path
          d="M 0,0 L 800,0 L 800,42 C 740,38 680,46 610,52 C 555,57 510,52 465,58 C 425,63 385,59 340,63 C 295,66 250,61 200,57 C 150,52 90,51 40,54 C 20,55 8,53 0,52 Z"
          fill="#0c0c1c" stroke="#161626" strokeWidth={1}
        />
        <text x={30} y={26} fontSize={8} fill="#1e1e32" letterSpacing={3} fontFamily="monospace">IRAN</text>

        {/* Oman/UAE — south coast */}
        <path
          d="M 0,130 L 800,130 L 800,98 C 740,102 680,95 615,92 C 565,90 525,94 475,91 C 435,88 390,93 345,96 C 295,99 245,94 195,92 C 145,90 85,95 40,99 C 18,101 6,99 0,98 Z"
          fill="#0c0c1c" stroke="#161626" strokeWidth={1}
        />
        <text x={30} y={124} fontSize={8} fill="#1e1e32" letterSpacing={2} fontFamily="monospace">OMAN / UAE</text>

        {/* Water shimmer lines */}
        {[63,70,77,84].map(y => (
          <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="#07111f" strokeWidth={1}/>
        ))}

        {/* Shipping lane */}
        <line x1={0} y1={76} x2={W} y2={76} stroke="#0b1e30" strokeWidth={0.8} strokeDasharray="16,12"/>

        {/* Region labels */}
        <text x={48} y={80} fontSize={8} fill="#0c1a28" letterSpacing={2} fontFamily="monospace">GULF OF ETHEREUM</text>
        <text x={608} y={80} fontSize={8} fill="#0c1a28" letterSpacing={1} fontFamily="monospace">GULF OF OMAN</text>

        {/* Moving boats */}
        {renderBoats.map(b => (
          <g key={b.id} transform={`translate(${b.x.toFixed(1)},${b.y.toFixed(1)})`} style={{cursor:'crosshair'}}>
            <title>Active — liquidity in transit{'\n'}Speed: {b.speed.toFixed(2)}x{'\n'}Heading: {b.dir > 0 ? 'Persian Gulf →' : '← Gulf of Oman'}</title>
            <polygon
              points={shipPts(b.dir)}
              fill="rgba(0,200,240,.25)"
              stroke="#00c8f0"
              strokeWidth={1}
            />
          </g>
        ))}

        {/* Stuck boats — red, spread across strait, label above */}
        {stuckPos.map(({ market, x, y }) => (
          <g key={market.symbol + market.chain}>
            <text x={x} y={y - 6} textAnchor="middle" fontSize={6} fill="#ff3a5c" fontFamily="monospace" opacity={0.8}>
              {market.symbol}
            </text>
            <polygon
              transform={`translate(${x},${y})`}
              points={shipPts(1)}
              fill="rgba(255,58,92,.18)"
              stroke="#ff3a5c"
              strokeWidth={1}
            />
            <circle cx={x} cy={y} r={1.2} fill="#ff3a5c" opacity={0.7}/>
          </g>
        ))}


        {/* Legend — top right */}
        <g transform="translate(670,8)" fontFamily="monospace">
          <polygon points="-9,3 7,3 10,0 7,-3 -9,-3" fill="rgba(0,200,240,.25)" stroke="#00c8f0" strokeWidth={1}/>
          <text x={14} y={3} fontSize={7} fill="#304050">IN TRANSIT</text>
          <g transform="translate(0,14)">
            <polygon points="-9,3 7,3 10,0 7,-3 -9,-3" fill="rgba(255,58,92,.18)" stroke="#ff3a5c" strokeWidth={1}/>
            <circle cx={0} cy={0} r={1.2} fill="#ff3a5c" opacity={0.7}/>
            <text x={14} y={3} fontSize={7} fill="#ff3a5c">{stuckMarkets.length} BLOCKED</text>
          </g>
        </g>
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

function MarketCard({ m }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = chainCfg(m.chain)
  const tc  = TYPE_COLORS[m.irm?.type] || '#888'
  const tl  = TYPE_LABELS[m.irm?.type] || 'OTHER'
  const rateAt100 = computeRate(100, m.irm)
  const leftBorderColor = utilColor(m.utilization)

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
        </div>
        <span style={{fontSize:17,fontWeight:'bold',color:utilColor(m.utilization)}}>
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
        <div>
          <div style={{fontSize:9,color:'var(--dim)',letterSpacing:1,marginBottom:2}}>SUPPLY APY</div>
          <div style={{fontSize:13,fontWeight:'bold',color:'var(--green)'}}>{pct(m.supplyApy,2)}</div>
        </div>
        <div>
          <div style={{fontSize:9,color:'var(--dim)',letterSpacing:1,marginBottom:2}}>BORROW APY</div>
          <div style={{fontSize:13,fontWeight:'bold',color:'var(--red)'}}>{pct(m.borrowApy,2)}</div>
        </div>
        <div>
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

  const sorted = [...filtered].sort((a,b) => {
    if (sort === 'util')   return b.utilization - a.utilization
    if (sort === 'supply') return Number(BigInt(b.totalSupplyRaw||'0') - BigInt(a.totalSupplyRaw||'0'))
    if (sort === 'borrow') return b.borrowApy - a.borrowApy
    if (sort === 'kink')   return (b.utilization-(b.irm?.optimal||80)) - (a.utilization-(a.irm?.optimal||80))
    if (sort === 'sym')    return a.symbol.localeCompare(b.symbol)
    return 0
  })

  const at100    = markets.filter(m => m.utilization >= 99).length
  const critical = markets.filter(m => m.utilization >= 90).length
  const high80   = markets.filter(m => m.utilization >= 80 && m.utilization < 90).length
  const chainCount = new Set(markets.map(m => m.chain)).size
  const wavg     = markets.length > 0
    ? markets.reduce((s,m) => s + m.utilization, 0) / markets.length
    : 0
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
              At the current peak of <strong style={{color:'var(--red)'}}>{pct(maxBorrowApy,1)}</strong> borrow APY, interest compounds
              every second. The % looks small — but rate spikes don't happen in calm markets.
              They cluster with collateral price drops. Your health factor bleeds from both sides at once.
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
          { lbl:'Markets',        val: markets.length || '—',       color:'#fff',           sub: `across ${chainCount} chains` },
          { lbl:'At 100% Util',   val: at100 || '0',                color:'var(--red)',      sub: 'withdrawals frozen' },
          { lbl:'Critical >90%',  val: critical || '0',             color: critical>0?'var(--red)':'var(--green)',   sub: 'above kink steep zone' },
          { lbl:'High 80–90%',    val: high80 || '0',               color: high80>0?'var(--yel)':'var(--green)',     sub: 'approaching danger' },
          { lbl:'Avg Util',       val: pct(wavg,1),                 color: wavg>=80?'var(--red)':wavg>=60?'var(--yel)':'var(--green)', sub: 'simple mean' },
          { lbl:'Peak Borrow APY',val: pct(maxBorrowApy,1),         color:'var(--red)',      sub: 'highest active rate' },
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
          <span key={m.symbol+m.chain} style={{
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
      </div>

      {/* GRID */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',
        gap:1,background:'var(--brd)',padding:1,
      }}>
        {status === 'loading' && markets.length === 0 && (
          <div style={{
            gridColumn:'1/-1',display:'flex',alignItems:'center',justifyContent:'center',
            height:220,color:'var(--dim)',fontSize:11,letterSpacing:2,
          }}>
            <span style={{
              display:'inline-block',width:11,height:11,border:'2px solid var(--brd2)',
              borderTopColor:'var(--aave)',borderRadius:'50%',
              animation:'spin .7s linear infinite',marginRight:9,
            }}/>
            FETCHING ON-CHAIN DATA...
          </div>
        )}
        {status === 'error' && (
          <div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'var(--red)'}}>
            Failed to fetch market data. Retrying...
          </div>
        )}
        {sorted.map(m => <MarketCard key={m.symbol+m.chain} m={m}/>)}
        {sorted.length === 0 && markets.length > 0 && (
          <div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'var(--dim)'}}>
            No markets match current filters.
          </div>
        )}
      </div>

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
