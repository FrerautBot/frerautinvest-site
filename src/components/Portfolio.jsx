import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, TrendingUp, DollarSign, BarChart3, RefreshCw, Briefcase, Wallet } from 'lucide-react';

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#A78BFA', '#F472B6', '#FBBF24', '#60A5FA', '#34D399', '#F87171', '#818CF8', '#FB923C', '#22D3EE', '#E879F9', '#84CC16'];
const ASSET_TYPES = {
  'SPY': 'ETF', 'QQQ': 'ETF', 'IWM': 'ETF', 'DIA': 'ETF', 'VYM': 'ETF',
  'SCHD': 'ETF', 'HDV': 'ETF', 'JEPI': 'ETF', 'JEPQ': 'ETF', 'DIVO': 'ETF',
  'QYLD': 'ETF', 'RYLD': 'ETF', 'XYLD': 'ETF', 'SPYD': 'ETF', 'VNQ': 'ETF',
  'XLE': 'ETF', 'XLF': 'ETF', 'XLK': 'ETF', 'XBI': 'ETF', 'XLV': 'ETF',
  'XLI': 'ETF', 'XLY': 'ETF', 'XLP': 'ETF', 'XLU': 'ETF', 'HYG': 'ETF',
  'TLT': 'ETF', 'BND': 'ETF', 'AGG': 'ETF', 'EEM': 'ETF', 'EFA': 'ETF',
  'UPRO': 'Apalancado', 'SPXU': 'Inverso', 'TQQQ': 'Apalancado', 'SQQQ': 'Inverso',
  'SOXL': 'Apalancado', 'SOXS': 'Inverso', 'SDOW': 'Inverso', 'TNA': 'Apalancado',
  'GLD': 'Commodity', 'SLV': 'Commodity', 'IAU': 'Commodity', 'USO': 'Commodity',
  'O': 'REIT', 'MAIN': 'REIT', 'SPG': 'REIT', 'STAG': 'REIT', 'AGNC': 'REIT',
  'EPR': 'REIT', 'PLD': 'REIT', 'AMT': 'REIT', 'GOOD': 'REIT', 'NLY': 'REIT',
  'EPD': 'MLP', 'ET': 'MLP', 'MPLX': 'MLP', 'WMB': 'MLP', 'OKE': 'MLP'
};
const getAssetType = sym => ASSET_TYPES[sym] || 'Accion';

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[#1a1d2b]/95 backdrop-blur-xl border border-yellow-500/30 rounded-2xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.fill }} />
          <span className="text-yellow-400 font-bold text-sm">{d.name}</span>
        </div>
        <p className="text-white font-bold text-lg">{d.value.toFixed(2)}%</p>
        <p className="text-gray-500 text-[10px]">${parseFloat(d.payload.marketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      </div>
    );
  }
  return null;
};

const VEREDICTO_COLOR = {
  COMPRAR: 'bg-emerald-500/20 text-emerald-400',
  VENDER: 'bg-red-500/20 text-red-400',
  MANTENER: 'bg-blue-500/20 text-blue-400',
  ESPERAR: 'bg-yellow-500/20 text-yellow-400',
  EVITAR: 'bg-slate-500/20 text-slate-400'
};

const REGIME_COLOR = {
  bullish: 'bg-emerald-500/20 text-emerald-400',
  bearish: 'bg-red-500/20 text-red-400',
  neutral: 'bg-slate-500/20 text-slate-400'
};

const ZBitacora = ({ analyses }) => {
  const relativeTime = (iso) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'hace ' + Math.floor(diff) + ' s';
    if (diff < 3600) return 'hace ' + Math.floor(diff/60) + ' min';
    if (diff < 86400) return 'hace ' + Math.floor(diff/3600) + ' h';
    return 'hace ' + Math.floor(diff/86400) + ' d';
  };

  const sideToVeredicto = (side) => side === 'buy' ? 'COMPRAR' : side === 'hold' ? 'MANTENER' : 'VENDER';
  const BUCKET_LABEL = { swing: 'Swing', largo_plazo: 'Largo plazo', dividendos: 'Dividendos', intraday: 'Intraday' };

  // Resumen: un chip por simbolo unico (el mas reciente), derivado de summary o de los campos
  const resumenChips = Object.values(
    analyses.reduce((acc, r) => {
      if (!acc[r.symbol]) acc[r.symbol] = r;
      return acc;
    }, {})
  ).slice(0, 8);

  const chipText = (r) => {
    if (r.summary) return r.summary;
    const action = r.side === 'buy' ? 'COMPRAR' : 'VENDER';
    const bucket = BUCKET_LABEL[r.bucket] || r.bucket || '';
    const price = r.estimated_price ? ` $${parseFloat(r.estimated_price).toFixed(0)}` : '';
    return `${r.symbol} · ${action}${price} - ${bucket}`;
  };

  const chipColor = (side) =>
    side === 'buy'  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
    side === 'hold' ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' :
                     'bg-red-500/15 border-red-500/30 text-red-300';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-[#1a1d2b]/60 backdrop-blur-xl rounded-[1.75rem] p-4 sm:p-6 border border-white/10">
      <h3 className="text-sm sm:text-base font-bold text-gray-200 mb-3">
        Bitacora IULER <span className="text-[10px] text-gray-500 font-normal">(ultimas 15 decisiones)</span>
      </h3>

      {resumenChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-white/5">
          {resumenChips.map((r, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${chipColor(r.side)}`}>
              {chipText(r)}
            </span>
          ))}
        </div>
      )}

      {analyses.length === 0 ? (
        <p className="text-center text-gray-600 text-sm py-6">Sin decisiones recientes</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-yellow-500/20">
                <th className="text-left py-2 px-2 text-yellow-500/80 font-bold uppercase">Ticker</th>
                <th className="text-left py-2 px-2 text-yellow-500/80 font-bold uppercase">Accion</th>
                <th className="text-left py-2 px-2 text-yellow-500/80 font-bold uppercase hidden sm:table-cell">Estrategia</th>
                <th className="text-right py-2 px-2 text-yellow-500/80 font-bold uppercase hidden md:table-cell">Precio est.</th>
                <th className="text-right py-2 px-2 text-yellow-500/80 font-bold uppercase hidden lg:table-cell">Confianza</th>
                <th className="text-right py-2 px-2 text-yellow-500/80 font-bold uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((r, i) => {
                const veredicto = sideToVeredicto(r.side);
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 px-2">
                      <div className="font-bold text-white">{r.symbol}</div>
                      {r.reason && (
                        <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[140px]">
                          {r.reason.length > 40 ? r.reason.substring(0, 40) + '...' : r.reason}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${VEREDICTO_COLOR[veredicto] || 'bg-gray-500/20 text-gray-400'}`}>
                        {veredicto}
                      </span>
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-500/20 text-slate-300">
                        {BUCKET_LABEL[r.bucket] || r.bucket || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right hidden md:table-cell">
                      <span className="text-gray-400 text-[10px]">
                        {r.estimated_price ? `$${parseFloat(r.estimated_price).toFixed(2)}` : '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right hidden lg:table-cell">
                      <span className={`text-xs ${r.confidence === 'high' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {r.confidence === 'high' ? 'Alta' : 'Media'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-gray-500 text-xs">{relativeTime(r.created_at)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

const Portfolio = () => {
  const { session } = useAuth();
  const [positions, setPositions] = useState([]);
  const [account, setAccount] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [
        { data: posData, error: posErr },
        { data: acctData },
        { data: analysisData }
      ] = await Promise.all([
        supabase.from('activos_cartera_fondo').select('*').eq('fuente', 'iuler').order('valor_total', { ascending: false }),
        supabase.from('alpaca_bot_state').select('account_equity,account_cash,account_buying_power,last_decision,lake_status,updated_at').eq('id', 1).single(),
        supabase.from('lake_trade_intentions').select('symbol,side,bucket,reason,confidence,estimated_price,estimated_qty,status,summary,created_at').eq('regime', 'open').order('created_at', { ascending: false }).limit(15)
      ]);

      if (posErr) throw posErr;

      if (acctData) {
        setAccount({
          equity: acctData.account_equity,
          cash: acctData.account_cash,
          buying_power: acctData.account_buying_power,
          last_decision: acctData.last_decision,
          lake_status: acctData.lake_status
        });
      }

      if (posData && Array.isArray(posData)) {
        const totalValue = posData.reduce((s, p) => s + parseFloat(p.valor_total || 0), 0);
        const pos = posData.map(p => ({
          symbol: p.ticker,
          qty: parseFloat(p.cantidad || 0),
          avgEntry: parseFloat(p.precio_unitario || 0),
          currentPrice: parseFloat(p.precio_unitario || 0),
          marketValue: parseFloat(p.valor_total || 0),
          unrealizedPl: 0,
          unrealizedPlPct: 0,
          side: 'long',
          type: getAssetType(p.ticker),
          pct: totalValue > 0 ? parseFloat(p.valor_total || 0) / totalValue * 100 : 0
        }));
        setPositions(pos);
      }

      if (analysisData) setAnalyses(analysisData);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const totalValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const cashAvailable = account ? parseFloat(account.cash) : 0;
  const equity = account ? parseFloat(account.equity) : 0;

  const typeGroups = {};
  positions.forEach(p => {
    if (!typeGroups[p.type]) typeGroups[p.type] = { value: 0, count: 0 };
    typeGroups[p.type].value += p.marketValue;
    typeGroups[p.type].count++;
  });
  if (cashAvailable > 0) typeGroups['Efectivo'] = { value: cashAvailable, count: 1 };
  const pieData = Object.entries(typeGroups).map(([name, d]) => ({
    name,
    value: equity > 0 ? d.value / equity * 100 : 0,
    marketValue: d.value
  })).sort((a, b) => b.value - a.value);

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-10 h-10 animate-spin text-yellow-500" /></div>;
  if (error) return <div className="text-center text-red-500 p-10 text-lg font-medium">{error}</div>;

  return (
    <div className="space-y-6 sm:space-y-10 p-1 sm:p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl sm:text-4xl font-bold text-yellow-500 tracking-wide">Cartera</h2>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-[#1a1d2b]/60 backdrop-blur-xl border border-white/10 rounded-[1.25rem] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Equity</span>
            <Wallet className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <p className="text-base sm:text-xl font-bold text-yellow-400">${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#1a1d2b]/60 backdrop-blur-xl border border-white/10 rounded-[1.25rem] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Invertido</span>
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-base sm:text-xl font-bold text-blue-400">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-gray-500">{positions.length} posiciones</p>
        </div>
        <div className="bg-[#1a1d2b]/60 backdrop-blur-xl border border-white/10 rounded-[1.25rem] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Decision Lake</span>
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          </div>
          <p className="text-base sm:text-xl font-bold text-gray-300">{account?.last_decision || '-'}</p>
          <p className="text-[9px] text-gray-500">{account?.lake_status || ''}</p>
        </div>
        <div className="bg-[#1a1d2b]/60 backdrop-blur-xl border border-white/10 rounded-[1.25rem] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Efectivo</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-base sm:text-xl font-bold text-emerald-400">${cashAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-gray-500">{equity > 0 ? (cashAvailable / equity * 100).toFixed(1) : 0}% del total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-[#1a1d2b]/60 backdrop-blur-xl rounded-[1.75rem] p-4 sm:p-6 border border-white/10">
          <h3 className="text-sm sm:text-base font-bold mb-4 text-gray-200">Distribucion por Tipo</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#0b0c10">
                  {pieData.map((e, i) => <Cell key={`t-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-600">Sin posiciones</div>
          )}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400">{d.name}</span>
                <span className="text-white font-bold">{d.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-[#1a1d2b]/60 backdrop-blur-xl rounded-[1.75rem] p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-200">Posiciones ({positions.length})</h3>
            <span className="text-[10px] text-gray-500">Fuente: Supabase</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-yellow-500/20">
                  <th className="text-left py-2 sm:py-3 px-2 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase">Activo</th>
                  <th className="text-left py-2 px-2 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase hidden sm:table-cell">Tipo</th>
                  <th className="text-right py-2 px-2 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase">Cant.</th>
                  <th className="text-right py-2 px-2 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase hidden sm:table-cell">Precio</th>
                  <th className="text-right py-2 px-2 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase">Valor</th>
                  <th className="text-right py-2 px-2 text-yellow-500/80 font-bold text-[10px] sm:text-xs uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={p.symbol} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 sm:py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-bold text-white">{p.symbol}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.type === 'ETF' ? 'bg-blue-500/20 text-blue-400' : p.type === 'REIT' ? 'bg-purple-500/20 text-purple-400' : p.type === 'Commodity' ? 'bg-amber-500/20 text-amber-400' : p.type === 'Inverso' ? 'bg-red-500/20 text-red-400' : p.type === 'Apalancado' ? 'bg-orange-500/20 text-orange-400' : p.type === 'MLP' ? 'bg-teal-500/20 text-teal-400' : 'bg-gray-500/20 text-gray-400'}`}>{p.type}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-300">{p.qty}</td>
                    <td className="py-2 px-2 text-right text-gray-300 hidden sm:table-cell">${p.currentPrice.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-white font-semibold">${p.marketValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="py-2 px-2 text-right text-yellow-400 font-bold">{p.pct.toFixed(1)}%</td>
                  </tr>
                ))}
                {cashAvailable > 0 && (
                  <tr className="border-b border-white/5">
                    <td className="py-2 sm:py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-bold text-emerald-400">USD Cash</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">Efectivo</span></td>
                    <td className="py-2 px-2 text-right text-gray-500">-</td>
                    <td className="py-2 px-2 text-right text-gray-500 hidden sm:table-cell">$1.00</td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-semibold">${cashAvailable.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-bold">{equity > 0 ? (cashAvailable / equity * 100).toFixed(1) : 0}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {positions.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Sin posiciones</p>
              <p className="text-xs mt-1">Lake abrira posiciones cuando el mercado este abierto</p>
            </div>
          )}
        </motion.div>
      </div>

      <ZBitacora analyses={analyses} />
    </div>
  );
};

export default Portfolio;