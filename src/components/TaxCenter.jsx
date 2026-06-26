import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Receipt, Calculator, TrendingUp, TrendingDown,
  DollarSign, Percent, ChevronDown, ChevronUp, RefreshCw,
  FileText, AlertCircle, Loader2, Calendar, ToggleLeft,
  ToggleRight, Table2, ChevronRight,
  Bot, Search, Send, Terminal, MonitorPlay, Play, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const isAdmin = (user) => user?.email === 'frerautgroups.a@gmail.com';

const fmt = (value, currency = 'USD', decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return 'â€”';
  const abs = Math.abs(parseFloat(value));
  const formatted = abs.toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (currency === 'USD') return `$${formatted}`;
  if (currency === 'CLP') return `$${formatted} CLP`;
  return formatted;
};

const fmtCLP = (usd, rate) => {
  if (!rate || usd === null || usd === undefined || isNaN(usd)) return '—';
  return `$${(parseFloat(usd) * rate).toLocaleString('es-CL', { maximumFractionDigits: 0 })} CLP`;
};

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR];

// Approximate CLP/USD rate (static fallback â€“ real app would fetch live)
const FALLBACK_FX_RATE = 920;

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const GlassCard = ({ children, className = '', glow = false }) => (
  <div className={`bg-[#1a1d2b]/60 backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-5 shadow-xl ${glow ? 'border-yellow-500/30 shadow-yellow-900/10' : ''} ${className}`}>
    {children}
  </div>
);

const KpiCard = ({ label, value, subvalue, icon: Icon, color = 'text-yellow-400', bg = 'bg-yellow-500/10', border = 'border-yellow-500/20' }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-[#0f1118]/60 rounded-[1.25rem] p-4 border ${border} flex flex-col gap-2`}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center`}>
        {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
      </div>
    </div>
    <p className={`text-xl font-bold ${color} leading-tight`}>{value}</p>
    {subvalue && <p className="text-[10px] text-gray-600 mt-0.5">{subvalue}</p>}
  </motion.div>
);

// â”€â”€â”€ Bar Chart (pure SVG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MonthlyBarChart({ trades, year }) {
  const monthly = useMemo(() => {
    const map = {};
    for (let m = 0; m < 12; m++) {
      map[m] = { profit: 0, taxes: 0 };
    }
    (trades || []).forEach(t => {
      const d = new Date(t.closed_at || t.created_at || t.date);
      if (!d || d.getFullYear() !== parseInt(year)) return;
      const m = d.getMonth();
      const pnl = parseFloat(t.gross_pnl_usd || 0);
      const tax = parseFloat(t.estimated_tax_usd || 0);
      if (pnl > 0) map[m].profit += pnl;
      map[m].taxes += tax;
    });
    return Object.values(map);
  }, [trades, year]);

  const maxVal = Math.max(...monthly.map(m => Math.max(m.profit, m.taxes)), 1);
  const SVG_H = 120;
  const BAR_W = 10;
  const GAP = 4;
  const GROUP_W = BAR_W * 2 + GAP + 8;
  const SVG_W = GROUP_W * 12 + 20;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H + 24}`} width="100%" style={{ minWidth: 340 }} aria-label="Ganancias vs Impuestos por mes">
        {/* Y-axis grid lines */}
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = SVG_H - SVG_H * pct;
          return (
            <line key={pct} x1={0} y1={y} x2={SVG_W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          );
        })}
        {/* Y-axis label */}
        <text x={2} y={8} fill="#6b7280" fontSize="6" fontFamily="monospace">${Math.round(maxVal).toLocaleString('es-CL')}</text>

        {monthly.map((m, i) => {
          const x = i * GROUP_W + 10;
          const profitH = maxVal > 0 ? (m.profit / maxVal) * SVG_H : 0;
          const taxH = maxVal > 0 ? (m.taxes / maxVal) * SVG_H : 0;
          return (
            <g key={i}>
              {/* Profit bar */}
              {profitH > 0 && (
                <rect
                  x={x}
                  y={SVG_H - profitH}
                  width={BAR_W}
                  height={profitH}
                  rx={2}
                  fill="rgba(52,211,153,0.7)"
                />
              )}
              {/* Tax bar */}
              {taxH > 0 && (
                <rect
                  x={x + BAR_W + GAP}
                  y={SVG_H - taxH}
                  width={BAR_W}
                  height={taxH}
                  rx={2}
                  fill="rgba(248,113,113,0.7)"
                />
              )}
              {/* Month label */}
              <text x={x + BAR_W} y={SVG_H + 14} fill="#6b7280" fontSize="7" textAnchor="middle" fontFamily="sans-serif">
                {MONTHS_ES[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-400/70" />
          <span className="text-[10px] text-gray-500">Ganancia Bruta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-400/70" />
          <span className="text-[10px] text-gray-500">Impuestos Est.</span>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TaxCenter({ onBack }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const user = session?.user;
  const userIsAdmin = isAdmin(user);

  // â”€â”€ State
  const [year, setYear] = useState(CURRENT_YEAR);
  const [currency, setCurrency] = useState('USD'); // 'USD' | 'CLP'
  const [loading, setLoading] = useState(true);
  const [fxRate, setFxRate] = useState(FALLBACK_FX_RATE);
  const [trades, setTrades] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [expensesVat, setExpensesVat] = useState([]);
  const [taxConfig, setTaxConfig] = useState(null);
  const [showTrades, setShowTrades] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Bot Contador State
  const [botActivo, setBotActivo] = useState(false);
  const [ejecutandoBot, setEjecutandoBot] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ sender: 'bot', text: 'Bot Contador listo. Esperando instrucciones...', time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }]);
  const [chatInput, setChatInput] = useState('');
  const [logsEnVivo, setLogsEnVivo] = useState([{ type: 'info', text: 'Sistema Lake Contribuyente inicializado', time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
  const [tareaActual, setTareaActual] = useState(null);

  // â”€â”€ Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [trR, divR, vatR, cfgR, fxR] = await Promise.all([
        supabase
          .from('tax_trades')
          .select('*')
          .gte('closed_at', `${year}-01-01`)
          .lte('closed_at', `${year}-12-31`)
          .order('closed_at', { ascending: false }),
        supabase
          .from('tax_dividends')
          .select('*')
          .gte('payment_date', `${year}-01-01`)
          .lte('payment_date', `${year}-12-31`)
          .order('payment_date', { ascending: false }),
        supabase
          .from('tax_expenses_vat')
          .select('*')
          .gte('expense_date', `${year}-01-01`)
          .lte('expense_date', `${year}-12-31`)
          .order('expense_date', { ascending: false }),
        supabase
          .from('tax_config')
          .select('*')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('fx_config')
          .select('manual_rate')
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (trR.error) throw trR.error;
      if (divR.error) throw divR.error;
      if (vatR.error) throw vatR.error;

      setTrades(trR.data || []);
      setDividends(divR.data || []);
      setExpensesVat(vatR.data || []);
      setTaxConfig(cfgR.data || null);
      setFxRate(fxR?.data?.manual_rate ? parseFloat(fxR.data.manual_rate) : FALLBACK_FX_RATE);
    } catch (err) {
      toast({ title: 'Error cargando datos', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [year, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // â”€â”€ Derived KPIs
  const kpis = useMemo(() => {
    let grossProfit = 0;
    let totalTax = 0;
    let totalCommissions = 0;

    trades.forEach(t => {
      const pnl = parseFloat(t.gross_pnl_usd || 0);
      const tax = parseFloat(t.estimated_tax_usd || 0);
      const comm = parseFloat(t.commissions_usd || 0);
      if (pnl > 0) grossProfit += pnl;
      totalTax += tax;
      totalCommissions += comm;
    });

    let grossDividends = 0;
    let foreignWithholding = 0;

    dividends.forEach(d => {
      grossDividends += parseFloat(d.gross_dividend_usd || 0);
      foreignWithholding += parseFloat(d.foreign_withholding_usd || 0);
    });

    const netResult = grossProfit - totalTax;

    return { grossProfit, totalTax, netResult, grossDividends, foreignWithholding, totalCommissions };
  }, [trades, dividends]);

  // Display value helper (USD or CLP)
  const display = (usdVal) => {
    if (currency === 'CLP') return fmtCLP(usdVal, fxRate);
    return fmt(usdVal);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: chatInput, time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'ðŸš§ This feature isn\'t implemented yetâ€”but don\'t worry! You can request it in your next prompt! ðŸš€', time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }]);
      toast({ title: 'ðŸš§ Funcionalidad en desarrollo', description: 'ðŸš§ This feature isn\'t implemented yetâ€”but don\'t worry! You can request it in your next prompt! ðŸš€', variant: 'default' });
    }, 1000);
  };

  const handleActivarBot = () => {
    setBotActivo(!botActivo);
    setLogsEnVivo(prev => [...prev, { type: !botActivo ? 'success' : 'warning', text: !botActivo ? 'Bot Contador activado. Monitoreando...' : 'Bot Contador desactivado.', time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
    toast({ title: !botActivo ? 'Bot Activado' : 'Bot Desactivado', description: 'Estado del Bot Contador actualizado.' });
  };

  // â”€â”€â”€ Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando datos tributarios...</p>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Render
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-16">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          BLOCK 1 â€” HEADER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="px-5 pt-6 pb-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-900/30 flex-shrink-0">
                <Receipt className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  Impuestos
                </h1>
                <p className="text-xs text-gray-500">Centro tributario estimado Â· {trades.length} trades Â· {dividends.length} dividendos</p>
              </div>
            </div>
          </div>

          {/* Right: year + currency */}
          <div className="flex items-center gap-3">
            {/* Year filter */}
            <div className="flex items-center gap-1 bg-[#0f1118]/80 rounded-2xl p-1 border border-white/5">
              {YEAR_OPTIONS.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${year === y ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-400 border border-yellow-500/30' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* Currency toggle */}
            <button
              onClick={() => setCurrency(c => c === 'USD' ? 'CLP' : 'USD')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0f1118]/80 border border-white/5 text-xs font-bold hover:bg-white/5 transition-colors"
            >
              {currency === 'USD'
                ? <><DollarSign className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">USD</span></>
                : <><span className="text-blue-400 font-bold text-[11px]">CLP</span></>
              }
              <ToggleRight className={`w-4 h-4 ${currency === 'CLP' ? 'text-blue-400' : 'text-gray-600'}`} />
            </button>

            {/* Refresh */}
            <button
              onClick={fetchData}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              aria-label="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 max-w-5xl mx-auto space-y-6">

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            NEW BLOCK â€” BOT CONTADOR (Admin Only)
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {userIsAdmin && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="bg-gradient-to-br from-[#0f1a2e]/80 to-[#0f1118]/80 backdrop-blur-xl border border-emerald-500/20 rounded-[1.75rem] p-5 shadow-xl">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                      Bot Contador
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className={`w-1.5 h-1.5 rounded-full ${botActivo ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                          {botActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </h2>
                    <p className="text-xs text-gray-400">Lake Contribuyente â€” Automatización SII</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={handleActivarBot}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${botActivo ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-900/30'}`}
                  >
                    {botActivo ? <XCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {botActivo ? 'Desactivar Bot Contador' : 'Activar Bot Contador'}
                  </button>
                  <button 
                    onClick={() => {
                      toast({ title: 'ðŸš§ Verificando Impuestos', description: 'ðŸš§ This feature isn\'t implemented yetâ€”but don\'t worry! You can request it in your next prompt! ðŸš€' });
                      setLogsEnVivo(prev => [...prev, { type: 'info', text: 'Iniciando verificación de impuestos manual...', time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
                    }}
                    className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" /> Verificar Impuestos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Panel: Chat */}
                <div className="bg-[#0b0c10]/80 border border-emerald-500/10 rounded-2xl flex flex-col h-[260px] overflow-hidden">
                  <div className="px-4 py-2 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Bot Contador</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl text-xs ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-tr-sm' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 px-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-2 border-t border-emerald-500/10 bg-[#0f1118]/80 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Solicita cálculos o reportes..." 
                      className="flex-1 bg-[#1a1d2b] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/30"
                    />
                    <button type="submit" className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Right Panel: Terminal */}
                <div className="bg-[#0b0c10]/90 border border-white/5 rounded-2xl flex flex-col h-[260px] overflow-hidden">
                  <div className="px-4 py-2 bg-gray-900/50 border-b border-white/5 flex items-center gap-2">
                    <MonitorPlay className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Terminal en Vivo</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1.5">
                    {logsEnVivo.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-gray-600 shrink-0">[{log.time}]</span>
                        <span className={`${
                          log.type === 'success' ? 'text-emerald-400' : 
                          log.type === 'error' ? 'text-red-400' : 
                          log.type === 'warning' ? 'text-yellow-400' : 
                          'text-blue-300'
                        }`}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BLOCK 2 â€” KPI CARDS (6)
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.07 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
        >
          <KpiCard
            label="Ganancia Bruta"
            value={display(kpis.grossProfit)}
            subvalue={currency === 'CLP' ? fmt(kpis.grossProfit) : undefined}
            icon={TrendingUp}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            border="border-emerald-500/20"
          />
          <KpiCard
            label="Impuestos Estimados"
            value={display(kpis.totalTax)}
            subvalue={taxConfig ? `Tasa: ${taxConfig.tax_rate_pct ?? 'â€”'}%` : undefined}
            icon={Percent}
            color="text-red-400"
            bg="bg-red-500/10"
            border="border-red-500/20"
          />
          <KpiCard
            label="Resultado Neto"
            value={display(kpis.netResult)}
            subvalue={currency === 'CLP' ? fmt(kpis.netResult) : undefined}
            icon={Calculator}
            color={kpis.netResult >= 0 ? 'text-yellow-400' : 'text-red-400'}
            bg="bg-yellow-500/10"
            border="border-yellow-500/20"
          />
          <KpiCard
            label="Dividendos Brutos"
            value={display(kpis.grossDividends)}
            subvalue={`${dividends.length} pagos`}
            icon={DollarSign}
            color="text-blue-400"
            bg="bg-blue-500/10"
            border="border-blue-500/20"
          />
          <KpiCard
            label="Retención Extranjera"
            value={display(kpis.foreignWithholding)}
            subvalue="WHT deducible"
            icon={TrendingDown}
            color="text-orange-400"
            bg="bg-orange-500/10"
            border="border-orange-500/20"
          />
          <KpiCard
            label="Comisiones Totales"
            value={display(kpis.totalCommissions)}
            subvalue={`${trades.length} operaciones`}
            icon={FileText}
            color="text-gray-400"
            bg="bg-gray-500/10"
            border="border-gray-500/20"
          />
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BLOCK 3 â€” BAR CHART
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Evolución Mensual {year}
              </h2>
              <span className="text-[10px] text-gray-600">{currency}</span>
            </div>
            {trades.length > 0 ? (
              <MonthlyBarChart trades={trades} year={year} />
            ) : (
              <div className="text-center py-10 text-gray-600">
                <Table2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin trades para {year}</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BLOCK 4 â€” FORMULA DISPLAY
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard glow>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4 text-center">Fórmula Tributaria Estimada {year}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
              {/* Gross profit */}
              <div className="text-center">
                <p className="text-2xl md:text-4xl font-black text-emerald-400 tabular-nums">
                  {display(kpis.grossProfit)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Ganancia Bruta</p>
              </div>
              {/* Minus */}
              <div className="text-3xl md:text-5xl font-thin text-gray-600 select-none">âˆ’</div>
              {/* Tax */}
              <div className="text-center">
                <p className="text-2xl md:text-4xl font-black text-red-400 tabular-nums">
                  {display(kpis.totalTax)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Impuestos</p>
              </div>
              {/* Equals */}
              <div className="text-3xl md:text-5xl font-thin text-gray-600 select-none">=</div>
              {/* Net */}
              <div className="text-center">
                <p className={`text-2xl md:text-4xl font-black tabular-nums ${kpis.netResult >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {display(kpis.netResult)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Resultado Neto</p>
              </div>
            </div>
            {currency === 'CLP' && (
              <p className="text-center text-[10px] text-gray-600 mt-4">
                Tipo de cambio estimado: 1 USD = {fxRate.toLocaleString('es-CL')} CLP
              </p>
            )}
          </GlassCard>
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BLOCK 5 â€” EXPANDABLE TRADES TABLE
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard>
            <button
              onClick={() => setShowTrades(v => !v)}
              className="w-full flex items-center justify-between group"
            >
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4 text-yellow-400" />
                Ver detalle de transacciones
                <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg text-[10px]">
                  {trades.length}
                </span>
              </h2>
              <div className={`p-1.5 rounded-xl border transition-all ${showTrades ? 'border-yellow-500/30 text-yellow-400' : 'border-white/10 text-gray-500'}`}>
                {showTrades ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            <AnimatePresence>
              {showTrades && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 overflow-x-auto">
                    {trades.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Sin transacciones para {year}</p>
                      </div>
                    ) : (
                      <table className="w-full text-xs border-separate border-spacing-y-1" style={{ minWidth: 700 }}>
                        <thead>
                          <tr>
                            {['Fecha', 'Símbolo', 'Tipo', 'Qty', 'Entrada', 'Salida', 'PnL Bruto', 'Comisión', 'Impuesto Est.', 'Neto', 'Broker'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((t, idx) => {
                            const pnl = parseFloat(t.gross_pnl_usd || 0);
                            const tax = parseFloat(t.estimated_tax_usd || 0);
                            const comm = parseFloat(t.commissions_usd || 0);
                            const net = pnl - tax - comm;
                            const isExpanded = expandedRow === idx;
                            return (
                              <React.Fragment key={t.id || idx}>
                                <tr
                                  className="bg-[#0f1118]/60 border border-white/5 rounded-xl cursor-pointer hover:bg-[#0f1118]/90 transition-colors"
                                  onClick={() => setExpandedRow(isExpanded ? null : idx)}
                                >
                                  <td className="px-3 py-2.5 rounded-l-xl text-gray-400 whitespace-nowrap">
                                    {t.closed_at ? new Date(t.closed_at).toLocaleDateString('es-CL') : 'â€”'}
                                  </td>
                                  <td className="px-3 py-2.5 font-bold text-white">{t.symbol || 'â€”'}</td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${t.side_open === 'long' || t.side_open === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                      {(t.side_open || 'â€”').toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-300 tabular-nums">{t.qty ?? 'â€”'}</td>
                                  <td className="px-3 py-2.5 text-gray-300 tabular-nums">{fmt(t.entry_price)}</td>
                                  <td className="px-3 py-2.5 text-gray-300 tabular-nums">{fmt(t.exit_price)}</td>
                                  <td className={`px-3 py-2.5 font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(pnl)}</td>
                                  <td className="px-3 py-2.5 text-gray-500 tabular-nums">{fmt(comm)}</td>
                                  <td className="px-3 py-2.5 text-red-400 tabular-nums">{fmt(tax)}</td>
                                  <td className={`px-3 py-2.5 font-bold tabular-nums ${net >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{fmt(net)}</td>
                                  <td className="px-3 py-2.5 text-gray-500">{t.source_broker || 'â€”'}</td>
                                  <td className="px-3 py-2.5 rounded-r-xl text-gray-600">
                                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  </td>
                                </tr>
                                <AnimatePresence>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={12} className="px-0 pb-1">
                                        <motion.div
                                          initial={{ opacity: 0, y: -6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -6 }}
                                          className="mx-1 mb-1 p-4 bg-[#0f1118]/80 border border-yellow-500/10 rounded-2xl"
                                        >
                                          <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-2">Cálculo Detallado</p>
                                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                                            <span className="text-gray-500">PnL Bruto:</span>
                                            <span className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(pnl)}</span>
                                            <span className="text-gray-700">âˆ’</span>
                                            <span className="text-gray-500">Comisión:</span>
                                            <span className="text-gray-300 font-bold">{fmt(comm)}</span>
                                            <span className="text-gray-700">âˆ’</span>
                                            <span className="text-gray-500">Impuesto est.:</span>
                                            <span className="text-red-400 font-bold">{fmt(tax)}</span>
                                            <span className="text-gray-700">=</span>
                                            <span className="text-gray-500">Neto:</span>
                                            <span className={`font-black ${net >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{fmt(net)}</span>
                                          </div>
                                          {t.notes && (
                                            <p className="mt-2 text-[10px] text-gray-600 italic">{t.notes}</p>
                                          )}
                                          {taxConfig?.tax_rate_pct && (
                                            <p className="mt-1 text-[10px] text-gray-600">
                                              Tasa aplicada: {taxConfig.tax_rate_pct}% Â· Impuesto = PnL Bruto Ã— {taxConfig.tax_rate_pct}% = {fmt(pnl * (taxConfig.tax_rate_pct / 100))}
                                            </p>
                                          )}
                                        </motion.div>
                                      </td>
                                    </tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BLOCK 6 â€” DIVIDENDS TABLE
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4" /> Dividendos {year}
              <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg text-[10px]">
                {dividends.length}
              </span>
            </h2>

            {dividends.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin dividendos para {year}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-y-1" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      {['Símbolo', 'Fecha', 'Bruto', 'Retención', 'Neto'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.map((d, idx) => {
                      const gross = parseFloat(d.gross_dividend_usd || 0);
                      const wht = parseFloat(d.foreign_withholding_usd || 0);
                      const net = gross - wht;
                      return (
                        <tr key={d.id || idx} className="bg-[#0f1118]/60 border border-white/5 rounded-xl">
                          <td className="px-3 py-2.5 rounded-l-xl font-bold text-white">{d.symbol || 'â€”'}</td>
                          <td className="px-3 py-2.5 text-gray-400">
                            {d.payment_date ? new Date(d.payment_date).toLocaleDateString('es-CL') : 'â€”'}
                          </td>
                          <td className="px-3 py-2.5 text-blue-400 font-bold tabular-nums">{display(gross)}</td>
                          <td className="px-3 py-2.5 text-orange-400 tabular-nums">{display(wht)}</td>
                          <td className="px-3 py-2.5 rounded-r-xl text-emerald-400 font-bold tabular-nums">{display(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary row */}
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 text-[10px] font-bold uppercase text-gray-500 tracking-widest">Total</td>
                      <td className="px-3 py-2.5 text-blue-300 font-black tabular-nums">{display(kpis.grossDividends)}</td>
                      <td className="px-3 py-2.5 text-orange-300 font-black tabular-nums">{display(kpis.foreignWithholding)}</td>
                      <td className="px-3 py-2.5 text-emerald-300 font-black tabular-nums">{display(kpis.grossDividends - kpis.foreignWithholding)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </GlassCard>
        </motion.div>


        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BLOCK 7 â€” DISCLAIMER
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/10 rounded-[1.25rem]">
            <AlertCircle className="w-4 h-4 text-yellow-500/60 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <span className="text-yellow-500/80 font-bold">Aviso importante: </span>
              Cifras tributarias estimadas. Los cálculos mostrados son una aproximación basada en los datos registrados en el sistema.
              Validar con contador o asesor tributario calificado antes de presentar declaración de impuestos.
              Freraut Invest no asume responsabilidad por decisiones tributarias tomadas en base a estas cifras.
            </p>
          </div>
        </motion.div>

        {/* Admin: VAT / Expenses (only shown to admin) */}
        {userIsAdmin && expensesVat.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <GlassCard>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-5">
                <Receipt className="w-4 h-4 text-yellow-400" /> Gastos / IVA Deducible {year}
                <span className="text-[10px] bg-gray-500/10 px-2 py-0.5 rounded-lg text-gray-500">{expensesVat.length}</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-y-1" style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      {['Fecha', 'Descripción', 'Neto', 'IVA', 'Total'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expensesVat.map((e, idx) => {
                      const net = parseFloat(e.net_amount_clp || e.net_amount_usd || 0);
                      const vat = parseFloat(e.vat_amount_clp || e.vat_amount_usd || 0);
                      const total = net + vat;
                      return (
                        <tr key={e.id || idx} className="bg-[#0f1118]/60 border border-white/5 rounded-xl">
                          <td className="px-3 py-2.5 rounded-l-xl text-gray-400">
                            {e.expense_date ? new Date(e.expense_date).toLocaleDateString('es-CL') : 'â€”'}
                          </td>
                          <td className="px-3 py-2.5 text-gray-300">{e.description || 'â€”'}</td>
                          <td className="px-3 py-2.5 text-white font-bold tabular-nums">{net.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2.5 text-yellow-400 tabular-nums">{vat.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2.5 rounded-r-xl text-white font-bold tabular-nums">{total.toLocaleString('es-CL')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

      </div>
    </div>
  );
}
