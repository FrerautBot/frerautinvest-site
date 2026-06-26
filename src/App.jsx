import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import SplashScreen from '@/components/SplashScreen';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import Portfolio from '@/components/Portfolio';
import MyUnits from '@/components/MyUnits';
import Market from '@/components/Market';
import Reports from '@/components/Reports';
import Lake from '@/components/Lake';
import Settings from '@/components/Settings';
import Treasury from '@/components/Treasury';
import Retiros from '@/components/Retiros';
import Pool from '@/components/Pool';
import Index from '@/components/Index';
import Crecimiento from '@/components/Crecimiento';
import AuthModal from '@/components/AuthModal';
import LakeAccessGate from '@/components/LakeAccessGate';
import PactosDesarrollo from '@/components/PactosDesarrollo';
import BonosCorporativos from '@/components/BonosCorporativos';
import MarketDashboard from '@/components/MarketDashboard';
import FrerautAnalyzer from '@/components/FrerautAnalyzer';
import GestionRoles from '@/components/GestionRoles';
import LakeExecutor from '@/components/LakeExecutor';
import TaxCenter from '@/components/TaxCenter';
import HomePage from '@/pages/HomePage';
import { SkyBackground, useSkyMode } from '@/components/SkyBackground';
import { Toaster } from '@/components/ui/toaster';

const ADMIN_EMAIL = 'frerautgroups.a@gmail.com';

// ========== GOBIERNO CORPORATIVO (embedded) ==========
import { Shield, Crown, Users, Vote, AlertTriangle, Star, Gavel, Eye, Lock, Percent } from 'lucide-react';

function GobiernoCorporativoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredMember, setHoveredMember] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    supabase.rpc('obtener_asamblea').then(({ data: d }) => { if (d) setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">No se pudo cargar</div>;

  const { gobierno, ue_types, miembros, total_miembros } = data;

  // Build seats proportional to % power (not raw votes)
  const seats = [];
  (miembros || []).forEach((m, mi) => {
    const seatCount = Math.min(Math.max(1, Math.round(m.pct_poder / 5)), 20);
    for (let i = 0; i < seatCount; i++) seats.push({ ...m, seatIndex: i, memberIndex: mi });
  });
  const rows = []; const rowSizes = [5,8,11,14,17,20,23]; let si = 0;
  for (let r = 0; r < rowSizes.length && si < seats.length; r++) {
    const rs = []; for (let s = 0; s < rowSizes[r] && si < seats.length; s++) { rs.push(seats[si]); si++; } rows.push(rs);
  }

  // Abilities per type
  const abilities = {
    freraut: [
      { name: 'Peso Mayoritario', desc: 'Capacidad de llenar hasta el 75% del resultado en cualquier votacion', icon: Percent, color: 'text-yellow-400' },
      { name: 'Derecho de Veto', desc: 'Puede bloquear decisiones del administrador', icon: Gavel, color: 'text-red-400' },
      { name: 'Revision de Gestion', desc: 'Facultad de revisar y destituir al administrador si es necesario', icon: Eye, color: 'text-red-400' },
      { name: 'Valor Fundacional', desc: 'Equivalente a 100.000 UEs ordinarias en valor nominal', icon: Crown, color: 'text-amber-400' },
    ],
    ordinaria: [
      { name: 'Derecho a Voto', desc: 'Un voto por UE en asambleas y decisiones corporativas', icon: Vote, color: 'text-blue-400' },
      { name: 'Participacion', desc: 'Participacion proporcional en el rendimiento del fondo', icon: Percent, color: 'text-green-400' },
    ]
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-1 sm:p-2" onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>
      <div className="text-center">
        <h2 className="text-2xl sm:text-4xl font-bold text-yellow-500 tracking-wide mb-2">Gobierno Corporativo</h2>
        <p className="text-xs sm:text-sm text-gray-500">{gobierno?.company_name} — Estructura y representacion</p>
      </div>

      {/* Current Administrator */}
      <div className="bg-[#1a1d2b]/60 backdrop-blur-xl border border-blue-500/20 rounded-[1.75rem] p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center"><Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
            <div>
              <p className="text-[10px] sm:text-xs text-blue-400 font-bold uppercase tracking-widest">Administrador Actual</p>
              <h3 className="text-lg sm:text-xl font-bold text-white">{gobierno?.admin_name}</h3>
              <p className="text-xs text-gray-500">{gobierno?.admin_email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-bold">Gestion operativa</span>
            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-bold">Estrategia</span>
            <span className="px-2 py-1 rounded-lg bg-gray-500/10 text-gray-400 text-[9px] font-bold">Sujeto a revision</span>
          </div>
        </div>
      </div>

      {/* Stats - only members and types, no vote counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1d2b]/60 border border-white/10 rounded-[1.25rem] p-3 sm:p-4 text-center"><Users className="w-5 h-5 text-yellow-400 mx-auto mb-1" /><p className="text-lg sm:text-2xl font-bold text-white">{total_miembros}</p><p className="text-[9px] text-gray-500 uppercase">Accionistas</p></div>
        <div className="bg-[#1a1d2b]/60 border border-white/10 rounded-[1.25rem] p-3 sm:p-4 text-center"><Star className="w-5 h-5 text-amber-400 mx-auto mb-1" /><p className="text-lg sm:text-2xl font-bold text-white">{(ue_types||[]).length}</p><p className="text-[9px] text-gray-500 uppercase">Clases de Accion</p></div>
      </div>

      {/* ASAMBLEA - shows % power, not votes */}
      <div className="bg-[#1a1d2b]/60 backdrop-blur-xl border border-yellow-500/20 rounded-[1.75rem] p-4 sm:p-8 relative overflow-hidden">
        <div className="text-center mb-6"><h3 className="text-base sm:text-lg font-bold text-yellow-400 uppercase tracking-wider flex items-center justify-center gap-2"><Gavel className="w-4 h-4 sm:w-5 sm:h-5" /> Asamblea</h3><p className="text-[10px] sm:text-xs text-gray-500 mt-1">Representacion proporcional de participacion</p></div>
        <div className="flex justify-center mb-6"><div className="w-20 h-10 sm:w-28 sm:h-12 bg-gradient-to-t from-yellow-900/40 to-yellow-700/20 border border-yellow-500/30 rounded-t-xl flex items-center justify-center"><Gavel className="w-4 h-4 text-yellow-500" /></div></div>
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          {rows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1 sm:gap-1.5" style={{ width: `${60 + ri * 8}%` }}>
              {row.map((seat, si2) => {
                const isFreraut = seat.tipo_principal === 'freraut';
                return (
                  <motion.div key={`${ri}-${si2}`} className={`relative cursor-pointer ${isFreraut ? 'bg-gradient-to-br from-yellow-500 to-amber-600 border-yellow-400/50 shadow-lg shadow-yellow-900/30' : 'bg-gradient-to-br from-blue-500/80 to-blue-700/80 border-blue-400/30'} border rounded-sm sm:rounded`} style={{ width: `${Math.max(100/(row.length+2),4)}%`, aspectRatio: '1', minWidth: '12px', maxWidth: '28px' }} whileHover={{ scale: 1.4, zIndex: 10 }} onMouseEnter={() => setHoveredMember(seat)} onMouseLeave={() => setHoveredMember(null)}>
                    {isFreraut && <div className="absolute inset-0 flex items-center justify-center"><Star className="w-2 h-2 sm:w-3 sm:h-3 text-white/80" /></div>}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Hover tooltip - shows % not votes */}
        <AnimatePresence>
          {hoveredMember && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed z-50 pointer-events-none" style={{ left: mousePos.x + 15, top: mousePos.y - 10 }}>
              <div className="bg-[#0f1118]/95 backdrop-blur-xl border border-yellow-500/30 rounded-xl px-4 py-3 shadow-2xl min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">{hoveredMember.tipo_principal === 'freraut' ? <Crown className="w-4 h-4 text-yellow-400" /> : <Users className="w-4 h-4 text-blue-400" />}<span className="text-sm font-bold text-white">{hoveredMember.nombre}</span></div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]"><span className="text-gray-500">Clase</span><span className={`font-bold ${hoveredMember.tipo_principal === 'freraut' ? 'text-yellow-400' : 'text-blue-400'}`}>{hoveredMember.tipo_principal === 'freraut' ? 'UE Freraut' : 'UE Ordinaria'}</span></div>
                  <div className="flex justify-between text-[10px] pt-1 border-t border-white/10"><span className="text-gray-500">Participacion</span><span className="text-yellow-400 font-bold">{hoveredMember.pct_poder}%</span></div>
                  {hoveredMember.peso_mayoritario && <div className="flex items-center gap-1 mt-1"><Percent className="w-3 h-3 text-yellow-400" /><span className="text-[9px] text-yellow-400 font-bold">Peso Mayoritario</span></div>}
                  {hoveredMember.tiene_veto && <div className="flex items-center gap-1"><Lock className="w-3 h-3 text-gray-400" /><span className="text-[9px] text-gray-400">Derecho de veto</span></div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-center gap-4 sm:gap-6 mt-6 pt-4 border-t border-white/5">
          {(ue_types||[]).map(t => (<div key={t.code} className="flex items-center gap-2"><div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${t.code === 'freraut' ? 'bg-gradient-to-br from-yellow-500 to-amber-600' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`} /><div><p className="text-[10px] sm:text-xs text-white font-bold">{t.name}</p></div></div>))}
        </div>
      </div>

      {/* UE Types - show abilities, not vote numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(ue_types||[]).map(t => (
          <div key={t.code} className={`bg-[#1a1d2b]/60 border rounded-[1.75rem] p-4 sm:p-6 ${t.code === 'freraut' ? 'border-yellow-500/20' : 'border-white/10'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.code === 'freraut' ? 'bg-gradient-to-br from-yellow-600 to-amber-800' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>{t.code === 'freraut' ? <Crown className="w-5 h-5 text-white" /> : <Vote className="w-5 h-5 text-white" />}</div>
              <div><h4 className="text-sm sm:text-base font-bold text-white">{t.name}</h4><p className="text-[10px] text-gray-500 max-w-xs">{t.description}</p></div>
            </div>
            <div className="space-y-2">
              {(abilities[t.code] || []).map((a, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-black/20">
                  <a.icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.color}`} />
                  <div><p className="text-[10px] sm:text-xs text-white font-bold">{a.name}</p><p className="text-[9px] text-gray-500">{a.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Members - shows % participation, not raw votes */}
      {miembros && miembros.length > 0 && (
        <div className="bg-[#1a1d2b]/60 border border-white/10 rounded-[1.75rem] p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-gray-200 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-yellow-400" /> Accionistas ({miembros.length})</h3>
          <div className="space-y-3">
            {miembros.map(m => (
              <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.tipo_principal === 'freraut' ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                    {m.tipo_principal === 'freraut' ? <Crown className="w-4 h-4 text-yellow-400" /> : <Users className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{m.nombre}</p>
                    <p className="text-[9px] text-gray-600">{m.tipo_principal === 'freraut' ? 'UE Freraut' : 'UE Ordinaria'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.peso_mayoritario && <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[9px] font-bold">Peso Mayoritario</span>}
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-400">{m.pct_poder}%</p>
                    <p className="text-[9px] text-gray-500">participacion</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// ========== END GOBIERNO CORPORATIVO ==========

function App() {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [financeEvents, setFinanceEvents] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const { skyEnabled, toggleSky, isActive: skyIsActive } = useSkyMode(theme);

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 3000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (session) setShowAuthModal(false); }, [session]);
  useEffect(() => { const r = window.document.documentElement; r.classList.remove('light','dark'); r.classList.add(theme); r.setAttribute('data-theme', theme); }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Puede acceder al Analista: admin, gestor_activos, co_administrador
  const canAccessAnalyzer = () => {
    const email = session?.user?.email;
    if (email === ADMIN_EMAIL) return true;
    return userRoles.includes('gestor_activos') || userRoles.includes('co_administrador');
  };

  // Cargar roles del usuario actual
  const loadUserRoles = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('usuario_id', session.user.id);
      setUserRoles((data || []).map(r => r.role));
    } catch(e) {}
  };

  useEffect(() => { if (session) loadUserRoles(); }, [session]);

  const fetchFinanceEvents = async () => {
    try { const { data, error } = await supabase.from('eventos_tesoreria').select('*').order('fecha_inicio', { ascending: false }); if (!error && data) setFinanceEvents(data); } catch (err) { console.error(err); }
  };

  useEffect(() => { if (session && (activeTab === 'pactos' || activeTab === 'bonos')) fetchFinanceEvents(); }, [session, activeTab]);

  // Landing page pública para visitantes no autenticados
  if (!loading && !session) {
    return (
      <>
        <AnimatePresence mode="wait">
          {showSplash ? <SplashScreen key="splash" /> : (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <HomePage onOpenAuth={() => setShowAuthModal(true)} />
            </motion.div>
          )}
        </AnimatePresence>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <Toaster />
      </>
    );
  }

  const renderContent = () => {
    if (loading) return <div className="text-center p-10">Cargando...</div>;
    if (!session) return <div className="text-center p-10">Inicia sesion para ver el dashboard.</div>;
    if (showSettings) return <Settings onBack={() => setShowSettings(false)} />;
    switch (activeTab) {
      case 'dashboard':   return <Index onNavigate={setActiveTab} />;
      case 'portfolio':   return <Portfolio />;
      case 'crecimiento': return <Crecimiento />;
      case 'units':       return <MyUnits />;
      case 'market':      return <Market />;
      case 'reports':     return <Reports />;
      case 'gobierno':    return <GobiernoCorporativoPage />;
      case 'lake':        return <LakeAccessGate onSubscribeClick={() => setActiveTab('treasury')}><Lake /></LakeAccessGate>;
      case 'treasury':    return <Treasury onBack={() => setActiveTab('dashboard')} />;
      case 'retiros':     return <Retiros onBack={() => setActiveTab('dashboard')} />;
      case 'pool':        return <Pool onBack={() => setActiveTab('dashboard')} />;
      case 'pactos':      return <PactosDesarrollo events={financeEvents.filter(e => e.tipo === 'pacto')} onRefresh={fetchFinanceEvents} />;
      case 'bonos':       return <BonosCorporativos events={financeEvents.filter(e => e.tipo === 'bono_corporativo')} onRefresh={fetchFinanceEvents} />;
      case 'marketdata':  return <MarketDashboard onAnalyze={session?.user?.email === ADMIN_EMAIL ? () => setActiveTab('analyzer') : null} />;
      case 'analyzer':    return canAccessAnalyzer() ? <FrerautAnalyzer theme={theme} /> : <Index onNavigate={setActiveTab} />;
      case 'roles':       return session?.user?.email === ADMIN_EMAIL ? <GestionRoles onBack={() => setActiveTab('dashboard')} /> : <Index onNavigate={setActiveTab} />;
      case 'executor':    return session?.user?.email === ADMIN_EMAIL ? <LakeExecutor onBack={() => setActiveTab('dashboard')} /> : <Index onNavigate={setActiveTab} />;
      case 'taxes':        return session?.user?.email === ADMIN_EMAIL ? <TaxCenter onBack={() => setActiveTab('dashboard')} /> : <Index onNavigate={setActiveTab} />;
      default:            return <Index onNavigate={setActiveTab} />;
    }
  };

  const isFullPage = showSettings || activeTab === 'treasury' || activeTab === 'retiros' || activeTab === 'pool' || activeTab === 'roles' || activeTab === 'executor' || activeTab === 'taxes';

  return (
    <>
      <Helmet><title>Freraut Invest - Investment Dashboard</title><meta name="description" content="Plataforma profesional de inversion privada" /></Helmet>
      <AnimatePresence mode="wait">
        {showSplash ? <SplashScreen key="splash" /> : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className={`min-h-screen relative ${theme}`}>
            <SkyBackground enabled={skyIsActive} />
            <div className="relative z-10">
              {!isFullPage && (<><Header onAuthClick={() => setShowAuthModal(true)} onSettingsClick={() => setShowSettings(true)} theme={theme} toggleTheme={toggleTheme} skyEnabled={skyEnabled} onToggleSky={toggleSky} /><Navigation activeTab={activeTab} onTabChange={setActiveTab} /></>)}
              <main className={isFullPage ? '' : 'container mx-auto px-4 py-8 max-w-7xl'}>
                <AnimatePresence mode="wait">
                  <motion.div key={showSettings ? 'settings' : activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>{renderContent()}</motion.div>
                </AnimatePresence>
              </main>
            </div>
            <AuthModal isOpen={showAuthModal && !session} onClose={() => setShowAuthModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster />
    </>
  );
}

export default App;