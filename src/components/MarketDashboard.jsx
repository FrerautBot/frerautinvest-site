import React,{useState,useEffect}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,Legend}from'recharts';
import{TrendingUp,Globe,Activity,DollarSign,BarChart2,PieChart as PieIcon,RefreshCw,Building2,ArrowUpRight,ArrowDownRight,Wifi,Star}from'lucide-react';

const ADMIN='frerautgroups.a@gmail.com';
const fC=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',minimumFractionDigits:0}).format(v||0);
const fU=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(v||0);
const fP=v=>`${parseFloat(v||0)>=0?'+':''}${parseFloat(v||0).toFixed(2)}%`;

const IDX=[{name:'S&P 500',value:'5,667',change:1.12,region:'EE.UU.'},{name:'NASDAQ',value:'19,823',change:1.45,region:'EE.UU.'},{name:'VIX',value:'24.23',change:-2.81,region:'Volatilidad'},{name:'IPSA',value:'7,142',change:0.32,region:'Chile'},{name:'USD/CLP',value:'948.5',change:-0.21,region:'Divisa'},{name:'Oro',value:'$3,024',change:0.55,region:'Commodity'},{name:'Bitcoin',value:'$84,200',change:-1.23,region:'Crypto'},{name:'Dow Jones',value:'42,115',change:0.78,region:'EE.UU.'}];

const SEC=[{sector:'Tecnología',pct:32,color:'#3b82f6'},{sector:'Finanzas',pct:18,color:'#10b981'},{sector:'Salud',pct:14,color:'#8b5cf6'},{sector:'Energía',pct:12,color:'#f59e0b'},{sector:'Consumo',pct:10,color:'#ec4899'},{sector:'Industrial',pct:8,color:'#84cc16'},{sector:'Cash',pct:6,color:'#6b7280'}];

function KpiCard({ label, value, icon: Icon, color, trend }) {
  const colors = { blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400', green: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400', red: 'border-red-500/20 bg-red-500/5 text-red-400', purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400' }; 
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-2 ${colors[color || 'blue']}`}>
      <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-widest opacity-70">{label}</span>{Icon && <Icon className="w-4 h-4 opacity-60" />}</div>
      <div className="text-2xl font-bold">{value}</div>
      {trend !== undefined && (<div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{fP(trend)}</div>)}
    </div>
  );
}
function MarketDashboard({onAnalyze}){
  const{user}=useAuth();
    const isAdmin=user?.email===ADMIN;
      const[nav,setNav]=useState([]);
        const[ibkr,setIbkr]=useState(null);
          const[ind,setInd]=useState(null);
            const[loading,setLoading]=true;
              const[lu,setLu]=useState(null);
                const[tab,setTab]=useState('overview');
                  useEffect(()=>{load();},[]);
                    async function load(){
                        setLoading(true);
                            try{
                                  const[r1,r2,r3]=await Promise.allSettled([
                                          supabase.from('nav_historico').select('fecha,nav,capital_total').order('fecha',{ascending:false}).limit(60),
                                                  supabase.from('ibkr_summary').select('*').order('sync_date',{ascending:false}).limit(1).single(),
                                                          supabase.rpc('calcular_indicadores_financieros'),
                                                                ]);
                                                                      if(r1.status==='fulfilled'&&r1.value.data)setNav([...r1.value.data].reverse());
                                                                            if(r2.status==='fulfilled'&&r2.value.data)setIbkr(r2.value.data);
                                                                                  if(r3.status==='fulfilled'&&r3.value.data){const d=Array.isArray(r3.value.data)?r3.value.data[0]:r3.value.data;setInd(d);}
                                                                                        setLu(new Date());
                                                                                            }catch(e){console.error(e);}
                                                                                                finally{setLoading(false);}
                                                                                                  }
                                                                                                    const ch=nav.map(d=>({fecha:new Date(d.fecha).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}),nav:parseFloat(d.nav||0),capital:parseFloat(d.capital_total||0)}));
                                                                                                      const cur=ch.at(-1)?.nav||0;
                                                                                                        const prev=ch.at(-2)?.nav||0;
                                                                                                          const vr=prev?((cur-prev)/prev)*100:0;
                                                                                                            const TABS=[{id:'overview',label:'Vista General',icon:Globe},{id:'nav',label:'NAV',icon:TrendingUp},{id:'ibkr',label:'IBKR',icon:Activity},{id:'sectores',label:'Sectores',icon:PieIcon},{id:'mercados',label:'Mercados',icon:BarChart2}];
                                                                                                              if(loading)return(<div className="flex items-center justify-center h-80"><div className="h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>);
                                                                                                                return(<div className="space-y-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20"><Globe className="w-5 h-5 text-blue-400"/></div><div><h1 className="text-2xl font-bold text-white">Dashboard de Mercados</h1><p className="text-sm text-slate-400">Freraut Invest</p></div></div><div className="flex items-center gap-3">{lu&&<span className="text-xs text-slate-500"><Wifi className="w-3 h-3 text-emerald-400"/></span>}<button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400"><RefreshCw className="w-3.5 h-3.5"/></button>{isAdmin&&onAnalyze&&<button onClick={onAnalyze} className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold"><Star className="w-3.5 h-3.5"/></button>}</div></div><div className="flex gap-2 overflow-x-auto pb-1">{TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab===t.id?'bg-blue-600 text-white':'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}`}><t.icon className="w-4 h-4"/>{t.label}</button>))}</div>{tab==='overview'&&(<div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><KpiCard label="NAV Actual" value={fC(cur)} icon={TrendingUp} color={vr>=0?'green':'red'} trend={vr}/><KpiCard label="Capital" value={fC(ch.at(-1)?.capital||0)} icon={DollarSign} color="blue"/><KpiCard label="ROE" value={ind?fP(ind.roe):'—'} icon={BarChart2} color="green"/><KpiCard label="Market Cap" value={ind?fC(ind.market_cap):'—'} icon={Building2} color="purple"/></div></div>)}{tab==='nav'&&(<div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-white font-semibold mb-4">NAV Historico</h3><ResponsiveContainer width="100%" height={300}><AreaChart data={ch}><defs><linearGradient id="nf1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/><stop offset="95%" stopColor="#eab308" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="fecha" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/><YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false} width={55}/><Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #1e293b',borderRadius:'8px'}} formatter={v=>fC(v)}/><Area type="monotone" dataKey="nav" stroke="#eab308" strokeWidth={2.5} fill="url(#nf1)" dot={false}/></AreaChart></ResponsiveContainer></div>)}{tab==='ibkr'&&(ibkr?(<div className="grid grid-cols-2 md:grid-cols-4 gap-4"><KpiCard label="Equity" value={fU(ibkr.total_equity)} icon={DollarSign} color="blue"/><KpiCard label="P&L Real" value={fU(ibkr.realized_pnl)} icon={TrendingUp} color="green"/><KpiCard label="P&L Unreal" value={fU(ibkr.unrealized_pnl)} icon={Activity} color="purple"/><KpiCard label="Cash" value={fU(ibkr.cash_balance)} icon={DollarSign} color="blue"/></div>):(<div className="flex flex-col items-center justify-center h-64"><Activity className="w-16 h-16 text-slate-700 mb-4"/><h3 className="text-white font-semibold">IBKR no sincronizado</h3></div>))}{tab==='sectores'&&(<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-white font-semibold mb-4">Sectores</h3><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={SEC} cx="50%" cy="50%" outerRadius={110} paddingAngle={2} dataKey="pct" nameKey="sector">{SEC.map((s,i)=><Cell key={i} fill={s.color}/>)}</Pie><Tooltip formatter={v=>`${v}%`}/><Legend/></PieChart></ResponsiveContainer></div><div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">{SEC.map((s,i)=>(<div key={i}><div className="flex justify-between mb-1"><span className="text-sm text-slate-300">{s.sector}</span><span className="text-sm font-bold text-white">{s.pct}%</span></div><div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.pct}%`,backgroundColor:s.color}}/></div></div>))}</div></div>)}{tab==='mercados'&&(<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{IDX.map((x,i)=>(<div key={i} className={`rounded-2xl border p-5 ${x.change>=0?'bg-emerald-500/5 border-emerald-500/20':'bg-red-500/5 border-red-500/20'}`}><span className="text-[10px] text-slate-500">{x.region}</span><p className="text-xl font-bold text-white">{x.value}</p><p className="text-xs text-slate-400">{x.name}</p></div>))}</div>)}</div>);
                                                                                                                }
export default MarketDashboard;