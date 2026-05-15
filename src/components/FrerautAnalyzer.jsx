import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import BounceScanner from '@/components/BounceScanner';
import { 
  TrendingUp, Zap, Shield, DollarSign, Search, RefreshCw, 
  TrendingDown, CheckCircle, XCircle, ChevronDown, ChevronUp, 
  AlertTriangle, Target, Activity, Rocket, X, Plus 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, LineChart, Line, CartesianGrid 
} from 'recharts';

// --- TECHNICAL INDICATORS ---

const calcRSI = (prices, period = 14) => {
  if (!prices || prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) { 
    const d = prices[i] - prices[i - 1]; 
    d >= 0 ? gains += d : losses -= d; 
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (d >= 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
};

const calcSMA = (prices, period) => {
  if (!prices || prices.length < period) return null;
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
};

const calcEMA = (prices, period) => {
  if (!prices || prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
};

const calcMACD = (prices) => {
  if (!prices || prices.length < 34) return { macd: null, signal: null, histogram: null };
  const ema12 = [];
  const ema26 = [];
  let currentEma12 = prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  let currentEma26 = prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
  
  const k12 = 2 / 13;
  const k26 = 2 / 27;
  
  for(let i=26; i<prices.length; i++) {
    currentEma12 = prices[i] * k12 + currentEma12 * (1 - k12);
    currentEma26 = prices[i] * k26 + currentEma26 * (1 - k26);
    ema12.push(currentEma12);
    ema26.push(currentEma26);
  }
  
  const macdLine = ema12.slice(-ema26.length).map((v, i) => v - ema26[i]);
  const signalLineVal = calcEMA(macdLine, 9);
  const currentMacd = macdLine[macdLine.length - 1];
  
  return {
    macd: currentMacd,
    signal: signalLineVal,
    histogram: currentMacd !== null && signalLineVal !== null ? currentMacd - signalLineVal : null
  };
};

const calcBollingerBands = (prices, period = 20) => {
  if (!prices || prices.length < period) return { upper: null, middle: null, lower: null };
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
};

const calcATR = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) return null;
  const trs = [];
  for(let i=1; i<candles.length; i++) {
    const c = candles[i];
    const p = candles[i-1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
};

// --- DATA FETCHER ---

const fetchTickerData = async (ticker) => {
  try {
    const res = await supabase.functions.invoke('lake-financial-proxy', {
      body: { source: 'yahoo_finance', ticker: ticker.toUpperCase() }
    });

    if (res.error) throw res.error;
    
    const tickerData = res.data?.data || res.data;
    const chart = tickerData?.chart;

    if (!chart || !chart.timestamps) {
      throw new Error("Invalid data format from Yahoo Finance");
    }

    const candles = chart.timestamps.map((ts, i) => ({
      close: chart.close[i], 
      high: chart.high[i], 
      low: chart.low[i], 
      open: chart.open[i], 
      volume: chart.volume[i], 
      timestamp: ts,
      time: new Date(ts * 1000).toLocaleDateString()
    })).filter(c => c.close != null && c.high != null && c.low != null);

    if (candles.length < 50) throw new Error("Not enough data points");

    const prices = candles.map(c => c.close);
    const currentPrice = prices[prices.length - 1];
    const currentHigh = candles[candles.length - 1].high;
    const currentLow = candles[candles.length - 1].low;

    // Calculate Down Days
    let downDays = 0;
    for(let i = prices.length - 1; i > 0; i--) {
      if (prices[i] < prices[i-1]) downDays++;
      else break;
    }

    // IBS (Internal Bar Strength)
    const ibs = currentHigh - currentLow === 0 ? 0.5 : (currentPrice - currentLow) / (currentHigh - currentLow);

    // 52w High/Low (approx 252 trading days)
    const yearPrices = prices.slice(-252);
    const high52w = Math.max(...yearPrices);
    const low52w = Math.min(...yearPrices);

    const sma20 = calcSMA(prices, 20);
    const sma50 = calcSMA(prices, 50);
    const sma200 = calcSMA(prices, 200);

    let regime = 'NEUTRAL';
    if (sma50 && sma200 && sma50 > sma200 && currentPrice > sma200) regime = 'BULLISH';
    else if (sma50 && sma200 && sma50 < sma200 && currentPrice < sma200) regime = 'BEARISH';

    return {
      symbol: ticker.toUpperCase(),
      prices,
      candles,
      chartData: candles.slice(-60), // Last 60 for mini charts
      currentPrice,
      rsi2: calcRSI(prices, 2),
      rsi14: calcRSI(prices, 14),
      sma5: calcSMA(prices, 5),
      sma20,
      sma50,
      sma200,
      macd: calcMACD(prices),
      bollinger: calcBollingerBands(prices),
      atr: calcATR(candles),
      ibs,
      downDays,
      high52w,
      low52w,
      regime
    };
  } catch (err) {
    console.error(`Error fetching ${ticker}:`, err);
    return null;
  }
};

const fetchFrerautAnalysis = async (ticker, strategy, technicals) => {
  try {
    const res = await supabase.functions.invoke('analyze-freraut', {
      body: { ticker: ticker.toUpperCase(), strategy, technicals }
    });
    if (res.error) throw res.error;
    return res.data || null;
  } catch (err) {
    console.error('Freraut analysis error:', err);
    return null;
  }
};
        

const fmtUSD = v => v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : '—';
const fmtPct = v => v != null ? `${parseFloat(v) >= 0 ? '+' : ''}${parseFloat(v).toFixed(2)}%` : '—';

// --- FRERAUT CRITERIA PANEL ---

const ACCENT = {
  cyan:    { verdict_bg: 'from-cyan-900/30 to-slate-900/80',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    bar: 'bg-cyan-500' },
  yellow:  { verdict_bg: 'from-yellow-900/30 to-slate-900/80',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  bar: 'bg-yellow-500' },
  emerald: { verdict_bg: 'from-emerald-900/30 to-slate-900/80', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
};

const VERDICT_STYLE = {
  'TIC':           'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'NO TIC':        'bg-red-500/20 text-red-300 border-red-500/40',
  'COMPRAR':       'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'ACUMULAR':      'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'ESPERAR':       'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  'EVITAR':        'bg-red-500/20 text-red-300 border-red-500/40',
  'INFRAVALORADA': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'PRECIO_JUSTO':  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  'CARA':          'bg-red-500/20 text-red-300 border-red-500/40',
};

function FrerautCriteriaPanel({ analysis, accentColor = 'cyan', showMarketCall = false }) {
  if (!analysis) return null;
  const a = ACCENT[accentColor] || ACCENT.cyan;
  const vs = VERDICT_STYLE[analysis.verdict] || 'bg-slate-700 text-slate-300 border-slate-600';

  return (
    <div className={`rounded-2xl border ${a.border} bg-gradient-to-br ${a.verdict_bg} p-5 space-y-5`}>
      {/* Header: veredicto + convicción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-4 py-1.5 rounded-full border text-lg font-black tracking-wide ${vs}`}>
            {analysis.verdict}
          </span>
          {analysis.conviction_pct != null && (
            <span className="text-slate-400 text-sm">Convicción: <span className="text-white font-bold">{analysis.conviction_pct}%</span></span>
          )}
          {analysis.upside_pct != null && (
            <span className="text-slate-400 text-sm">Upside: <span className="text-emerald-400 font-bold">+{analysis.upside_pct}%</span></span>
          )}
        </div>
        {/* Market call (Frerautiano) */}
        {showMarketCall && analysis.market_recommendation && (
          <div className={`px-6 py-2 rounded-xl border text-2xl font-black text-center ${
            analysis.market_recommendation === 'UPRO' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
            analysis.market_recommendation === 'SPXU' ? 'bg-red-500/20 border-red-500/40 text-red-300' :
            'bg-slate-700/50 border-slate-600 text-slate-300'}`}>
            {analysis.market_recommendation}
            {analysis.regime_confidence != null && <span className="text-xs font-normal ml-2 opacity-60">{analysis.regime_confidence}%</span>}
          </div>
        )}
      </div>

      {/* Criterios */}
      {analysis.criteria && analysis.criteria.length > 0 && (
        <div className="space-y-2.5">
          {analysis.criteria.map(c => (
            <div key={c.id} className="bg-slate-900/60 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {c.met
                    ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  <span className="text-sm font-semibold text-slate-200 truncate">{c.name}</span>
                  {c.value && <span className="text-xs text-slate-400 font-mono">{c.value}</span>}
                </div>
                <span className="text-sm font-black text-white flex-shrink-0">{c.score}<span className="text-slate-600 font-normal">/10</span></span>
              </div>
              {/* Score bar */}
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${c.met ? a.bar : 'bg-red-700'}`} style={{ width: `${(c.score / 10) * 100}%` }} />
              </div>
              {c.evidence && <p className="text-xs text-slate-400 leading-relaxed">{c.evidence}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Targets (swing/frerautiano) */}
      {(analysis.entry_zone || analysis.target_price || analysis.stop_loss) && (
        <div className="grid grid-cols-3 gap-3">
          {analysis.entry_zone && (
            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
              <div className="text-xs text-slate-500 mb-1">Zona entrada</div>
              <div className="text-sm font-mono font-bold text-white">{analysis.entry_zone}</div>
            </div>
          )}
          {analysis.target_price && (
            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-emerald-900/40">
              <div className="text-xs text-slate-500 mb-1">Target</div>
              <div className="text-sm font-mono font-bold text-emerald-400">{fmtUSD(analysis.target_price)}</div>
            </div>
          )}
          {analysis.stop_loss && (
            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-red-900/40">
              <div className="text-xs text-slate-500 mb-1">Stop Loss</div>
              <div className="text-sm font-mono font-bold text-red-400">{fmtUSD(analysis.stop_loss)}</div>
            </div>
          )}
        </div>
      )}

      {/* Dividend / Value extras */}
      {analysis.current_yield && (
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">Yield actual: <span className="text-amber-400 font-bold">{analysis.current_yield}</span></span>
          {analysis.dividend_safety && (
            <span className={`font-bold ${analysis.dividend_safety === 'SEGURO' ? 'text-emerald-400' : analysis.dividend_safety === 'MODERADO' ? 'text-yellow-400' : 'text-red-400'}`}>
              {analysis.dividend_safety}
            </span>
          )}
        </div>
      )}
      {analysis.analyst_consensus && (
        <div className="text-sm text-slate-400">Consenso analistas: <span className="text-slate-200">{analysis.analyst_consensus}</span></div>
      )}
      {analysis.fair_value_estimate && (
        <div className="text-sm text-slate-400">Fair value estimado: <span className="text-emerald-300 font-bold">{analysis.fair_value_estimate}</span></div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <p className={`text-sm italic ${a.text} border-t border-slate-800/60 pt-3`}>{analysis.summary}</p>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function FrerautAnalyzer() {
  const [activeTab, setActiveTab] = useState('SWING');
  
  // SWING STATE
  const [swingTicker, setSwingTicker] = useState('');
  const [swingData, setSwingData] = useState(null);
  const [swingLoading, setSwingLoading] = useState(false);
  const [swingAnalysis, setSwingAnalysis] = useState(null);
  const [swingAnalysisLoading, setSwingAnalysisLoading] = useState(false);

  // FRERAUTIANO STATE
  const [frerautianoTicker, setFrerautianoTicker] = useState('SPY');
  const [spyData, setSpyData] = useState(null);
  const [spyLoading, setSpyLoading] = useState(false);
  const [frerautianoAnalysis, setFrerautianoAnalysis] = useState(null);
  const [frerautianoLoading, setFrerautianoLoading] = useState(false);

  // VALUE STATE
  const [valueTicker, setValueTicker] = useState('');
  const [valueData, setValueData] = useState(null);
  const [valueLoading, setValueLoading] = useState(false);
  const [valueAnalysis, setValueAnalysis] = useState(null);
  const [valueAnalysisLoading, setValueAnalysisLoading] = useState(false);

  // DIVIDEND STATE
  const [divData, setDivData] = useState([]);
  const [divLoading, setDivLoading] = useState(true);
  const [divSort, setDivSort] = useState('YIELD');
  const [divFund, setDivFund] = useState({});
  const [divFundL, setDivFundL] = useState({});

  const DIV_STOCKS = useMemo(() => [
    { t: 'JPM', y: 2.3 }, { t: 'BAC', y: 2.5 }, { t: 'WFC', y: 2.4 }, { t: 'GS', y: 2.2 },
    { t: 'XOM', y: 3.4 }, { t: 'CVX', y: 4.1 }, { t: 'KO', y: 3.0 }, { t: 'PG', y: 2.4 },
    { t: 'MCD', y: 2.2 }, { t: 'VZ', y: 6.5 }, { t: 'T', y: 5.8 }, { t: 'O', y: 5.5 },
    { t: 'SCHD', y: 3.5 }, { t: 'VYM', y: 2.9 }
  ], []);

  const evalDiv = async (tk, techData) => {
    if (divFund[tk]) return;
    setDivFundL(p => ({ ...p, [tk]: true }));
    try {
      const r = await fetchFrerautAnalysis(tk, 'dividendos', techData || null);
      setDivFund(p => ({ ...p, [tk]: r }));
    } catch (e) { setDivFund(p => ({ ...p, [tk]: { verdict: 'ESPERAR', summary: 'Error al analizar.' } })); }
    setDivFundL(p => ({ ...p, [tk]: false }));
  };
      

  // --- TAB 1: SWING TRADING LOGIC ---
  const handleSwingSearch = async (t) => {
    if(!t) return;
    setSwingLoading(true);
    setSwingAnalysis(null);
    const d = await fetchTickerData(t);
    setSwingData(d);
    setSwingLoading(false);
    if (d) {
      setSwingAnalysisLoading(true);
      fetchFrerautAnalysis(t, 'swing', d).then(r => { setSwingAnalysis(r); setSwingAnalysisLoading(false); });
    }
  };

  const renderSwingVerdict = (d) => {
    if(!d) return null;
    let verdict = 'NO OPERAR';
    let color = 'text-red-400';
    let bg = 'bg-red-400/10 border-red-400/20';

    if (d.rsi2 < 15 && d.currentPrice > d.sma200 && d.downDays >= 2 && d.ibs < 0.4) {
      verdict = 'COMPRA FUERTE';
      color = 'text-emerald-400';
      bg = 'bg-emerald-400/10 border-emerald-400/20';
    } else if (d.rsi2 < 25 && d.currentPrice > d.sma200) {
      verdict = 'EN ZONA';
      color = 'text-amber-400';
      bg = 'bg-amber-400/10 border-amber-400/20';
    }

    const buyZoneHigh = d.currentPrice;
    const buyZoneLow = d.currentPrice - (d.atr * 0.5);

    return (
      <div className={`p-4 rounded-xl border ${bg} flex flex-col items-center text-center space-y-2`}>
        <div className={`text-xl font-black ${color}`}>{verdict}</div>
        {verdict !== 'NO OPERAR' && (
          <>
            <div className="text-sm text-slate-300">Zona de Entrada Recomendada:</div>
            <div className="font-mono font-bold text-white">{fmtUSD(buyZoneLow)} - {fmtUSD(buyZoneHigh)}</div>
            <div className="text-xs text-slate-400 mt-2 italic">Nota: Sin SL - Hold si no rebota - Asumiendo compañía sólida</div>
          </>
        )}
      </div>
    );
  };

  // --- TAB 2: FRERAUTIANO LOGIC ---
  const handleFrerautianoSearch = async (t) => {
    const ticker = t || frerautianoTicker || 'SPY';
    setSpyLoading(true);
    setFrerautianoAnalysis(null);
    const d = await fetchTickerData(ticker);
    setSpyData(d);
    setSpyLoading(false);
    if (d) {
      setFrerautianoLoading(true);
      fetchFrerautAnalysis(ticker, 'frerautiano', d).then(r => { setFrerautianoAnalysis(r); setFrerautianoLoading(false); });
    }
  };

  // --- TAB 3: VALUE LOGIC ---
  const handleValueSearch = async (t) => {
    if(!t) return;
    setValueLoading(true);
    setValueAnalysis(null);
    const d = await fetchTickerData(t);
    setValueData(d);
    setValueLoading(false);
    if (d) {
      setValueAnalysisLoading(true);
      fetchFrerautAnalysis(t, 'value', d).then(r => { setValueAnalysis(r); setValueAnalysisLoading(false); });
    }
  };

  const renderValueVerdict = (d) => {
    if(!d) return null;
    let score = 0;
    const dist52wH = ((d.high52w - d.currentPrice) / d.high52w) * 100;
    
    if (dist52wH > 20) score += 3;
    else if (dist52wH > 10) score += 2;
    else if (dist52wH > 5) score += 1;

    if (d.currentPrice < d.sma200) score += 2;
    if (d.rsi14 < 30) score += 2;
    else if (d.rsi14 < 50) score += 1;

    const dist52wL = ((d.currentPrice - d.low52w) / d.low52w) * 100;
    if (dist52wL < 10) score += 1; // Near 52w low

    let verdict = 'SOBREVALUADO';
    let color = 'text-red-400';
    if (score >= 6) { verdict = 'OPORTUNIDAD VALUE'; color = 'text-emerald-400'; }
    else if (score >= 3) { verdict = 'PRECIO JUSTO'; color = 'text-amber-400'; }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/80 p-6 rounded-xl border border-slate-800">
          <div>
            <div className="text-sm text-slate-400 uppercase tracking-widest font-bold">Veredicto Value</div>
            <div className={`text-2xl font-black ${color}`}>{verdict}</div>
          </div>
          <div className="text-right mt-4 md:mt-0">
            <div className="text-sm text-slate-400 uppercase tracking-widest font-bold">Value Score</div>
            <div className="text-3xl font-black text-white">{score} <span className="text-lg text-slate-500">/ 9</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Descuento ATH 52w</div>
            <div className={`text-lg font-bold ${dist52wH > 10 ? 'text-emerald-400' : 'text-slate-300'}`}>{fmtPct(-dist52wH)}</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Precio vs SMA200</div>
            <div className={`text-lg font-bold ${d.currentPrice < d.sma200 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {fmtPct(((d.currentPrice - d.sma200)/d.sma200)*100)}
            </div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">RSI 14 (Sobrevendido)</div>
            <div className={`text-lg font-bold ${d.rsi14 < 40 ? 'text-emerald-400' : 'text-slate-300'}`}>{d.rsi14?.toFixed(1)}</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">High / Low 52w</div>
            <div className="text-sm font-mono text-slate-300">{fmtUSD(d.high52w)} / {fmtUSD(d.low52w)}</div>
          </div>
        </div>
      </div>
    );
  };

  // --- TAB 4: DIVIDENDS LOGIC ---
  useEffect(() => {
    if (activeTab === 'DIVIDENDOS' && divData.length === 0) {
      const loadDivs = async () => {
        setDivLoading(true);
        const promises = DIV_STOCKS.map(async (s) => {
          const d = await fetchTickerData(s.t);
          return { ...s, data: d };
        });
        const results = await Promise.all(promises);
        setDivData(results.filter(r => r.data !== null));
        setDivLoading(false);
      };
      loadDivs();
    }
  }, [activeTab, DIV_STOCKS, divData.length]);

  const sortedDivs = useMemo(() => {
    const arr = [...divData];
    if (divSort === 'YIELD') arr.sort((a, b) => b.y - a.y);
    if (divSort === 'RSI') arr.sort((a, b) => (a.data?.rsi2 || 100) - (b.data?.rsi2 || 100));
    return arr;
  }, [divData, divSort]);

  return (
    <div className="w-full min-h-screen bg-[#040914] text-slate-200 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <Activity className="w-8 h-8 text-cyan-400" />
              Freraut Analyzer
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">v11.0 — MULTI-STRATEGY TERMINAL</p>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'SWING', icon: TrendingUp, label: 'Swing', color: 'cyan' },
              { id: 'FRERAUTIANO', icon: Zap, label: 'Frerautiano', color: 'yellow' },
              { id: 'VALUE', icon: Shield, label: 'Value', color: 'emerald' },
              { id: 'DIVIDENDOS', icon: DollarSign, label: 'Dividendos', color: 'amber' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30` 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABS CONTENT */}
        <AnimatePresence mode="wait">
          
          {/* --- TAB: SWING --- */}
          {activeTab === 'SWING' && (
            <motion.div key="swing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              
              <div className="h-[400px]">
                <BounceScanner onSelectTicker={(t) => { setSwingTicker(t); handleSwingSearch(t); }} />
              </div>

              <div className="bg-[rgba(8,15,28,0.85)] rounded-2xl border border-[rgba(255,255,255,0.07)] p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={swingTicker}
                      onChange={(e) => setSwingTicker(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSwingSearch(swingTicker)}
                      placeholder="Buscar ticker (ej. AAPL, TSLA)..."
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase font-mono"
                    />
                  </div>
                  <button 
                    onClick={() => handleSwingSearch(swingTicker)}
                    disabled={swingLoading || !swingTicker}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {swingLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Analizar'}
                  </button>
                </div>

                {swingData && !swingLoading && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-black text-white">{swingData.symbol}</h2>
                        <div className="text-xl text-slate-300 font-mono">{fmtUSD(swingData.currentPrice)}</div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full border text-sm font-bold tracking-widest ${
                        swingData.regime === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                        swingData.regime === 'BEARISH' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                        'bg-slate-700/50 text-slate-300 border-slate-600'
                      }`}>
                        {swingData.regime}
                      </div>
                    </div>

                    {renderSwingVerdict(swingData)}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">RSI 2</div>
                        <div className={`text-xl font-black ${swingData.rsi2 < 15 ? 'text-emerald-400' : swingData.rsi2 > 85 ? 'text-red-400' : 'text-slate-300'}`}>
                          {swingData.rsi2?.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">RSI 14</div>
                        <div className={`text-xl font-black ${swingData.rsi14 < 30 ? 'text-emerald-400' : swingData.rsi14 > 70 ? 'text-red-400' : 'text-slate-300'}`}>
                          {swingData.rsi14?.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">IBS</div>
                        <div className={`text-xl font-black ${swingData.ibs < 0.4 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {swingData.ibs?.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">Down Days</div>
                        <div className={`text-xl font-black ${swingData.downDays >= 2 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {swingData.downDays}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">SMA 20</div>
                        <div className="text-lg font-mono text-slate-300">{fmtUSD(swingData.sma20)}</div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">SMA 50</div>
                        <div className="text-lg font-mono text-slate-300">{fmtUSD(swingData.sma50)}</div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">SMA 200</div>
                        <div className="text-lg font-mono text-slate-300">{fmtUSD(swingData.sma200)}</div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">ATR (14)</div>
                        <div className="text-lg font-mono text-slate-300">{swingData.atr?.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="h-[300px] w-full mt-6 bg-slate-900/30 rounded-xl p-4 border border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={swingData.chartData}>
                          <defs>
                            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" stroke="#475569" fontSize={10} tickMargin={10} minTickGap={30} />
                          <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} orientation="right" tickFormatter={(v) => `$${v.toFixed(0)}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                            itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                            labelStyle={{ color: '#64748b', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>


                    {swingAnalysisLoading && (
                      <div className="p-5 bg-slate-900/80 rounded-xl border border-cyan-500/20 animate-pulse flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
                        <p className="text-cyan-400 text-sm">Investigando con Sonar + evaluando 7 criterios TIC con Claude...</p>
                      </div>
                    )}
                    {swingAnalysis && !swingAnalysisLoading && (
                      <FrerautCriteriaPanel analysis={swingAnalysis} accentColor="cyan" />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* --- TAB: FRERAUTIANO --- */}
          {activeTab === 'FRERAUTIANO' && (
            <motion.div key="freraut" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-[rgba(8,15,28,0.85)] rounded-2xl border border-[rgba(255,255,255,0.07)] p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h2 className="text-2xl font-black text-white">Estrategia Frerautiana</h2>
                    <p className="text-sm text-slate-400">7 criterios TIC + decisión UPRO / SPXU / CASH</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={frerautianoTicker}
                      onChange={(e) => setFrerautianoTicker(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleFrerautianoSearch(frerautianoTicker)}
                      placeholder="Ticker de referencia (ej: SPY, QQQ)..."
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors uppercase font-mono"
                    />
                  </div>
                  <button
                    onClick={() => handleFrerautianoSearch(frerautianoTicker)}
                    disabled={spyLoading || !frerautianoTicker}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {spyLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Analizar'}
                  </button>
                </div>

                {spyData && !spyLoading && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-black text-white">{spyData.symbol}</h2>
                        <div className="text-xl text-slate-300 font-mono">{fmtUSD(spyData.currentPrice)}</div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full border text-sm font-bold tracking-widest ${
                        spyData.regime === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        spyData.regime === 'BEARISH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                        {spyData.regime}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'RSI 14', val: spyData.rsi14?.toFixed(1), ok: spyData.rsi14 > 50 },
                        { label: 'SMA 200', val: fmtUSD(spyData.sma200), ok: spyData.currentPrice > spyData.sma200 },
                        { label: 'MACD Hist', val: spyData.macd?.histogram?.toFixed(3), ok: spyData.macd?.histogram > 0 },
                        { label: 'ATR', val: spyData.atr?.toFixed(2), ok: null },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
                          <div className="text-xs text-slate-500 mb-1">{m.label}</div>
                          <div className={`text-lg font-black ${m.ok === true ? 'text-emerald-400' : m.ok === false ? 'text-red-400' : 'text-slate-300'}`}>{m.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="h-[240px] bg-slate-900/30 rounded-xl p-4 border border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={spyData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" stroke="#475569" fontSize={10} tickMargin={8} minTickGap={30} />
                          <YAxis domain={['auto','auto']} stroke="#475569" fontSize={10} orientation="right" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="close" stroke="#eab308" strokeWidth={2} dot={false} />
                          {spyData.sma200 && <ReferenceLine y={spyData.sma200} stroke="#10b981" strokeDasharray="5 5" label={{ position: 'left', value: 'SMA200', fill: '#10b981', fontSize: 10 }} />}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {frerautianoLoading && (
                      <div className="p-5 bg-slate-900/80 rounded-xl border border-yellow-500/20 animate-pulse flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin flex-shrink-0" />
                        <p className="text-yellow-400 text-sm">Investigando con Sonar + evaluando 7 criterios TIC + régimen de mercado...</p>
                      </div>
                    )}
                    {frerautianoAnalysis && !frerautianoLoading && (
                      <FrerautCriteriaPanel analysis={frerautianoAnalysis} accentColor="yellow" showMarketCall />
                    )}
                  </div>
                )}

                {!spyData && !spyLoading && (
                  <div className="py-16 text-center text-slate-500">
                    <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Ingresa un ticker de referencia (SPY, QQQ) y presiona Analizar.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* --- TAB: VALUE --- */}
          {activeTab === 'VALUE' && (
            <motion.div key="value" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-[rgba(8,15,28,0.85)] rounded-2xl border border-[rgba(255,255,255,0.07)] p-6">
                
                <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-800/50">
                  <div className="text-sm font-bold text-slate-400 w-full mb-2">Sectores Rápidos:</div>
                  <button onClick={() => {setValueTicker('JPM'); handleValueSearch('JPM');}} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-700">Bancos</button>
                  <button onClick={() => {setValueTicker('AAPL'); handleValueSearch('AAPL');}} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-700">Tech</button>
                  <button onClick={() => {setValueTicker('JNJ'); handleValueSearch('JNJ');}} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-700">Salud</button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={valueTicker}
                      onChange={(e) => setValueTicker(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleValueSearch(valueTicker)}
                      placeholder="Analizar cualquier ticker para Value..."
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors uppercase font-mono"
                    />
                  </div>
                  <button 
                    onClick={() => handleValueSearch(valueTicker)}
                    disabled={valueLoading || !valueTicker}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {valueLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Analizar Value'}
                  </button>
                </div>

                {valueData && !valueLoading && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-black text-white">{valueData.symbol}</h2>
                        <div className="text-xl text-slate-300 font-mono">{fmtUSD(valueData.currentPrice)}</div>
                      </div>
                      <div className="text-right text-sm text-slate-400">
                        <div>52w H: {fmtUSD(valueData.high52w)}</div>
                        <div className="text-emerald-400">Desc: {(((valueData.high52w - valueData.currentPrice)/valueData.high52w)*100).toFixed(1)}%</div>
                      </div>
                    </div>

                    {valueAnalysisLoading && (
                      <div className="p-5 bg-slate-900/80 rounded-xl border border-emerald-500/20 animate-pulse flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
                        <p className="text-emerald-400 text-sm">Investigando con Sonar + evaluando fundamentales, máximos y previsiones...</p>
                      </div>
                    )}
                    {valueAnalysis && !valueAnalysisLoading && (
                      <FrerautCriteriaPanel analysis={valueAnalysis} accentColor="emerald" />
                    )}
                    {!valueAnalysis && !valueAnalysisLoading && renderValueVerdict(valueData)}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* --- TAB: DIVIDENDS --- */}
          {activeTab === 'DIVIDENDOS' && (
            <motion.div key="divs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-[rgba(8,15,28,0.85)] rounded-2xl border border-[rgba(255,255,255,0.07)] p-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/50">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-amber-400" />
                      Rastreador de Dividendos
                    </h2>
                    <p className="text-sm text-slate-400">Acciones de alta calidad ordenadas por métricas de entrada.</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button 
                      onClick={() => setDivSort('YIELD')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md ${divSort === 'YIELD' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'}`}
                    >
                      Mejor Yield
                    </button>
                    <button 
                      onClick={() => setDivSort('RSI')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md ${divSort === 'RSI' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'}`}
                    >
                      Mejor Entrada (RSI)
                    </button>
                  </div>
                </div>

                {divLoading ? (
                  <div className="py-20 flex justify-center"><RefreshCw className="w-8 h-8 text-amber-400 animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedDivs.map((item, idx) => {
                      const d = item.data;
                      if (!d) return null;
                      const isGoodEntry = d.rsi2 < 25;

                      return (
                        <div key={item.t} className={`p-4 rounded-xl border ${isGoodEntry ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'} flex flex-col justify-between transition-colors`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-xl font-black text-white">{item.t}</div>
                              <div className="text-sm font-mono text-slate-300">{fmtUSD(d.currentPrice)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md">
                                {item.y.toFixed(1)}% Yield
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">RSI 2:</span>
                              <span className={`text-sm font-bold ${d.rsi2 < 25 ? 'text-emerald-400' : d.rsi2 > 75 ? 'text-red-400' : 'text-slate-300'}`}>
                                {d.rsi2?.toFixed(1)}
                              </span>
                            </div>
                            
                            {isGoodEntry && (
                              <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/20 px-2 py-1 rounded">
                                <Plus className="w-3 h-3" /> COMPRAR
                              </div>
                            )}
                            {!divFund[item.t] && !divFundL[item.t] && (
                              <button onClick={(e)=>{e.stopPropagation();evalDiv(item.t, d);}} className="w-full mt-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors">
                                Evaluar con Sonar + Claude
                              </button>
                            )}
                            {divFundL[item.t] && (
                              <div className="mt-3 p-2 bg-amber-900/20 rounded-lg border border-amber-500/20 animate-pulse flex items-center gap-2">
                                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                                <p className="text-amber-400 text-xs">Investigando con Sonar + analizando dividendo...</p>
                              </div>
                            )}
                            {divFund[item.t] && !divFundL[item.t] && (
                              <div className="mt-3 space-y-2">
                                {(() => {
                                  const a = divFund[item.t];
                                  const vColor = a.verdict === 'COMPRAR' ? 'text-emerald-400 bg-emerald-500/20' : a.verdict === 'ACUMULAR' ? 'text-cyan-400 bg-cyan-500/20' : a.verdict === 'ESPERAR' ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
                                  return (
                                    <>
                                      <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${vColor}`}>{a.verdict}</div>
                                      {a.criteria?.slice(0,3).map(c => (
                                        <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
                                          {c.met ? <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                                          <span className="text-slate-400">{c.name}:</span>
                                          <span className="text-slate-300">{c.value || c.evidence?.slice(0,40)}</span>
                                        </div>
                                      ))}
                                      {a.summary && <p className="text-slate-400 text-[10px] italic mt-1">{a.summary?.slice(0,120)}</p>}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}