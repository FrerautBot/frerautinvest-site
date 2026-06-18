import React, { useState, useEffect, useRef } from 'react';
import { 
  PieChart, Wallet, BarChart3, Brain, FileText, Landmark,
  ClipboardList, Activity, LayoutDashboard, TrendingUp,
  Star, Shield, Zap, ChevronDown, Briefcase, Receipt, Gavel, KeyRound, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Navigation = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [hasUEs, setHasUEs] = useState(false);
  const [competenciasOpen, setCompetenciasOpen] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setIsAdmin(user?.email === 'frerautgroups.a@gmail.com');
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const { supabase } = await import('@/lib/customSupabaseClient');
        const [rolesRes, ucRes, ehRes, gobRes] = await Promise.all([
          supabase.from('user_roles').select('role').eq('usuario_id', user.id),
          supabase.from('user_cartera').select('ue_totales').eq('usuario_id', user.id).limit(1),
          supabase.from('ue_holdings').select('quantity').eq('user_id', user.id),
          supabase.from('gobierno_corporativo').select('admin_email').limit(1)
        ]);
        setUserRoles((rolesRes.data || []).map(r => r.role));
        const uesOrd = parseFloat(ucRes.data?.[0]?.ue_totales || 0);
        const uesSpec = (ehRes.data || []).reduce((s, h) => s + parseFloat(h.quantity || 0), 0);
        setHasUEs(uesOrd > 0 || uesSpec > 0);
        // Check if current user is the authorized admin
        const adminEmail = gobRes.data?.[0]?.admin_email;
        setIsAuthorizedAdmin(!!adminEmail && user.email === adminEmail);
      } catch(e) { console.error('Nav load error:', e); }
    };
    load();
  }, [user]);

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setAdminLoading(false); return; }
      const res = await fetch('https://zkjbwdstqnehamfvpsfr.supabase.co/functions/v1/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.access_token && data.refresh_token) {
        await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
        window.location.reload();
      } else {
        console.error('Admin login failed:', data.error);
      }
    } catch(e) { console.error('Admin login error:', e); }
    setAdminLoading(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCompetenciasOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setCompetenciasOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const canAccessAnalyzer = isAdmin 
    || userRoles.includes('gestor_activos') 
    || userRoles.includes('co_administrador');

  // Tabs normales (visibles para todos)
  const mainTabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portafolio', icon: PieChart },
    { id: 'crecimiento', label: 'Crecimiento', icon: TrendingUp },
    { id: 'units', label: 'Mis UEs', icon: Wallet },
    { id: 'market', label: 'Mercado', icon: BarChart3 },
    { id: 'lake', label: 'Lake AI', icon: Brain },
    { id: 'treasury', label: 'Tesorería', icon: Landmark },
    { id: 'reports', label: 'Reportes', icon: FileText },
  ];

  // Tabs que van dentro de "Competencias"
  const competenciasTabs = [];
  // Gobierno Corporativo - visible para cualquiera con UEs o admin
  if (hasUEs || isAdmin) {
    competenciasTabs.push({ id: 'gobierno', label: 'Gobierno Corporativo', icon: Gavel, desc: 'Asamblea, votos y estructura' });
  }
  if (canAccessAnalyzer) {
    competenciasTabs.push({ id: 'analyzer', label: 'Análisis', icon: Star, desc: 'Analista Freraut' });
  }
  // Admin login button - only for the authorized admin from gobierno_corporativo
  if (isAuthorizedAdmin && !isAdmin) {
    competenciasTabs.push({ id: '_admin_login', label: 'Administracion', icon: KeyRound, desc: 'Acceder a cuenta institucional', isAdminLogin: true });
  }
  if (isAdmin) {
    competenciasTabs.push({ id: 'executor', label: 'Executor', icon: Zap, desc: 'Trading automático' });
    competenciasTabs.push({ id: 'pool', label: 'Pool', icon: Activity, desc: 'Gestión de liquidez' });
    competenciasTabs.push({ id: 'retiros', label: 'Retiros', icon: ClipboardList, desc: 'Solicitudes de retiro' });
    competenciasTabs.push({ id: 'roles', label: 'Roles', icon: Shield, desc: 'Gestión de permisos' });
    competenciasTabs.push({ id: 'taxes', label: 'Impuestos', icon: Receipt, desc: 'Centro tributario' });
  }

  const isCompetenciaActive = competenciasTabs.some(t => t.id === activeTab);

  const handleCompetenciaClick = (tabId, isAdminLogin) => {
    if (isAdminLogin) {
      handleAdminLogin();
      setCompetenciasOpen(false);
      return;
    }
    onTabChange(tabId);
    setCompetenciasOpen(false);
  };

  return (
    <nav aria-label="Navegación principal" className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 sticky top-[72px] z-30 transition-colors duration-300">
      <div className="mx-auto px-2 sm:px-4 max-w-full">
        <div className="flex items-center gap-1 sm:gap-1.5 py-2">
          {/* Scrollable nav tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap outline-none flex-shrink-0
                  ${isActive 
                    ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-yellow-500' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.length > 6 ? tab.label.substring(0,5) + '.' : tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-yellow-500 mx-4 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          </div>
          {/* Competencias dropdown - OUTSIDE overflow container */}
          {competenciasTabs.length > 0 && (
            <div ref={dropdownRef} className="relative flex-shrink-0">
              <button
                aria-haspopup="true"
                aria-expanded={competenciasOpen}
                onClick={() => setCompetenciasOpen(!competenciasOpen)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap outline-none border
                  ${isCompetenciaActive
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-500 border-yellow-500/40 shadow-sm shadow-yellow-900/10'
                    : 'text-yellow-600 dark:text-yellow-500/70 border-yellow-500/20 hover:bg-yellow-500/10 hover:border-yellow-500/40'
                  }
                `}
              >
                <Briefcase className="w-4 h-4" />
                <span>Competencias</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${competenciasOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {competenciasOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    className="absolute top-full right-0 mt-2 w-64 bg-[#1a1d2b]/95 backdrop-blur-xl border border-yellow-500/20 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50"
                  >
                    <div className="p-2">
                      <div className="px-3 py-2 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/60">Herramientas especiales</p>
                      </div>
                      {competenciasTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            role="menuitem"
                            onClick={() => handleCompetenciaClick(tab.id, tab.isAdminLogin)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                              ${isActive
                                ? 'bg-yellow-500/15 text-yellow-400'
                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }
                            `}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-yellow-500/20' : 'bg-white/5'}`}>
                              <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold flex items-center gap-2">{tab.label}{tab.isAdminLogin && adminLoading && <Loader2 className="w-3 h-3 animate-spin" />}</p>
                              <p className="text-[10px] text-gray-500">{tab.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>{/* end flex row */}
      </div>
    </nav>
  );
};

export default Navigation;