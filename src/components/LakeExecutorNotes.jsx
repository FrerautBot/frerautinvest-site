import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  return date.toLocaleDateString('es-CL', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function LakeExecutorNotes({ user, supabase }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let subscription;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lake_executor_notes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Reverse to show oldest first (top) to newest last (bottom)
        setMessages((data || []).reverse());
      } catch (err) {
        console.error('Error fetching lake_executor_notes:', err);
      } finally {
        setLoading(false);
      }
    };

    const setupSubscription = () => {
      subscription = supabase
        .channel('public:lake_executor_notes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'lake_executor_notes' },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();
    };

    fetchMessages();
    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [supabase]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('lake_executor_notes')
        .insert([
          {
            sender: 'user',
            message: messageText,
            context: 'logs_tab',
            priority: 'normal'
          }
        ]);

      if (error) {
        console.error('Error sending note:', error);
        // Optionally revert UI or show error
      }
    } catch (err) {
      console.error('Unexpected error sending note:', err);
    }
  };

  return (
    <div className="h-[280px] bg-[#0a0c14]/80 border border-white/5 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/[0.02]">
        <MessageSquare className="w-4 h-4 text-emerald-500" />
        <h3 className="text-gray-300 uppercase text-xs font-semibold tracking-wider">
          Notas — Lake Executor
        </h3>
        <span className="ml-auto text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
          {messages.length}
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-full text-gray-500 text-xs">
            Cargando notas...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500 text-xs italic">
            Sin notas registradas.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isLake = msg.sender === 'lake';
              const isHighPriority = msg.priority === 'high' || msg.priority === 'critical';

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${isLake ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isLake ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                    {isLake ? (
                      <Bot className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl border ${
                      isHighPriority
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : isLake
                        ? 'bg-emerald-500/10 border-emerald-500/10 rounded-tl-sm'
                        : 'bg-blue-500/15 border-blue-500/10 rounded-tr-sm'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 mb-1 ${isLake ? '' : 'justify-end'}`}>
                      {isHighPriority && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                      <span className="text-gray-400 text-[10px] font-medium capitalize">
                        {isLake ? 'Lake Executor' : 'Tú'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                    <div className={`flex items-center gap-1 mt-1.5 ${isLake ? '' : 'justify-end'}`}>
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-[9px] text-gray-500">
                        {getRelativeTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-white/5 bg-white/[0.02]">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Dejar nota a Lake..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4 text-emerald-500" />
        </button>
      </form>
    </div>
  );
}