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

function MarketCard({ m }) {
  const cls = utilCls(m.utilization)
  const cfg = chainCfg(m.chain)
  const tc  = TYPE_COLORS[m.irm?.type] || '#888'
  const tl  = TYPE_LABELS[m.irm?.type] || 'OTHER'
  const kinkGap = m.utilization - (m.irm?.optimal || 80)
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
        <div style={{display:'flex',alignItems:'center',gap:7}}>
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
          <span style={{color: kinkGap >= 0 ? 'var(--red)' : 'var(--dim)'}}>
            {kinkGap >= 0 ? `+${kinkGap.toFixed(1)}% above kink` : `${Math.abs(kinkGap).toFixed(1)}% below kink`}
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

  const totalSup = markets.reduce((s,m) => s + Number(BigInt(m.totalSupplyRaw||'0')), 0)
  const totalDbt = markets.reduce((s,m) => s + Number(BigInt(m.totalDebtRaw||'0')), 0)
  const at100    = markets.filter(m => m.utilization >= 99).length
  const critical = markets.filter(m => m.utilization >= 90).length
  const wavg     = totalSup > 0
    ? markets.reduce((s,m) => s + m.utilization * Number(BigInt(m.totalSupplyRaw||'0')), 0) / totalSup
    : 0

  const topAlerts = [...markets].sort((a,b)=>b.utilization-a.utilization).filter(m=>m.utilization>=80).slice(0,14)

  const topBorrowApy = [...markets].sort((a,b)=>b.borrowApy-a.borrowApy)[0]?.borrowApy || 100

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

      {/* SUMMARY */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:1,background:'var(--brd)',borderBottom:'1px solid var(--brd)'}}>
        {[
          ['Markets',      markets.length,                          '#fff'],
          ['Total Supply', usd(totalSup),                           '#fff'],
          ['Total Debt',   usd(totalDbt),                           'var(--cyan)'],
          ['At 100% Util', at100,                                   'var(--red)'],
          ['Critical >90%',critical,                                'var(--red)'],
          ['Avg Util (wtd)',pct(wavg,1),                            wavg>=80?'var(--red)':wavg>=60?'var(--yel)':'var(--green)'],
        ].map(([lbl,val,color]) => (
          <div key={lbl} style={{background:'var(--bg2)',padding:'13px 16px'}}>
            <div style={{fontSize:9,letterSpacing:2,color:'var(--dim)',textTransform:'uppercase',marginBottom:5}}>{lbl}</div>
            <div style={{fontSize:20,fontWeight:'bold',color}}>{val || '—'}</div>
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

      {/* EXPLAINER */}
      <div style={{margin:20,border:'1px solid var(--brd)',background:'var(--bg2)',padding:20}}>
        <div style={{fontSize:10,letterSpacing:3,color:'var(--aave)',textTransform:'uppercase',marginBottom:14,borderBottom:'1px solid var(--brd)',paddingBottom:10}}>
          Interest Rate Model — How Spike Duration Affects Borrowers
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
            <h3 style={{fontSize:9,letterSpacing:2,color:'var(--cyan)',marginBottom:8,textTransform:'uppercase'}}>Spike Duration — Why It Matters</h3>
            <p style={{fontSize:11,lineHeight:1.7,marginBottom:10}}>
              The rate is the same the instant a spike hits. But interest accrues continuously.
              Using the current highest borrow APY of <strong style={{color:'var(--red)'}}>{pct(topBorrowApy,1)}</strong>:
            </p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
              <thead>
                <tr>
                  {['Duration','Accrued','Verdict'].map(h => (
                    <th key={h} style={{textAlign:'left',color:'var(--dim)',borderBottom:'1px solid var(--brd)',padding:'3px 6px 3px 0',fontWeight:'normal',fontSize:9,letterSpacing:1}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['1 hour',  topBorrowApy/8760,  'var(--green)', 'Minimal'],
                  ['24 hours',topBorrowApy/365,   'var(--yel)',   'Noticeable'],
                  ['72 hours',topBorrowApy*3/365, 'var(--org)',   'Significant'],
                  ['7 days',  topBorrowApy*7/365, 'var(--red)',   'Severe'],
                ].map(([dur, acc, color, verdict]) => (
                  <tr key={dur}>
                    <td style={{padding:'4px 6px 4px 0',color:'var(--dim)',borderBottom:'1px solid rgba(34,34,51,.5)'}}>{dur}</td>
                    <td style={{padding:'4px 6px 4px 0',fontWeight:'bold',borderBottom:'1px solid rgba(34,34,51,.5)'}}>{acc.toFixed(4)}%</td>
                    <td style={{padding:'4px 6px 4px 0',color,borderBottom:'1px solid rgba(34,34,51,.5)'}}>{verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{marginTop:10,fontSize:10,color:'var(--dim)'}}>
              At 100% utilization, withdrawals are frozen — suppliers cannot exit until borrowers repay.
              A 72-hour crunch at peak rates costs borrowers ~{pct(topBorrowApy*3/365,3)} in interest.
            </p>
          </div>
        </div>
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
