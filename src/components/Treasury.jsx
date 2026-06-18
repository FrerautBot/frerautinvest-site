import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Scroll, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PoliciesModal, StatsCard, MisSuscripcionesModal } from './TreasuryComponents';
import { Landmark, ShoppingCart, Sparkles, ChevronRight } from 'lucide-react';

// Import sub-pages
import BonosCorporativos from './BonosCorporativos';
import PactosDesarrollo from './PactosDesarrollo';
import OfertasUEs from './OfertasUEs';

const Treasury = ({ onBack }) => {
  const { toast } = useToast();

  // Estados Globales
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'bonos', 'pactos', 'ofertas'
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Datos Usuario
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Modals Globales
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [showSuscripcionesModal, setShowSuscripcionesModal] = useState(false);
  const [acceptedAllPolicies, setAcceptedAllPolicies] = useState(false);

  // Datos Mercado
  const [navActual, setNavActual] = useState(0);

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Efectos Iniciales
  useEffect(() => {
    checkUser();
    loadEventos();
    loadNAV();

    const subscription = supabase
      .channel('treasury_changes_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_tesoreria' }, () => {
        loadEventos();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // --- LOGICA GLOBAL ---

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email);
      setUserId(user.id);
      setIsAdmin(user.email === 'frerautgroups.a@gmail.com');
      await checkTermsAcceptance(user.email);
    }
  };

  const checkTermsAcceptance = async (email) => {
    try {
      const { data } = await supabase
        .from('treasury_terms_acceptance')
        .select('*')
        .eq('user_email', email)
        .single();
      setHasAcceptedTerms(!!data);
    } catch (error) {
      setHasAcceptedTerms(false);
    }
  };

  const loadNAV = async () => {
    try {
      const { data } = await supabase.from('metricas_mercado').select('nav_actual').single();
      if (data) setNavActual(data.nav_actual);
    } catch (error) {
      console.error('Error loading NAV:', error);
    }
  };

  const loadEventos = async () => {
    setLoading(true);
    try {
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos_tesoreria')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (eventosError) throw eventosError;

      const { data: participacionesData } = await supabase
        .from('participaciones_tesoreria')
        .select('*');

      const eventosConParticipaciones = (eventosData || []).map(evento => ({
        ...evento,
        participaciones: (participacionesData || []).filter(p => p.evento_id === evento.id)
      }));

      setEventos(eventosConParticipaciones);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!acceptedAllPolicies) {
      toast({ title: "Requerido", description: "Debes aceptar todas las declaraciones", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from('treasury_terms_acceptance').insert({
        user_email: userEmail,
        user_id: userId,
        version: '1.0'
      });
      if (error) throw error;
      setHasAcceptedTerms(true);
      setShowPoliciesModal(false);
      toast({ title: "Términos aceptados", description: "Ahora puedes participar en eventos" });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateEventGlobal = async (nuevoEvento) => {
    // Esta función puede ser pasada a los hijos si queremos centralizar la creación
    // Por ahora, dejaremos que los hijos manejen su creación para ser más modulares,
    // pero actualizaremos la lista global aquí via loadEventos (pasado como prop refresh)
    await loadEventos();
  };

  // Contadores
  const stats = {
    bonos: eventos.filter(e => e.tipo === 'bono_corporativo' && e.estado === 'activo').length,
    pactos: eventos.filter(e => e.tipo === 'pacto' && e.estado === 'activo').length,
    ofertas: eventos.filter(e => e.tipo === 'lockup_ues' && e.estado === 'activo').length
  };

  const categories = [
    {
      id: 'bonos',
      title: 'Bonos Corporativos',
      description: 'Instrumentos de renta fija con pagos mensuales',
      icon: Landmark,
      count: stats.bonos,
      color: 'cyan'
    },
    {
      id: 'pactos',
      title: 'Pactos de Desarrollo',
      description: 'Acuerdos de suscripción mensual con beneficios Lake AI',
      icon: Sparkles,
      count: stats.pactos,
      color: 'emerald'
    },
    {
      id: 'ofertas',
      title: 'Ofertas de UEs',
      description: 'Adquisición de UEs con descuento y lock-up',
      icon: ShoppingCart,
      count: stats.ofertas,
      color: 'purple'
    }
  ];

  // Renderizado Condicional
  const renderContent = () => {
    const commonProps = {
      userEmail,
      userId,
      isAdmin,
      navActual,
      hasAcceptedTerms,
      onShowPolicies: () => setShowPoliciesModal(true),
      refreshEvents: loadEventos,
      onBack: () => setActiveTab('main')
    };

    switch (activeTab) {
      case 'bonos':
        return <BonosCorporativos {...commonProps} events={eventos.filter(e => e.tipo === 'bono_corporativo')} />;
      case 'pactos':
        return <PactosDesarrollo {...commonProps} events={eventos.filter(e => e.tipo === 'pacto')} />;
      case 'ofertas':
        return <OfertasUEs {...commonProps} events={eventos.filter(e => e.tipo === 'lockup_ues')} />;
      default:
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            {/* Header Principal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors text-cyan-400 group">
                  <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                    Tesorería
                  </h1>
                  <p className="text-slate-400">Selecciona una categoría de inversión</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSuscripcionesModal(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-full text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 transition-all"
                >
                  <Briefcase className="w-5 h-5" />
                  <span className="text-sm font-medium">Mis Suscripciones</span>
                </button>

                <button
                  onClick={() => setShowPoliciesModal(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  <Scroll className="w-5 h-5" />
                  <span className="text-sm font-medium">Políticas</span>
                </button>
              </div>
            </div>

            {/* Categorías */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={cat.id}
                    variants={itemVariants}
                    onClick={() => setActiveTab(cat.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative overflow-hidden bg-slate-900/50 border border-slate-800 rounded-2xl p-6 cursor-pointer 
                      hover:border-${cat.color}-500/50 transition-all duration-300 group
                    `}
                  >
                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                      <Icon className={`w-32 h-32 text-${cat.color}-400`} />
                    </div>

                    <div className="relative z-10 space-y-4">
                      <div className={`w-12 h-12 rounded-xl bg-${cat.color}-500/10 flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 text-${cat.color}-400`} />
                      </div>

                      <div>
                        <h3 className={`text-xl font-bold text-white group-hover:text-${cat.color}-400 transition-colors`}>
                          {cat.title}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">{cat.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className={`text-2xl font-bold text-${cat.color}-400`}>
                          {cat.count}
                        </span>
                        <div className={`p-2 rounded-full bg-${cat.color}-500/10 group-hover:bg-${cat.color}-500/20 transition-colors`}>
                          <ChevronRight className={`w-5 h-5 text-${cat.color}-400`} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Resumen Global */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard title="Eventos Activos" value={stats.bonos + stats.pactos + stats.ofertas} icon={Landmark} color="blue" />
              <StatsCard title="Bonos Disp." value={stats.bonos} icon={Landmark} color="cyan" />
              <StatsCard title="Pactos Disp." value={stats.pactos} icon={Sparkles} color="emerald" />
              <StatsCard title="Ofertas Disp." value={stats.ofertas} icon={ShoppingCart} color="purple" />
            </div>
          </motion.div>
        );
    }
  };

  if (loading && eventos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <Helmet>
        <title>Tesorería - Freraut Invest</title>
      </Helmet>

      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>

      <PoliciesModal
        show={showPoliciesModal}
        hasAcceptedTerms={hasAcceptedTerms}
        acceptedAllPolicies={acceptedAllPolicies}
        setAcceptedAllPolicies={setAcceptedAllPolicies}
        onClose={() => setShowPoliciesModal(false)}
        onAccept={handleAcceptTerms}
      />

      <MisSuscripcionesModal
        show={showSuscripcionesModal}
        onClose={() => setShowSuscripcionesModal(false)}
        userId={userId}
      />
    </div>
  );
};

export default Treasury;