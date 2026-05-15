import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Power, PowerOff, TrendingUp, TrendingDown,
  DollarSign, Shield, AlertTriangle, RefreshCw, X,
  Zap, Clock, ArrowLeft, BarChart3, Eye, Send,
  CheckCircle2, XCircle, Loader2, Terminal, Wallet,
  Settings, PieChart, Sliders, Save, Plus, Trash2, Edit3,
  Calendar, Banknote, Sparkles, Target
} from 'lucide-react';
import LakeChat from './LakeChat';
import LakeCandidates from './LakeCandidates';

const isAdmin = (user) => user?.email === 'frerautgroups.a@gmail.com';

const GlassCard = ({ children, className = '', glow = false }) => (
  <div className={`bg-[#1a1d2b]/60 backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-3 sm:p-5 shadow-xl ${glow ? 'border-yellow-500/30 shadow-yellow-900/10' : ''} ${className}`}>
    {children}
  </div>
);

const StatBox = ({ label, value, icon: Icon, color = 'text-yellow-400', subtext }) => (
  <div className="bg-[#0f1118]/60 rounded-[1.25rem] p-3 sm:p-4 border border-white/5">
    <div className="flex items-center justify-between mb-1 sm:mb-2">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
      {Icon && <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color}`} />}
    </div>
    <p className={`text-base sm:text-xl font-bold ${color} truncate`}>{value}</p>
    {subtext && <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 sm:mt-1">{subtext}</p>}
  </div>
);

export default function LakeExecutor({ onBack }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [activePanel, setActivePanel] = useState('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [botConfig, setBotConfig] = useState(null);
  const [botState, setBotState] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [strategyAssets, setStrategyAssets] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [divCalendar, setDivCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [testResult, setTestResult] = useState(null);
  // Strategy form
  const [editStrategy, setEditStrategy] = useState(null);
  const [savingStrategy, setSavingStrategy] = useState(false);
  // Config form
  const [editConfig, setEditConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = useCallback(async () => {
    const [cfgR, stR, strR, assR, ordR, audR, divR] = await Promise.all([
      supabase.from('alpaca_bot_config').select('*').single(),
      supabase.from('alpaca_bot_state').select('*').single(),
      supabase.from('alpaca_strategies').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('alpaca_strategy_assets').select('*').order('last_updated', { ascending: false }),
      supabase.from('alpaca_trade_orders').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('alpaca_audit_log').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('dividend_calendar').select('*').order('yield_pct', { ascending: false }),
    ]);
    if (cfgR.data) setBotConfig(cfgR.data);
    if (stR.data) setBotState(stR.data);
    if (strR.data) setStrategy(strR.data);
    if (assR.data) setStrategyAssets(assR.data);
    if (ordR.data) setRecentOrders(ordR.data);
    if (audR.data) setAuditLog(audR.data);
    if (divR?.data) setDivCalendar(divR.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const ch = supabase.channel('exec_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alpaca_bot_state' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alpaca_audit_log' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alpaca_trade_orders' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  const callAlpaca = async (action, params = {}) => {
    setActionLoading(action); setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('alpaca-proxy', { body: { action, params } });
      if (error) throw error;
      setTestResult({ action, success: data?.ok !== false, data: data?.data || data, timestamp: new Date().toISOString() });
      await fetchData(); return data;
    } catch (err) {
      setTestResult({ action, success: false, error: err.message, timestamp: new Date().toISOString() });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setActionLoading(''); }
  };

  const toggleBot = async () => {
    await supabase.from('alpaca_bot_config').update({ enabled: !botConfig?.enabled, updated_at: new Date().toISOString(), updated_by: session?.user?.email }).eq('id', 1);
    await fetchData();
    toast({ title: botConfig?.enabled ? 'Bot desactivado' : 'Bot activado' });
  };

  const toggleKillSwitch = async () => {
    await supabase.from('alpaca_bot_config').update({ kill_switch: !botConfig?.kill_switch, enabled: false, updated_at: new Date().toISOString() }).eq('id', 1);
    await fetchData();
  };

  const saveStrategy = async () => {
    if (!editStrategy) return;
    setSavingStrategy(true);
    try {
      if (editStrategy.id) {
        await supabase.from('alpaca_strategies').update({ ...editStrategy, updated_at: new Date().toISOString() }).eq('id', editStrategy.id);
      } else {
        await supabase.from('alpaca_strategies').insert([{ ...editStrategy, created_by: session?.user?.email }]);
      }
      toast({ title: 'Estrategia guardada' });
      setEditStrategy(null);
      await fetchData();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSavingStrategy(false); }
  };

  const saveConfig = async () => {
    if (!editConfig) return;
    setSavingConfig(true);
    try {
      await supabase.from('alpaca_bot_config').update({ ...editConfig, updated_at: new Date().toISOString(), updated_by: session?.user?.email }).eq('id', 1);
      toast({ title: 'Configuracion guardada' });
      setEditConfig(null);
      await fetchData();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSavingConfig(false); }
  };

  const handleDistributionChange = (key, value) => {
    const v = Math.min(100, Math.max(0, parseInt(value) || 0));
    const keys = ['pct_value_investing', 'pct_trading', 'pct_dividends', 'pct_largo_plazo', 'frerautiano_budget_pct'];
    const rest = 100 - v;
    const otherKeys = keys.filter(k => k !== key);
    
    const sumOthers = otherKeys.reduce((sum, k) => sum + (editStrategy[k] || 0), 0);
    
    const newStrategy = { ...editStrategy, [key]: v };
    
    let allocated = 0;
    for (let i = 0; i < otherKeys.length - 1; i++) {
      const k = otherKeys[i];
      const ratio = sumOthers > 0 ? (editStrategy[k] || 0) / sumOthers : 1 / otherKeys.length;
      const newVal = Math.round(rest * ratio);
      newStrategy[k] = newVal;
      allocated += newVal;
    }
    newStrategy[otherKeys[otherKeys.length - 1]] = Math.max(0, rest - allocated);
    
    setEditStrategy(newStrategy);
  };

  if (loading) return <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;

  const userIsAdmin = isAdmin(session?.user);
  const valueAssets = strategyAssets.filter(a => a.bucket === 'value');
  const tradingAssets = strategyAssets.filter(a => a.bucket === 'trading');
  const dividendAssets = strategyAssets.filter(a => a.bucket === 'dividends');

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-12">
      {/* Header */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button onClick={onBack} className="p-1.5 sm:p-2 rounded-xl border border-white/10 hover:bg-white/5 flex-shrink-0"><ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" /></button>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-900/30 flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent truncate">Lake Executor</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {botState?.lake_status === 'sleeping' ? 'Durmiendo' : botState?.lake_status === 'analyzing' ? 'Analizando...' : botState?.lake_status === 'awake' ? 'Despierto' : 'Esperando'}
                  {strategy ? ` • ${strategy.name}` : ''}
                </p>
              </div>
            </div>
          </div>
          {userIsAdmin && (
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <button onClick={toggleKillSwitch} className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-2 ${botConfig?.kill_switch ? 'bg-red-600 text-white border border-red-500' : 'bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50'}`}>
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />{botConfig?.kill_switch ? 'KILL' : 'Kill'}
              </button>
              <button onClick={toggleBot} disabled={botConfig?.kill_switch} className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 shadow-lg ${botConfig?.enabled ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-900/30' : 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300'} ${botConfig?.kill_switch ? 'opacity-50' : ''}`}>
                {botConfig?.enabled ? <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <PowerOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">{botConfig?.enabled ? 'Activo' : 'Inactivo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="px-3 sm:px-6 max-w-7xl mx-auto mb-4 sm:mb-6">
        <div className="flex gap-1.5 sm:gap-2 bg-[#0f1118]/80 rounded-2xl p-1 sm:p-1.5 border border-white/5 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'strategy', label: 'Estrategia', icon: PieChart },
            { id: 'dividends', label: 'Dividendos', icon: Banknote },
            { id: 'config', label: 'Config.', icon: Settings },
            { id: 'logs', label: 'Logs', icon: Terminal },
            { id: 'radar', label: 'Radar', icon: Target },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActivePanel(tab.id)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${activePanel === tab.id ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-400 border border-yellow-500/30' : 'text-gray-500 hover:text-gray-300'}`}>
              <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{tab.label}
            </button>
          ))}
          <button onClick={() => setChatOpen(!chatOpen)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap flex-shrink-0 ${chatOpen ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-gray-300'}`}>
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Chat
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ============ DASHBOARD ============ */}
        {activePanel === 'dashboard' && (<>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <StatBox label="Modo" value={botConfig?.mode?.toUpperCase() || 'PAPER'} icon={Shield} color={botConfig?.mode === 'paper' ? 'text-amber-400' : 'text-red-400'} subtext={botConfig?.enabled ? 'Bot habilitado' : 'Bot deshabilitado'} />
            <StatBox label="Equity" value={botState?.account_equity ? `$${parseFloat(botState.account_equity).toLocaleString('es-CL')}` : '—'} icon={Wallet} color="text-green-400" />
            <StatBox label="Posicion" value={botState?.current_symbol || 'Ninguna'} icon={botState?.current_side === 'long' ? TrendingUp : Activity} color={botState?.current_symbol ? 'text-blue-400' : 'text-gray-500'} subtext={botState?.current_qty > 0 ? `${botState.current_qty} shares` : null} />
            <StatBox label="PnL Diario" value={`$${parseFloat(botState?.daily_pnl || 0).toLocaleString('es-CL')}`} icon={DollarSign} color={parseFloat(botState?.daily_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'} subtext={`${botState?.daily_trades_count || 0} trades hoy`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Ultima Decision FIRST on mobile for visibility */}
            <GlassCard className="order-1 md:order-2">
              <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Ultima Decision</h3>
              {botState?.last_decision ? (
                <div className="space-y-2 sm:space-y-3">
                  <div className={`text-xl sm:text-2xl font-bold ${botState.last_decision.includes('BUY') || botState.last_decision.includes('TRADED') ? 'text-green-400' : botState.last_decision === 'EXIT' ? 'text-red-400' : botState.last_decision === 'SLEEP' ? 'text-gray-600' : 'text-yellow-400'}`}>{botState.last_decision}</div>
                  <p className="text-xs sm:text-sm text-gray-400 break-words">{botState.last_decision_reason}</p>
                  {botState.last_decision_confidence > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full" style={{ width: `${botState.last_decision_confidence}%` }} /></div>
                      <span className="text-xs text-yellow-400 font-bold">{botState.last_decision_confidence}%</span>
                    </div>
                  )}
                </div>
              ) : <div className="text-center py-6 sm:py-8 text-gray-600"><Clock className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin decisiones aun</p></div>}
            </GlassCard>

            {/* Panel de Pruebas - collapsible on mobile */}
            <GlassCard glow className="order-2 md:order-1">
              <h3 className="text-xs sm:text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2"><Terminal className="w-4 h-4" /> Panel de Pruebas</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { action: 'get_account', label: 'Ver Cuenta', icon: Eye, color: 'yellow' },
                  { action: 'get_positions', label: 'Posiciones', icon: BarChart3, color: 'blue' },
                  { action: 'submit_order', label: 'Comprar 1 AAPL', icon: Send, color: 'green', params: { symbol: 'AAPL', qty: 1, side: 'buy' } },
                  { action: 'close_position', label: 'Cerrar AAPL', icon: X, color: 'red', params: { symbol: 'AAPL' } },
                ].map(btn => (
                  <button key={btn.action + btn.label} onClick={() => callAlpaca(btn.action, btn.params)} disabled={!!actionLoading} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-${btn.color}-500/10 border border-${btn.color}-500/30 text-${btn.color}-300 text-[10px] sm:text-xs font-bold hover:bg-${btn.color}-500/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2`}>
                    {actionLoading === btn.action ? <Loader2 className="w-3 h-3 animate-spin" /> : <btn.icon className="w-3 h-3" />}{btn.label}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {testResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-3 p-3 rounded-xl border text-[10px] sm:text-xs font-mono overflow-auto max-h-32 sm:max-h-48 ${testResult.success ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>
                    <div className="flex items-center gap-2 mb-1">{testResult.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}<span className="font-bold">{testResult.action}</span></div>
                    <pre className="whitespace-pre-wrap break-all text-[9px] sm:text-xs">{JSON.stringify(testResult.data || testResult.error, null, 2)}</pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          {/* Recent Orders */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><BarChart3 className="w-4 h-4 text-yellow-400" /> Ordenes Recientes</h3>
              <button onClick={() => callAlpaca('get_orders', { status: 'all' })} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"><RefreshCw className={`w-3 h-3 ${actionLoading === 'get_orders' ? 'animate-spin' : ''}`} /></button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentOrders.length > 0 ? recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${o.status === 'filled' ? 'bg-green-400' : o.status === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
                    <span className="text-sm font-bold">{o.symbol}</span>
                    <span className={`text-xs ${o.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{o.side?.toUpperCase()}</span>
                  </div>
                  <div className="text-right"><p className="text-xs text-gray-400">{parseFloat(o.qty)} shares</p><p className="text-[10px] text-gray-600">{new Date(o.created_at).toLocaleString('es-CL')}</p></div>
                </div>
              )) : <p className="text-center text-gray-600 py-4 text-sm">Sin ordenes</p>}
            </div>
          </GlassCard>
        </>)}

        {/* ============ STRATEGY PANEL ============ */}
        {activePanel === 'strategy' && (<>
          <GlassCard glow>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2"><PieChart className="w-5 h-5" /> Estrategia de Inversion</h3>
              {strategy && !editStrategy && (
                <button onClick={() => setEditStrategy({ ...strategy })} className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 flex items-center gap-2"><Edit3 className="w-3 h-3" /> Editar</button>
              )}
              {!strategy && !editStrategy && (
                <button onClick={() => setEditStrategy({ name: '', pct_value_investing: 35, pct_trading: 25, pct_dividends: 25, pct_largo_plazo: 10, frerautiano_budget_pct: 10, trading_style: 'momentum', value_max_positions: 10, trading_max_positions: 3, trading_max_hold_days: 5, trading_take_profit_pct: 5, trading_symbols: ['UPRO', 'SPXU', 'TQQQ', 'SQQQ', 'SPY', 'QQQ'], div_max_positions: 15, div_min_yield: 2.5, div_include_reits: true, div_include_etfs: true, div_preferred_symbols: ['VYM','SCHD','HDV','O','MAIN','STAG','ABBV','JNJ','PG','KO','PEP','T','XOM','JEPI','JEPQ'], is_active: true, frerautiano_enabled: true, frerautiano_symbols: ['UPRO'] })} className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 flex items-center gap-2"><Plus className="w-3 h-3" /> Crear Estrategia</button>
              )}
            </div>

            {editStrategy ? (
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Nombre de la estrategia</label>
                  <input value={editStrategy.name || ''} onChange={e => setEditStrategy({ ...editStrategy, name: e.target.value })} className="w-full bg-[#0f1118] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500/50 outline-none" placeholder="Ej: Estrategia Agresiva" />
                </div>

                {/* % 5-way Slider */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Distribucion de Capital</label>
                  <div className="bg-[#0f1118] rounded-2xl p-5 border border-white/5">
                    <div className="flex justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-sm text-blue-400 font-bold">Value: {editStrategy.pct_value_investing || 0}%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-sm text-amber-400 font-bold">Trading: {editStrategy.pct_trading || 0}%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-sm text-emerald-400 font-bold">Dividendos: {editStrategy.pct_dividends || 0}%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-sm text-rose-400 font-bold">Largo Plazo: {editStrategy.pct_largo_plazo || 0}%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-sm text-purple-400 font-bold">Frerautiano: {editStrategy.frerautiano_budget_pct || 0}%</span></div>
                    </div>
                    {/* Visual bar */}
                    <div className="h-8 rounded-full overflow-hidden flex mb-4">
                      {(editStrategy.pct_value_investing || 0) > 0 && <div className="bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: `${editStrategy.pct_value_investing}%` }}>{editStrategy.pct_value_investing > 10 ? `${editStrategy.pct_value_investing}%` : ''}</div>}
                      {(editStrategy.pct_trading || 0) > 0 && <div className="bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-black transition-all" style={{ width: `${editStrategy.pct_trading}%` }}>{editStrategy.pct_trading > 10 ? `${editStrategy.pct_trading}%` : ''}</div>}
                      {(editStrategy.pct_dividends || 0) > 0 && <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: `${editStrategy.pct_dividends}%` }}>{editStrategy.pct_dividends > 10 ? `${editStrategy.pct_dividends}%` : ''}</div>}
                      {(editStrategy.pct_largo_plazo || 0) > 0 && <div className="bg-gradient-to-r from-rose-600 to-rose-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: `${editStrategy.pct_largo_plazo}%` }}>{editStrategy.pct_largo_plazo > 10 ? `${editStrategy.pct_largo_plazo}%` : ''}</div>}
                      {(editStrategy.frerautiano_budget_pct || 0) > 0 && <div className="bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: `${editStrategy.frerautiano_budget_pct}%` }}>{editStrategy.frerautiano_budget_pct > 10 ? `${editStrategy.frerautiano_budget_pct}%` : ''}</div>}
                    </div>
                    {/* 5 sliders */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3"><span className="text-xs text-blue-400 w-20">Value</span><input type="range" min="0" max="100" value={editStrategy.pct_value_investing || 0} onChange={e => handleDistributionChange('pct_value_investing', e.target.value)} className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-800 accent-blue-500" /><span className="text-xs text-white w-10 text-right">{editStrategy.pct_value_investing || 0}%</span></div>
                      <div className="flex items-center gap-3"><span className="text-xs text-amber-400 w-20">Trading</span><input type="range" min="0" max="100" value={editStrategy.pct_trading || 0} onChange={e => handleDistributionChange('pct_trading', e.target.value)} className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-800 accent-amber-500" /><span className="text-xs text-white w-10 text-right">{editStrategy.pct_trading || 0}%</span></div>
                      <div className="flex items-center gap-3"><span className="text-xs text-emerald-400 w-20">Dividendos</span><input type="range" min="0" max="100" value={editStrategy.pct_dividends || 0} onChange={e => handleDistributionChange('pct_dividends', e.target.value)} className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-800 accent-emerald-500" /><span className="text-xs text-white w-10 text-right">{editStrategy.pct_dividends || 0}%</span></div>
                      <div className="flex items-center gap-3"><span className="text-xs text-rose-400 w-20">Largo Plazo</span><input type="range" min="0" max="100" value={editStrategy.pct_largo_plazo || 0} onChange={e => handleDistributionChange('pct_largo_plazo', e.target.value)} className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-800 accent-rose-500" /><span className="text-xs text-white w-10 text-right">{editStrategy.pct_largo_plazo || 0}%</span></div>
                      <div className="flex items-center gap-3"><span className="text-xs text-purple-400 w-20">Frerautiano</span><input type="range" min="0" max="100" value={editStrategy.frerautiano_budget_pct || 0} onChange={e => handleDistributionChange('frerautiano_budget_pct', e.target.value)} className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-800 accent-purple-500" /><span className="text-xs text-white w-10 text-right">{editStrategy.frerautiano_budget_pct || 0}%</span></div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-3 text-center">Total: 100% — Distribución de capital estratégico</p>
                  </div>
                </div>

                {/* Value Config */}
                <div className="bg-[#0f1118] rounded-2xl p-5 border border-blue-500/10">
                  <h4 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Value Investing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Max posiciones</label><input type="number" value={editStrategy.value_max_positions || 10} onChange={e => setEditStrategy({ ...editStrategy, value_max_positions: parseInt(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50" /></div>
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Rebalanceo (dias)</label><input type="number" value={editStrategy.value_rebalance_days || 30} onChange={e => setEditStrategy({ ...editStrategy, value_rebalance_days: parseInt(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50" /></div>
                  </div>
                </div>

                {/* Dividends Config */}
                <div className="bg-[#0f1118] rounded-2xl p-5 border border-emerald-500/10">
                  <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Dividendos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Max posiciones</label><input type="number" value={editStrategy.div_max_positions || 15} onChange={e => setEditStrategy({ ...editStrategy, div_max_positions: parseInt(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50" /></div>
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Min Yield %</label><input type="number" step="0.5" value={editStrategy.div_min_yield || 2.5} onChange={e => setEditStrategy({ ...editStrategy, div_min_yield: parseFloat(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50" /></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={editStrategy.div_include_reits !== false} onChange={e => setEditStrategy({ ...editStrategy, div_include_reits: e.target.checked })} className="rounded" /><label className="text-xs text-gray-400">Incluir REITs</label></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={editStrategy.div_include_etfs !== false} onChange={e => setEditStrategy({ ...editStrategy, div_include_etfs: e.target.checked })} className="rounded" /><label className="text-xs text-gray-400">Incluir ETFs</label></div>
                  </div>
                  <div className="mt-4">
                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Simbolos dividenderos (separados por coma)</label>
                    <input value={(editStrategy.div_preferred_symbols || []).join(', ')} onChange={e => setEditStrategy({ ...editStrategy, div_preferred_symbols: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50" placeholder="VYM, SCHD, O, MAIN, JEPI..." />
                  </div>
                </div>

                {/* Trading Config */}
                <div className="bg-[#0f1118] rounded-2xl p-5 border border-amber-500/10">
                  <h4 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2"><Zap className="w-4 h-4" /> Trading Activo</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Estilo</label>
                      <select value={editStrategy.trading_style || 'momentum'} onChange={e => setEditStrategy({ ...editStrategy, trading_style: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50">
                        <option value="momentum">Momentum</option><option value="mean_reversion">Mean Reversion</option><option value="breakout">Breakout</option><option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Max posiciones</label><input type="number" value={editStrategy.trading_max_positions || 3} onChange={e => setEditStrategy({ ...editStrategy, trading_max_positions: parseInt(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50" /></div>
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Max dias hold</label><input type="number" value={editStrategy.trading_max_hold_days || 5} onChange={e => setEditStrategy({ ...editStrategy, trading_max_hold_days: parseInt(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50" /></div>
                    <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Take Profit %</label><input type="number" step="0.5" value={editStrategy.trading_take_profit_pct || 5} onChange={e => setEditStrategy({ ...editStrategy, trading_take_profit_pct: parseFloat(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50" /></div>
                  </div>
                  <div className="mt-4">
                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Simbolos permitidos (separados por coma)</label>
                    <input value={(editStrategy.trading_symbols || []).join(', ')} onChange={e => setEditStrategy({ ...editStrategy, trading_symbols: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50" placeholder="UPRO, SPXU, SPY, QQQ" />
                  </div>
                </div>

                {/* Frerautiano Config */}
                <div className="bg-[#0f1118] rounded-2xl p-5 border border-purple-500/10">
                  <h4 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Trading Frerautiano
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">HABILITADO</label>
                      <button
                        onClick={() => setEditStrategy({...editStrategy, frerautiano_enabled: !editStrategy.frerautiano_enabled})}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${editStrategy.frerautiano_enabled !== false ? 'bg-purple-500/20 border border-purple-500/40 text-purple-400' : 'bg-gray-800 border border-white/5 text-gray-500'}`}
                      >
                        {editStrategy.frerautiano_enabled !== false ? '⚡ Activo' : 'Desactivado'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">PRESUPUESTO %</label>
                      <input type="number" min="0" max="100" value={editStrategy.frerautiano_budget_pct || 0} onChange={e => handleDistributionChange('frerautiano_budget_pct', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">SÍMBOLO (BULL ONLY)</label>
                      <input type="text" value={(editStrategy.frerautiano_symbols || ['UPRO']).join(', ')} onChange={F => setEditStrategy({...editStrategy, frerautiano_symbols: F.target.value.split(',').map(s => s.trim())})} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 text-white text-sm" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">El bot opera UPRO (3x bull S&P 500). Sin stop-loss, si cae se promedia (DCA). Compra en correcciones de tendencias alcistas.</p>
                </div>

                {/* Save buttons */}
                <div className="flex gap-3">
                  <button onClick={saveStrategy} disabled={savingStrategy || !editStrategy.name} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold text-sm flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50">
                    {savingStrategy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Estrategia
                  </button>
                  <button onClick={() => setEditStrategy(null)} className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5">Cancelar</button>
                </div>
              </div>
            ) : strategy ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-bold text-white">{strategy.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg ${strategy.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{strategy.is_active ? 'Activa' : 'Inactiva'}</span>
                </div>
                {/* Visual distribution bar - 5 strategies */}
                <div className="bg-[#0f1118] rounded-2xl p-5 border border-white/5">
                  <div className="h-8 rounded-full overflow-hidden flex">
                    {(strategy.pct_value_investing || 0) > 0 && <div className="bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${strategy.pct_value_investing}%` }}>{strategy.pct_value_investing > 8 ? `${strategy.pct_value_investing}% Value` : ''}</div>}
                    {(strategy.pct_trading || 0) > 0 && <div className="bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center text-xs font-bold text-black" style={{ width: `${strategy.pct_trading}%` }}>{strategy.pct_trading > 8 ? `${strategy.pct_trading}% Trading` : ''}</div>}
                    {(strategy.pct_dividends || 0) > 0 && <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${strategy.pct_dividends}%` }}>{strategy.pct_dividends > 8 ? `${strategy.pct_dividends}% Div` : ''}</div>}
                    {(strategy.pct_largo_plazo || 0) > 0 && <div className="bg-gradient-to-r from-rose-600 to-rose-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${strategy.pct_largo_plazo}%` }}>{strategy.pct_largo_plazo > 8 ? `${strategy.pct_largo_plazo}% LP` : ''}</div>}
                    {(strategy.frerautiano_budget_pct || 0) > 0 && <div className="bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${strategy.frerautiano_budget_pct}%` }}>{strategy.frerautiano_budget_pct > 8 ? `${strategy.frerautiano_budget_pct}% Freraut` : ''}</div>}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 text-center">Distribución de capital estratégico</p>
                </div>
                {/* Assets in each bucket */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-[#0f1118] rounded-2xl p-4 border border-blue-500/10">
                    <h4 className="text-xs font-bold text-blue-400 uppercase mb-3">Value ({valueAssets.length})</h4>
                    {valueAssets.length > 0 ? valueAssets.map(a => (
                      <div key={a.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-sm font-bold text-white">{a.symbol}</span>
                        <span className="text-xs text-gray-400">{a.qty} shares</span>
                      </div>
                    )) : <p className="text-xs text-gray-600">Lake buscara value</p>}
                  </div>
                  <div className="bg-[#0f1118] rounded-2xl p-4 border border-amber-500/10">
                    <h4 className="text-xs font-bold text-amber-400 uppercase mb-3">Trading ({tradingAssets.length})</h4>
                    {tradingAssets.length > 0 ? tradingAssets.map(a => (
                      <div key={a.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-sm font-bold text-white">{a.symbol}</span>
                        <span className="text-xs text-gray-400">{a.qty} sh</span>
                      </div>
                    )) : <p className="text-xs text-gray-600">Lake tradea automatico</p>}
                  </div>
                  <div className="bg-[#0f1118] rounded-2xl p-4 border border-emerald-500/10">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase mb-3">Dividendos ({dividendAssets.length})</h4>
                    {dividendAssets.length > 0 ? dividendAssets.map(a => (
                      <div key={a.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-sm font-bold text-white">{a.symbol}</span>
                        <span className="text-xs text-gray-400">{a.qty} sh</span>
                      </div>
                    )) : <p className="text-xs text-gray-600">Lake buscara dividenderas</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-black/20 rounded-xl p-3"><p className="text-gray-500">Estilo trading</p><p className="text-white font-bold mt-1">{strategy.trading_style}</p></div>
                  <div className="bg-black/20 rounded-xl p-3"><p className="text-gray-500">Max Hold</p><p className="text-amber-400 font-bold mt-1">{strategy.trading_max_hold_days} dias</p></div>
                  <div className="bg-black/20 rounded-xl p-3"><p className="text-gray-500">Take Profit</p><p className="text-green-400 font-bold mt-1">{strategy.trading_take_profit_pct}%</p></div>
                  <div className="bg-black/20 rounded-xl p-3"><p className="text-gray-500">Simbolos</p><p className="text-yellow-400 font-bold mt-1">{(strategy.trading_symbols || []).length}</p></div>
                </div>
                {/* Largo Plazo card */}
                <div className="bg-[#0f1118] rounded-2xl p-4 border border-rose-500/10">
                  <h4 className="text-xs font-bold text-rose-400 uppercase mb-2">Largo Plazo</h4>
                  <p className="text-xs text-gray-400">Compra oportunista. Solo se vende la ganancia, nunca la posicion base.</p>
                </div>
              </div>
            ) : <div className="text-center py-12 text-gray-600"><PieChart className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No hay estrategia configurada</p><p className="text-xs mt-1">Crea una para que Lake sepa como operar</p></div>}
          </GlassCard>
        </>)}

        {/* ============ DIVIDENDS CALENDAR ============ */}
        {activePanel === 'dividends' && (() => {
          const held = divCalendar.filter(d => d.shares_held > 0);
          const heldMonthly = held.filter(d => d.frequency === 'monthly');
          const heldQuarterly = held.filter(d => d.frequency === 'quarterly');
          const heldOther = held.filter(d => d.frequency !== 'monthly' && d.frequency !== 'quarterly');
          return (<>
          <GlassCard glow>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2"><Banknote className="w-5 h-5" /> Calendario de Dividendos</h3>
              <span className="text-xs text-gray-500">{held.length} activos en cartera</span>
            </div>

            {held.length === 0 ? (
              <div className="text-center py-16">
                <Banknote className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400 font-bold text-lg mb-2">Sin posiciones de dividendos</p>
                <p className="text-xs text-gray-600 max-w-md mx-auto">Cuando Lake adquiera acciones de dividendos, apareceran aqui automaticamente con su calendario de pagos estimado.</p>
              </div>
            ) : (<>

            {/* Monthly calendar grid - only shows held positions */}
            <div className="bg-[#0f1118] rounded-2xl p-5 border border-emerald-500/10 mb-6">
              <h4 className="text-sm font-bold text-white mb-4">Tus Pagos por Mes</h4>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((month, mi) => {
                  const monthNum = mi + 1;
                  const payersThisMonth = held.filter(d => d.payment_months && d.payment_months.includes(monthNum));
                  const isCurrentMonth = new Date().getMonth() === mi;
                  const estIncome = payersThisMonth.reduce((s, d) => s + (d.shares_held * (d.annual_dividend_usd || 0) / (d.frequency === 'monthly' ? 12 : d.frequency === 'quarterly' ? 4 : 1)), 0);
                  return (
                    <div key={month} className={`rounded-xl p-3 text-center border transition-all ${
                      isCurrentMonth ? 'border-emerald-500/50 bg-emerald-500/10' :
                      payersThisMonth.length > 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-transparent opacity-40'
                    }`}>
                      <p className={`text-xs font-bold mb-1 ${isCurrentMonth ? 'text-emerald-400' : 'text-gray-400'}`}>{month}</p>
                      <p className={`text-lg font-bold ${payersThisMonth.length > 0 ? 'text-emerald-400' : 'text-gray-700'}`}>{payersThisMonth.length}</p>
                      {payersThisMonth.length > 0 ? (
                        <p className="text-[8px] text-emerald-400/70">${estIncome.toFixed(0)}</p>
                      ) : (
                        <p className="text-[8px] text-gray-700">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly payers owned */}
            {heldMonthly.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Mensuales ({heldMonthly.length})</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {heldMonthly.map(d => (
                  <div key={d.id} className="bg-[#0f1118] rounded-xl p-4 border border-emerald-500/30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-bold text-white">{d.symbol}</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-2">MENSUAL</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">{d.yield_pct ? `${d.yield_pct}%` : '—'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">{d.name || d.sector}</p>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Div/yr: ${d.annual_dividend_usd || '—'}</span>
                      <span className="text-emerald-400 font-bold">{d.shares_held} shares</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-[9px] text-emerald-400/80">~${((d.shares_held * (d.annual_dividend_usd || 0)) / 12).toFixed(2)}/mes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>)}

            {/* Quarterly payers owned */}
            {heldQuarterly.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-blue-400 mb-3">Trimestrales ({heldQuarterly.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-gray-500 font-bold">Simbolo</th>
                      <th className="text-left py-2 text-gray-500">Sector</th>
                      <th className="text-left py-2 text-gray-500">Tipo</th>
                      <th className="text-right py-2 text-gray-500">Yield</th>
                      <th className="text-right py-2 text-gray-500">Div/yr</th>
                      <th className="text-center py-2 text-gray-500">Meses</th>
                      <th className="text-right py-2 text-gray-500">Shares</th>
                      <th className="text-right py-2 text-gray-500">$/trim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heldQuarterly.map(d => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 font-bold text-white">{d.symbol}</td>
                        <td className="py-2 text-gray-400">{d.sector}</td>
                        <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-[9px] ${d.asset_type === 'reit' || d.asset_type === 'REIT' ? 'bg-purple-500/20 text-purple-400' : d.asset_type === 'etf' || d.asset_type === 'ETF' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{d.asset_type?.toUpperCase()}</span></td>
                        <td className="py-2 text-right text-emerald-400 font-bold">{d.yield_pct ? `${d.yield_pct}%` : '—'}</td>
                        <td className="py-2 text-right text-gray-300">${d.annual_dividend_usd || '—'}</td>
                        <td className="py-2 text-center">
                          <div className="flex gap-0.5 justify-center">
                            {(d.payment_months || []).map((m, i) => (
                              <span key={i} className={`w-5 h-5 rounded text-[8px] flex items-center justify-center ${new Date().getMonth() + 1 === m ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-gray-500'}`}>{m}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 text-right text-emerald-400 font-bold">{d.shares_held}</td>
                        <td className="py-2 text-right text-emerald-400">${((d.shares_held * (d.annual_dividend_usd || 0)) / 4).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>)}

            {/* Other frequency */}
            {heldOther.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-amber-400 mb-3">Otros ({heldOther.length})</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {heldOther.map(d => (
                  <div key={d.id} className="bg-[#0f1118] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{d.symbol}</span>
                      <span className="text-emerald-400 font-bold text-xs">{d.shares_held} shares</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{d.name || d.frequency}</p>
                  </div>
                ))}
              </div>
            </div>)}

            {/* Income estimate */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/5 rounded-2xl p-5 border border-emerald-500/20">
              <h4 className="text-sm font-bold text-emerald-400 mb-3">Ingreso Estimado por Dividendos</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">Mensual</p>
                  <p className="text-xl font-bold text-emerald-400">${(held.reduce((s, d) => s + (d.shares_held * (d.annual_dividend_usd || 0) / 12), 0)).toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">Trimestral</p>
                  <p className="text-xl font-bold text-emerald-400">${(held.reduce((s, d) => s + (d.shares_held * (d.annual_dividend_usd || 0) / 4), 0)).toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">Anual</p>
                  <p className="text-xl font-bold text-yellow-400">${(held.reduce((s, d) => s + (d.shares_held * (d.annual_dividend_usd || 0)), 0)).toFixed(2)}</p>
                </div>
              </div>
            </div>

            </>)}
          </GlassCard>
        </>);})()}

        {/* ============ CONFIG PANEL ============ */}
        {activePanel === 'config' && botConfig && (<>
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2"><Shield className="w-5 h-5" /> Risk Engine</h3>
              {!editConfig ? (
                <button onClick={() => setEditConfig({ ...botConfig })} className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 flex items-center gap-2"><Edit3 className="w-3 h-3" /> Editar</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveConfig} disabled={savingConfig} className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-xs font-bold flex items-center gap-2">{savingConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar</button>
                  <button onClick={() => setEditConfig(null)} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-xs">Cancelar</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'max_trades_per_day', label: 'Max trades/dia', type: 'number' },
                { key: 'max_daily_loss', label: 'Max perdida diaria ($)', type: 'number', step: '50' },
                { key: 'cooldown_after_loss_minutes', label: 'Cooldown (min)', type: 'number' },
                { key: 'max_position_qty', label: 'Max posicion (shares)', type: 'number' },
                { key: 'trading_start_hour', label: 'Hora inicio', type: 'number' },
                { key: 'trading_start_minute', label: 'Minuto inicio', type: 'number' },
                { key: 'trading_end_hour', label: 'Hora fin', type: 'number' },
                { key: 'trading_end_minute', label: 'Minuto fin', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">{f.label}</label>
                  {editConfig ? (
                    <input type={f.type} step={f.step} value={editConfig[f.key] ?? ''} onChange={e => setEditConfig({ ...editConfig, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value })} className="w-full bg-[#0f1118] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50" />
                  ) : (
                    <p className={`text-sm font-bold ${f.key.includes('loss') ? 'text-red-400' : 'text-white'}`}>{f.key.includes('loss') ? `$${Math.abs(botConfig[f.key])}` : botConfig[f.key]}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[#0f1118] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Modo</p>
                <p className="text-amber-400 font-bold">{botConfig.mode?.toUpperCase()}</p>
              </div>
              <div className="bg-[#0f1118] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Ultima actualizacion</p>
                <p className="text-gray-400 text-xs">{botConfig.updated_at ? new Date(botConfig.updated_at).toLocaleString('es-CL') : '—'}</p>
              </div>
            </div>
          </GlassCard>
        </>)}

        {/* ============ LOGS PANEL ============ */}
        {activePanel === 'logs' && (
          <GlassCard>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Terminal className="w-4 h-4 text-yellow-400" /> Audit Log</h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {auditLog.map(l => (
                <div key={l.id} className="p-3 rounded-xl bg-black/20 border border-white/5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${l.action.includes('error') ? 'text-red-400' : l.action.includes('wake') ? 'text-green-400' : 'text-yellow-400'}`}>{l.action}</span>
                    <span className="text-gray-600">{new Date(l.created_at).toLocaleString('es-CL')}</span>
                  </div>
                  {l.error && <p className="text-red-400">{l.error}</p>}
                  {l.details && <details className="mt-1"><summary className="text-gray-500 cursor-pointer hover:text-gray-400">Detalles</summary><pre className="mt-1 text-[10px] text-gray-500 whitespace-pre-wrap break-all max-h-32 overflow-auto">{JSON.stringify(l.details, null, 2)}</pre></details>}
                </div>
              ))}
              {auditLog.length === 0 && <p className="text-center text-gray-600 py-4">Sin registros</p>}
            </div>
          </GlassCard>
        )}

        {/* ============ RADAR PANEL ============ */}
        {activePanel === 'radar' && (
          <LakeCandidates />
        )}
      </div>
      
      {chatOpen && <LakeChat onClose={() => setChatOpen(false)} />}
    </div>
  );
}