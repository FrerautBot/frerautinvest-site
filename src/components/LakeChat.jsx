import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Send, Minimize2, Maximize2, X, Loader2, Brain, Activity, Target, User, BarChart2 } from 'lucide-react';

export default function LakeChat({ onClose }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [brainContext, setBrainContext] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load contextual data from Alpaca tables
  useEffect(() => {
    const fetchBrainContext = async () => {
      try {
        // Fetch Bot State
        const { data: botState } = await supabase
          .from('alpaca_bot_state')
          .select('*')
          .eq('id', 1)
          .single();

        // Fetch Strategy Assets (Current positions)
        const { data: assets } = await supabase
          .from('alpaca_strategy_assets')
          .select('symbol, qty, current_price, unrealized_pnl, bucket')
          .gt('qty', 0)
          .order('unrealized_pnl', { ascending: false });

        // Fetch Recent Orders
        const { data: orders } = await supabase
          .from('alpaca_trade_orders')
          .select('symbol, side, qty, status, filled_avg_price, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setBrainContext({
          state: botState,
          positions: assets || [],
          recentOrders: orders || []
        });
      } catch (err) {
        console.error('Error loading brain context:', err);
      }
    };

    fetchBrainContext();
  }, []);

  // Load conversation history from Supabase
  useEffect(() => {
    const loadHistory = async () => {
      if (!session?.user?.id) return;

      try {
        const { data, error } = await supabase
          .from('lake_conversaciones')
          .select('id, usuario_id, tipo_rol, contenido, tokens_usados, metadata, created_at')
          .eq('usuario_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedMessages = data.map(msg => ({
            id: msg.id,
            role: msg.tipo_rol,
            content: msg.contenido,
            timestamp: msg.created_at,
            tokens: msg.tokens_usados,
          }));
          setMessages(formattedMessages);
        }
      } catch (err) {
        console.error('Error loading conversation history:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadHistory();
  }, [session?.user?.id]);

  // Build the dynamic system prompt with live portfolio data
  const buildSystemPrompt = () => {
    if (!brainContext || !brainContext.state) return "Eres Lake, el asistente financiero inteligente de Freraut Invest.";

    const { state, positions, recentOrders } = brainContext;
    
    return `Eres Lake Executor, la IA central del fondo de inversión Freraut. Tu objetivo es asistir con el análisis financiero, estado del portafolio y toma de decisiones.
    
ESTADO ACTUAL DEL PORTAFOLIO:
- Equity Total: $${Number(state.account_equity).toFixed(2)} USD
- Efectivo Disponible: $${Number(state.account_cash).toFixed(2)} USD
- Buying Power: $${Number(state.account_buying_power).toFixed(2)} USD
- PnL Diario: $${Number(state.daily_pnl).toFixed(2)} USD
- Estado Macro: ${state.macro_state || 'Desconocido'}

POSICIONES ACTIVAS:
${positions.map(p => `- ${p.symbol} (${p.bucket}): ${p.qty} acciones @ $${Number(p.current_price).toFixed(2)} | PnL: $${Number(p.unrealized_pnl).toFixed(2)}`).join('\n') || 'Sin posiciones activas'}

ÓRDENES RECIENTES:
${recentOrders.map(o => `- ${o.side.toUpperCase()} ${o.qty} ${o.symbol} [${o.status}] @ $${Number(o.filled_avg_price || 0).toFixed(2)}`).join('\n') || 'Sin órdenes recientes'}

Usa esta información para responder preguntas sobre el rendimiento del bot, decisiones de trading y estado del mercado.
Mantén un tono profesional, analítico y conciso.`;
  };

  // Send message to Lake AI
  const handleSend = async () => {
    // 1. Validate input and loading state
    if (!input.trim() || loading) return;

    const userContent = input.trim();

    // 2. Add user message to messages array
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(), // Using ISO string here so formatTime does not break, it will be rendered as es-CL
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 3. Clear the input field and set loading
    setInput('');
    setLoading(true);

    try {
      // 4. Fetch bot state, active strategy, and position data from Supabase in parallel
      const [
        { data: botState },
        { data: strategy },
        { data: assets }
      ] = await Promise.all([
        supabase.from('alpaca_bot_state').select('*').eq('id', 1).single(),
        supabase.from('alpaca_strategies').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('alpaca_strategy_assets').select('*').gt('qty', 0)
      ]);

      // 5. Build a system prompt with real trading data
      let promptData = `Eres Lake Executor, la IA central del fondo de inversión Freraut. Tu objetivo es asistir con el análisis financiero, estado del portafolio y toma de decisiones. Responde SIEMPRE de forma concisa, profesional y analítica.

ESTADO ACTUAL DEL PORTAFOLIO:
- Equity Total: $${Number(botState?.account_equity || 0).toFixed(2)} USD
- Efectivo Disponible: $${Number(botState?.account_cash || 0).toFixed(2)} USD
- Buying Power: $${Number(botState?.account_buying_power || 0).toFixed(2)} USD
- Posición Actual: ${botState?.current_symbol || 'Ninguna'}
- PnL Diario: $${Number(botState?.daily_pnl || 0).toFixed(2)} USD
- Estado Macro: ${botState?.macro_state || 'Desconocido'}`;

      if (botState?.frerautiano_side) {
        promptData += `\n- Estado Frerautiano: ${botState.frerautiano_side.toUpperCase()} en ${botState.frerautiano_symbol || 'N/A'} (Combustible: ${botState.frerautiano_fuel || 0}%)`;
      }

      if (strategy) {
        promptData += `\n\nESTRATEGIA ACTIVA (${strategy.name}):
- Value Investing: ${strategy.pct_value_investing || 0}%
- Trading Activo: ${strategy.pct_trading || 0}%
- Dividendos: ${strategy.pct_dividends || 0}%
- Frerautiano: ${strategy.frerautiano_budget_pct || 0}%`;
      }

      promptData += `\n\nPOSICIONES ACTIVAS:\n`;
      if (assets && assets.length > 0) {
        promptData += assets.map(p => `- ${p.symbol} (${p.bucket}): ${p.qty} acciones @ $${Number(p.current_price || 0).toFixed(2)} | PnL: $${Number(p.unrealized_pnl || 0).toFixed(2)}`).join('\n');
      } else {
        promptData += 'Sin posiciones activas';
      }

      // Prepare message history for the LLM
      const apiMessages = [
        { role: 'system', content: promptData },
        // Add last 10 messages for context window
        ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userContent }
      ];

      // 6. Invoke the 'lake-chat-executor' Edge Function with all messages and user session ID
      const { data, error } = await supabase.functions.invoke('lake-chat-executor', {
        body: {
          messages: apiMessages,
          usuario_id: session?.user?.id,
        },
      });

      if (error) throw error;

      // 7. Parse the response and add assistant message to messages array
      const reply = data?.message?.content || data?.message?.contenido || data?.reply || data?.answer || 'Sin respuesta';

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        tokens: data?.tokens || 0,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // 8. Handle errors gracefully with error messages
      console.error('Error sending message:', err);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '❌ Error de comunicación con Lake Executor. Verifica la conexión.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // 9. Set loading state appropriately throughout the process
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`fixed bottom-4 right-4 bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-900/40 flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-[600px] h-[750px]' : 'w-[400px] h-[550px]'
      } z-50 overflow-hidden`}
    >
      {/* Header - Amber/Gold Theme */}
      <div className="flex items-center justify-between p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-900/30 to-yellow-600/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Brain className="w-5 h-5 text-gray-950" />
          </div>
          <div>
            <h3 className="text-amber-400 font-bold text-sm tracking-wide">Lake Executor</h3>
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <p className="text-gray-400 text-xs">Sistema Central Activo</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-amber-500/10 transition-colors"
            title={isExpanded ? 'Minimizar' : 'Expandir'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-amber-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-amber-900/50 scrollbar-track-transparent">
        {initialLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
              <p className="text-amber-500/60 text-sm font-medium">Sincronizando con Lake...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-600/10 border border-amber-500/20 flex items-center justify-center">
              <Brain className="w-10 h-10 text-amber-500" />
            </div>
            
            <div>
              <h4 className="text-amber-400 font-bold mb-1 text-lg">Lake Executor AI</h4>
              <p className="text-gray-400 text-sm max-w-xs">
                Módulo cognitivo y análisis de portafolio
              </p>
            </div>

            {/* Context Widget */}
            {brainContext && brainContext.state && (
              <div className="bg-gray-900/80 border border-amber-500/20 rounded-xl p-4 w-full max-w-sm text-left">
                <div className="flex items-center gap-2 mb-3 text-amber-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-wider uppercase">Contexto Actual</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/50 rounded-lg p-2 border border-gray-800">
                    <span className="block text-gray-500 text-[10px] uppercase">Equity (USD)</span>
                    <span className="text-gray-200 font-mono text-sm">${Number(brainContext.state.account_equity).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 border border-gray-800">
                    <span className="block text-gray-500 text-[10px] uppercase">PnL Diario</span>
                    <span className={`font-mono text-sm ${Number(brainContext.state.daily_pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${Number(brainContext.state.daily_pnl).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 border border-gray-800 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="block text-gray-500 text-[10px] uppercase">Posiciones</span>
                      <span className="text-gray-200 font-mono text-sm">{brainContext.positions.length} activas</span>
                    </div>
                    <Target className="w-4 h-4 text-amber-500/50" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600'
                    : 'bg-gradient-to-br from-amber-500 to-yellow-600 border border-amber-400/50'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-gray-300" />
                ) : (
                  <Brain className="w-4 h-4 text-gray-950" />
                )}
              </div>

              {/* Message */}
              <div
                className={`flex-1 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-[85%] px-4 py-2.5 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tr-sm'
                      : 'bg-amber-950/30 text-amber-50 border border-amber-500/20 rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {msg.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-gray-500">
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.tokens > 0 && (
                    <span className="text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      <BarChart2 className="w-3 h-3 inline mr-1"/>
                      {msg.tokens} tkns
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
              <Brain className="w-4 h-4 text-gray-950" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-4 py-3 rounded-2xl rounded-tl-sm bg-amber-950/30 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                  <span className="text-sm font-mono text-amber-200/70">
                    Procesando consulta...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-amber-500/20 bg-black/40 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Comandos, consultas o análisis..."
            disabled={loading}
            className="flex-1 bg-gray-900/50 border border-amber-500/30 rounded-xl px-4 py-3 text-gray-200 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:bg-gray-900 placeholder-gray-600 disabled:opacity-50 max-h-32 transition-colors"
            rows={1}
            style={{
              minHeight: '48px',
              height: 'auto',
              maxHeight: '128px',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed text-gray-950 rounded-xl p-3 transition-all duration-200 flex items-center justify-center shadow-lg shadow-amber-900/20 border border-amber-400/50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] font-mono text-gray-500 mt-2 text-center uppercase tracking-wider">
          Shift + Enter para nueva línea • Conectado a Lake Core
        </p>
      </div>
    </div>
  );
}