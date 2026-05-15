import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Shield, Zap, TrendingUp, TrendingDown, Clock, Activity, Target, Eye, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const diff = (new Date() - new Date(dateString)) / 1000;
  if (diff < 60) return rtf.format(-Math.floor(diff), 'second');
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
  return rtf.format(-Math.floor(diff / 86400), 'day');
};

const GlassCard = ({ children, className = '', glow = false, purpleGlow = false }) => (
  <div className={`bg-[#1a1d2b]/60 backdrop-blur-xl border rounded-[1.75rem] p-4 sm:p-5 shadow-xl transition-all duration-300 
    ${purpleGlow ? 'border-purple-500/40 shadow-purple-900/20 bg-gradient-to-b from-purple-900/10 to-transparent' : 
      glow ? 'border-yellow-500/30 shadow-yellow-900/10' : 'border-white/10'} ${className}`}>
    {children}
  </div>
);

const SignalBadge = ({ strength }) => {
  const map = {
    strong_bull: { t: 'SEÑAL FUERTE BULL', c: 'bg-green-500/20 text-green-400 border-green-500/50' },
    strong_bear: { t: 'SEÑAL FUERTE BEAR', c: 'bg-red-500/20 text-red-400 border-red-500/50' },
    warming_bull: { t: 'CALENTANDO BULL', c: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
    warming_bear: { t: 'CALENTANDO BEAR', c: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
    in_position: { t: 'EN POSICIÓN', c: 'bg-purple-500/20 text-purple-400 border-purple-500/50' }
  };
  const b = map[strength] || { t: 'ESCANEANDO', c: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
  return <span className={`px-2.5 py-1 rounded-md border font-bold tracking-wide text-xs ${b.c}`}>{b.t}</span>;
};

const MacroBadge = ({ regime }) => {
  const c = regime === 'risk_on' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
            regime === 'risk_off' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
            'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  return <span className={`px-2 py-1 rounded border font-medium text-xs ${c}`}>{regime ? regime.toUpperCase().replace('_', ' ') : 'NEUTRAL'}</span>;
};

const FuelBar = ({ type, fuel, threshold, trend }) => {
  const isBull = type === 'BULL';
  const Icon = isBull ? TrendingUp : TrendingDown;
  const textClass = isBull ? 'text-green-400' : 'text-red-400';
  const bgClass = isBull ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400';
  const getTrendText = (f) => f >= 65 ? 'ready' : f >= 50 ? 'approaching' : f >= 30 ? 'building' : 'weak';
  
  return (
    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
      <div className="flex justify-between items-end mb-2">
        <span className={`text-sm font-bold flex items-center gap-2 ${textClass}`}><Icon className="w-4 h-4"/> {type} FUEL</span>
        <span className="text-xl font-black text-white">{fuel}</span>
      </div>
      <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ease-out ${bgClass}`} style={{ width: `${fuel}%` }} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ left: `${threshold}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">0</span>
        <span className={`font-bold ${fuel >= threshold ? `${textClass} animate-pulse` : 'text-gray-400'}`}>{trend || getTrendText(fuel)}</span>
        <span className="text-gray-500">100</span>
      </div>
    </div>
  );
};

const ETFRow = ({ symbol, price, fuel, trend, low, high, status, isBull }) => {
  const getTrendIcon = (f) => f > 60 ? '↑↑' : f > 40 ? '↑' : f < 30 ? '↓' : '→';
  const getTrendText = (f) => f >= 65 ? 'ready' : f >= 50 ? 'approaching' : f >= 30 ? 'building' : 'weak';
  const tc = isBull ? 'text-green-400' : 'text-red-400';
  
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className={`px-4 py-3 font-bold ${tc}`}>{symbol}</td>
      <td className="px-4 py-3 text-white">${price?.toFixed(2) || '---'}</td>
      <td className={`px-4 py-3 font-mono ${isBull ? 'text-green-300' : 'text-red-300'}`}>{fuel} <span className="text-[10px]">{getTrendIcon(fuel)}</span></td>
      <td className="px-4 py-3 text-xs">{trend || getTrendText(fuel)}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{low ? `$${low} - $${high}` : '---'}</td>
      <td className="px-4 py-3 text-xs">{status ? <span className={`${tc} flex items-center gap-1`}><Eye className="w-3 h-3"/> Watching</span> : 'Idle'}</td>
    </tr>
  );
};

const AnalysisSection = ({ details, analyzing, onAnalyze }) => (
  <div className="mt-4">
    {details?.analysis ? (
      <div className="bg-black/30 rounded-xl p-4 border-l-4 border-purple-500 border-y border-r border-white/5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> 🧠 ANÁLISIS DE LAKE</h3>
          <button onClick={onAnalyze} disabled={analyzing} className="flex items-center gap-1 px-2 py-1 text-[10px] text-white bg-purple-600 rounded hover:bg-purple-500 disabled:opacity-50">
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} Re-analizar
          </button>
        </div>
        <div className="text-sm text-gray-300 whitespace-pre-wrap mb-4 leading-relaxed">{details.analysis}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
            <span className="text-green-400 font-bold block mb-1">UPRO Setup</span>
            <p className="text-gray-400">TP: <span className="text-green-300">{details.upro_take_profit || '-'}</span></p>
            <p className="text-gray-400">SL: <span className="text-red-300">{details.upro_stop_loss || '-'}</span></p>
          </div>
          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
            <span className="text-red-400 font-bold block mb-1">SPXU Setup</span>
            <p className="text-gray-400">TP: <span className="text-green-300">{details.spxu_take_profit || '-'}</span></p>
            <p className="text-gray-400">SL: <span className="text-red-300">{details.spxu_stop_loss || '-'}</span></p>
          </div>
          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
            <span className="text-purple-400 font-bold block mb-1">SPY Context</span>
            <p className="text-gray-400">RSI: <span className="text-white">{details.spy_rsi || '-'}</span></p>
            <p className="text-gray-400">Vol: <span className="text-white">{details.volume_ratio || '-'}</span></p>
            <p className="text-gray-400">S/R: <span className="text-white">{details.support || '-'} / {details.resistance || '-'}</span></p>
          </div>
        </div>
        {details.timestamp && <div className="mt-3 text-[10px] text-gray-500 text-right">Actualizado: {new Date(details.timestamp).toLocaleString()}</div>}
      </div>
    ) : (
      <button onClick={onAnalyze} disabled={analyzing} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg hover:from-purple-500 transition-all disabled:opacity-50">
        {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {analyzing ? 'Analizando...' : 'Análisis Profundo'}
      </button>
    )}
  </div>
);

const CandidatesSection = ({ parsedData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
    <GlassCard className="lg:col-span-2" glow>
      <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Radar de Candidatos</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead><tr className="text-gray-500 border-b border-white/5"><th className="pb-2 font-medium">Símbolo</th><th className="pb-2 font-medium">Score</th><th className="pb-2 font-medium">Señal</th><th className="pb-2 font-medium">Tiempo</th></tr></thead>
          <tbody>
            <AnimatePresence>
              {parsedData.candidates.length > 0 ? parsedData.candidates.map((c, i) => (
                <motion.tr key={`${c.symbol}-${i}-${c.time}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 font-bold text-white">{c.symbol}</td>
                  <td className="py-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${c.score >= 70 ? 'bg-green-500/20 text-green-400' : c.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{c.score || 'N/A'}</span></td>
                  <td className="py-3 text-gray-300 text-xs">{c.signal || 'EVAL'}</td>
                  <td className="py-3 text-gray-500 text-xs">{formatTime(c.time) || 'Reciente'}</td>
                </motion.tr>
              )) : <tr><td colSpan="4" className="py-4 text-center text-gray-600 text-xs">Sin candidatos</td></tr>}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </GlassCard>
    <GlassCard>
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Descartados</h3>
      <div className="space-y-3">
        {parsedData.skipped.length > 0 ? parsedData.skipped.map((s, i) => (
          <div key={`${s.symbol}-${i}`} className="bg-black/20 rounded-xl p-3 border border-white/5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2"><span className="font-bold text-red-400">{s.symbol}</span>{s.score && <span className="text-[10px] text-gray-500">Score: {s.score}</span>}</div>
              <p className="text-xs text-gray-400 mt-1">{s.reason}</p>
            </div>
            <span className="text-[10px] text-gray-600">{formatTime(s.time)}</span>
          </div>
        )) : <p className="text-center text-gray-600 text-xs py-4">Sin descartes</p>}
      </div>
    </GlassCard>
    <div className="space-y-4">
      <GlassCard>
        <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Compras Recientes</h3>
        <div className="space-y-2">{parsedData.buys.length > 0 ? parsedData.buys.map((b, i) => (
          <div key={`${b.symbol}-${i}`} className="flex justify-between items-center bg-green-500/10 p-2 rounded-lg border border-green-500/20">
            <span className="font-bold text-green-400">{b.symbol}</span><span className="text-xs text-green-400/70">{b.qty} sh • {formatTime(b.time)}</span>
          </div>
        )) : <p className="text-center text-gray-600 text-xs py-2">Sin compras</p>}</div>
      </GlassCard>
      <GlassCard>
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Ventas Recientes</h3>
        <div className="space-y-2">{parsedData.sells.length > 0 ? parsedData.sells.map((s, i) => (
          <div key={`${s.symbol}-${i}`} className="flex justify-between items-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            <div className="flex flex-col"><span className="font-bold text-red-400">{s.symbol}</span><span className="text-[10px] text-red-400/50">{s.reason}</span></div>
            <span className="text-xs text-red-400/70">{s.qty} sh • {formatTime(s.time)}</span>
          </div>
        )) : <p className="text-center text-gray-600 text-xs py-2">Sin ventas</p>}</div>
      </GlassCard>
    </div>
  </div>
);

export default function LakeCandidates() {
  const [botState, setBotState] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [lakeSignal, setLakeSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async () => {
    try {
      const [stateRes, logsRes, signalRes] = await Promise.all([
        supabase.from('alpaca_bot_state').select('*').single(),
        supabase.from('alpaca_audit_log').select('action, details, created_at').in('action', ['discovery', 'run', 'eval_buy', 'skip_buy', 'eval_sell']).order('created_at', { ascending: false }).limit(50),
        supabase.from('lake_signals').select('*').eq('id', 'frerautiano').single()
      ]);
      if (stateRes.data) setBotState(stateRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data);
      if (signalRes.data) setLakeSignal(signalRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const runDeepAnalysis = async () => {
    setAnalyzing(true);
    try {
      await supabase.functions.invoke('lake-deep-analysis');
      await fetchData();
    } catch (err) { console.error(err); } finally { setAnalyzing(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const ch = supabase.channel('candidates_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alpaca_audit_log' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alpaca_bot_state' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lake_signals' }, fetchData).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, []);

  const parseLogs = () => {
    const candidates = [], skipped = [], buys = [], sells = [];
    auditLogs.forEach(log => {
      if (!log.details) return;
      const { symbol, score, signal, reason } = log.details;
      if (log.action === 'discovery' && log.details.candidates) candidates.push(...log.details.candidates);
      else if (log.action === 'eval_buy' && score) candidates.push({ symbol, score, signal, reason, time: log.created_at });
      else if (log.action === 'skip_buy') skipped.push({ symbol, reason, score, time: log.created_at });
      else if (log.action === 'run' && log.details.decision === 'BUY') buys.push({ symbol: log.details.symbol, qty: log.details.qty, time: log.created_at });
      else if (log.action === 'run' && log.details.decision === 'EXIT') sells.push({ symbol: log.details.symbol, qty: log.details.qty, reason: log.details.reason, time: log.created_at });
    });
    return { candidates: candidates.slice(0, 10), skipped: skipped.slice(0, 10), buys: buys.slice(0, 5), sells: sells.slice(0, 5) };
  };

  if (loading) return <div className="p-8 text-center text-yellow-500 animate-pulse">Cargando radares...</div>;
  const parsedData = parseLogs();
  const th = lakeSignal?.entry_threshold || 65;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <GlassCard purpleGlow className="border-l-4 border-l-purple-500 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-4"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-purple-400" /> RADAR FRERAUTIANO</h2></div>
            <div className="flex items-center gap-3 mt-2 text-xs"><SignalBadge strength={lakeSignal?.signal_strength} /><MacroBadge regime={lakeSignal?.macro_regime} /></div>
          </div>
          <div className="flex flex-col items-start md:items-end text-sm">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-gray-400">SPY:</span><span className="font-bold text-white">${lakeSignal?.spy_price?.toFixed(2) || '---'}</span>
              {lakeSignal?.spy_day_move_pct !== undefined && <span className={`font-medium ${lakeSignal.spy_day_move_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{lakeSignal.spy_day_move_pct >= 0 ? '+' : ''}{lakeSignal.spy_day_move_pct}%</span>}
            </div>
            <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Actualizado {formatTime(lakeSignal?.updated_at || new Date().toISOString())}</div>
          </div>
        </div>

        <AnimatePresence>
          {lakeSignal?.current_side && lakeSignal.current_side !== 'none' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 bg-purple-500/20 border border-purple-500/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-400/50"><Activity className="w-4 h-4 text-purple-300" /></div>
                <div><span className="text-xs text-purple-300 uppercase tracking-wider font-bold block">En Posición</span><span className="text-base font-bold text-white">{lakeSignal.current_symbol}</span></div>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold ${lakeSignal.current_pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{lakeSignal.current_pnl_pct >= 0 ? '+' : ''}{lakeSignal.current_pnl_pct}% PnL</span>
                <span className="text-xs text-purple-300 block">Fuel: {lakeSignal.current_side === 'bull' ? lakeSignal.bull_fuel : lakeSignal.bear_fuel}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <FuelBar type="BULL" fuel={lakeSignal?.bull_fuel || 0} threshold={th} trend={lakeSignal?.bull_trend} />
          <FuelBar type="BEAR" fuel={lakeSignal?.bear_fuel || 0} threshold={th} trend={lakeSignal?.bear_trend} />
        </div>

        <div className="overflow-x-auto bg-black/20 rounded-xl border border-white/5 mb-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead><tr className="text-gray-400 border-b border-white/5 bg-white/5"><th className="px-4 py-3 font-medium">Símbolo</th><th className="px-4 py-3 font-medium">Precio</th><th className="px-4 py-3 font-medium">Fuel</th><th className="px-4 py-3 font-medium">Trend</th><th className="px-4 py-3 font-medium">Rango Atractivo</th><th className="px-4 py-3 font-medium">Estado</th></tr></thead>
            <tbody>
              <ETFRow isBull symbol="UPRO" price={lakeSignal?.upro_price} fuel={lakeSignal?.bull_fuel || 0} trend={lakeSignal?.bull_trend} low={lakeSignal?.upro_attractive_low} high={lakeSignal?.upro_attractive_high} status={lakeSignal?.status === 'watching_bull'} />
              <ETFRow isBull={false} symbol="SPXU" price={lakeSignal?.spxu_price} fuel={lakeSignal?.bear_fuel || 0} trend={lakeSignal?.bear_trend} low={lakeSignal?.spxu_attractive_low} high={lakeSignal?.spxu_attractive_high} status={lakeSignal?.status === 'watching_bear'} />
            </tbody>
          </table>
        </div>

        <div className="bg-[#0b0c10] rounded-xl p-3 border border-white/5 flex items-start gap-3">
          <Target className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold block mb-1">Próxima Acción del Bot</span>
            <span className="font-mono text-sm text-purple-200 break-all">{lakeSignal?.next_action || 'Esperando oportunidades...'}</span>
          </div>
        </div>

        {lakeSignal?.gap_pct !== undefined && Math.abs(lakeSignal.gap_pct) >= 0.1 && (
          <div className="mt-4 bg-black/30 rounded-xl p-4 border border-cyan-500/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> GAP INTELLIGENCE
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                lakeSignal.gap_conviction === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                lakeSignal.gap_conviction === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                CONVICCIÓN {lakeSignal.gap_conviction || 'LOW'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Gap %</span>
                <span className={`font-mono text-sm ${lakeSignal.gap_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {lakeSignal.gap_pct > 0 ? '+' : ''}{lakeSignal.gap_pct}%
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Dirección</span>
                <span className="font-mono text-sm text-white">{lakeSignal.gap_direction || '-'}</span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Vol Premarket</span>
                <span className="font-mono text-sm text-white">{lakeSignal.premarket_volume_ratio ? `${lakeSignal.premarket_volume_ratio}x` : '-'}</span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Estrategia</span>
                <span className="font-mono text-sm text-cyan-300 truncate" title={lakeSignal.gap_strategy}>{lakeSignal.gap_strategy || '-'}</span>
              </div>
            </div>

            {lakeSignal.gap_entry_symbol && (
              <div className="bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/10 mb-4 flex flex-wrap gap-4 items-center">
                <div>
                  <span className="text-[10px] text-cyan-500 uppercase block">Target Entry</span>
                  <span className="font-bold text-cyan-400">{lakeSignal.gap_entry_symbol} @ ${lakeSignal.gap_entry_price_target || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-green-500/70 uppercase block">Take Profit</span>
                  <span className="font-mono text-sm text-green-400">${lakeSignal.gap_take_profit || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-red-500/70 uppercase block">Stop Loss</span>
                  <span className="font-mono text-sm text-red-400">${lakeSignal.gap_stop_loss || '-'}</span>
                </div>
              </div>
            )}

            {lakeSignal.gap_analysis && (
              <p className="text-xs text-gray-300 leading-relaxed mb-3">
                {lakeSignal.gap_analysis}
              </p>
            )}

            {lakeSignal.overnight_news && lakeSignal.overnight_news.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Overnight Catalysts</span>
                <ul className="list-disc list-inside text-xs text-gray-400 ml-4 space-y-1">
                  {lakeSignal.overnight_news.map((news, idx) => (
                    <li key={idx}>{news}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <AnalysisSection details={lakeSignal?.details} analyzing={analyzing} onAnalyze={runDeepAnalysis} />
      </GlassCard>

      <CandidatesSection parsedData={parsedData} />
    </div>
  );
}