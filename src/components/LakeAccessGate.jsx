import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';

const LakeAccessGate = ({ children, onSubscribeClick }) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        return;
      }
      
      try {
        // 1. Verificar perfil del usuario para permisos (tiene_lake) o estado de admin
        const { data: profile, error } = await supabase
          .from('usuarios')
          .select('tiene_lake, es_admin')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        }

        if (profile) {
          // Si es admin o tiene flag de lake
          if (profile.es_admin || profile.tiene_lake) {
            setHasAccess(true);
            return;
          }
        }

        // Si no se cumple ninguna condición
        setHasAccess(false);
      } catch (err) {
        console.error('Error in access check:', err);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [user]);

  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm animate-pulse">Verificando credenciales Lake...</p>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] left-[20%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 max-w-3xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/10"
      >
        <div className="grid md:grid-cols-5 h-full">
          {/* Left Panel - Visual */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col justify-between relative overflow-hidden border-r border-slate-800/50">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1000&auto=format&fit=crop')" }}></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 mb-6">
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Zona Restringida</h3>
              <p className="text-sm text-slate-400">Acceso exclusivo para inversores con suscripción activa.</p>
            </div>

            <div className="relative z-10 mt-12 space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                Algoritmos Predictivos
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                Señales de Mercado
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                Auditoría en Tiempo Real
              </div>
            </div>
          </div>

          {/* Right Panel - Action */}
          <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center text-center md:text-left">
            <div className="inline-flex items-center gap-2 self-center md:self-start bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Lake AI Intelligence</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Desbloquea el Poder de la <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Inteligencia Artificial</span>
            </h2>

            <p className="text-slate-400 mb-8 leading-relaxed">
              Lake AI analiza millones de puntos de datos para detectar oportunidades de inversión en tiempo real. Para acceder a esta tecnología, necesitas un 
              <span className="text-white font-medium"> Pacto de Desarrollo</span> activo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button 
                onClick={onSubscribeClick}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 group"
              >
                Suscribir Pacto
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <p className="text-xs text-slate-500 mt-6 flex items-center justify-center md:justify-start gap-2">
              <ShieldAlert className="w-3 h-3" />
              Acceso inmediato tras la confirmación de suscripción
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LakeAccessGate;