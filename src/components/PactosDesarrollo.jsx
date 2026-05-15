import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Sparkles, DollarSign, Target, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { CreateEventModal, EventoDetailModal, ParticipateModal } from './TreasuryComponents';

const PactosDesarrollo = ({
  events,
  userEmail,
  userId,
  isAdmin,
  navActual,
  hasAcceptedTerms,
  onShowPolicies,
  refreshEvents,
  onBack
}) => {
  const { toast } = useToast();

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showParticipate, setShowParticipate] = useState(false);

  const [creating, setCreating] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [balanceUsuario, setBalanceUsuario] = useState(0);

  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: 'pacto',
    titulo: '',
    descripcion: '',
    monthly_amount: '',
    subscription_discount: '0',
    ue_conversion_percentage: '100',
    benefits: {}
  });

  const obtenerBalanceUsuario = async () => {
    if (isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('saldo_clp')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setBalanceUsuario(data?.saldo_clp || 0);
    } catch (err) {
      console.error('Error obteniendo balance:', err);
      setBalanceUsuario(0);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { error } = await supabase.from('eventos_tesoreria').insert({
        tipo: 'pacto',
        estado: 'activo',
        titulo: nuevoEvento.titulo,
        descripcion: nuevoEvento.descripcion,
        creado_por: userEmail,
        monthly_amount: parseFloat(nuevoEvento.monthly_amount),
        subscription_discount: parseFloat(nuevoEvento.subscription_discount),
        ue_conversion_percentage: parseFloat(nuevoEvento.ue_conversion_percentage),
        benefits: nuevoEvento.benefits
      });
      if (error) throw error;
      toast({ title: "✅ Pacto creado", description: "Publicado exitosamente" });
      setShowCreate(false);
      refreshEvents();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    finally { setCreating(false); }
  };

  const handleSubscribe = async () => {
    if (!hasAcceptedTerms) {
      onShowPolicies();
      toast({
        title: "Términos requeridos",
        description: "Debes aceptar los términos antes de participar",
        variant: "destructive"
      });
      return;
    }

    // 🔥 VALIDACIÓN: Verificar si ya está suscrito
    try {
      const { data: yaSuscrito, error: errorCheck } = await supabase.rpc('usuario_tiene_suscripcion_activa', {
        p_usuario_id: userId,
        p_evento_id: selectedEvent.id
      });

      if (errorCheck) {
        console.error('Error verificando suscripción:', errorCheck);
      }

      if (yaSuscrito === true) {
        toast({
          title: "Ya estás suscrito",
          description: "Ya tienes una suscripción activa a este pacto. Revisa 'Mis Suscripciones'.",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('Error al verificar suscripción:', error);
      toast({
        title: "Error de validación",
        description: "No se pudo verificar tu suscripción. Intenta nuevamente.",
        variant: "destructive"
      });
      return;
    }

    // Pactos tienen monto fijo mensual
    const monto = parseFloat(selectedEvent.monthly_amount);

    if (!monto || monto <= 0) {
      toast({
        title: "Error",
        description: "El monto del pacto no está definido",
        variant: "destructive"
      });
      return;
    }

    // VALIDAR BALANCE
    await obtenerBalanceUsuario();

    if (monto > balanceUsuario) {
      toast({
        title: "Fondos insuficientes",
        description: `Tu saldo disponible es $${balanceUsuario.toLocaleString('es-CL')}. No puedes suscribirte a este pacto de $${monto.toLocaleString('es-CL')}.`,
        variant: "destructive"
      });
      return;
    }

    setParticipating(true);
    try {
      // USAR RPC para transacción atómica
      const { data, error } = await supabase.rpc('suscribir_evento_tesoreria', {
        p_evento_id: selectedEvent.id,
        p_usuario_id: userId,
        p_user_email: userEmail,
        p_monto: monto
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.mensaje || 'Error al procesar la suscripción');
      }

      toast({
        title: "✅ Suscrito al Pacto",
        description: `Suscripción mensual de $${monto.toLocaleString('es-CL')} iniciada`
      });

      setShowParticipate(false);
      setShowDetail(false);
      refreshEvents();
      await obtenerBalanceUsuario(); // Refrescar balance
    } catch (e) {
      console.error('Error al suscribirse:', e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    finally { setParticipating(false); }
  };

  const handleCancelEvent = async (id, parts) => {
    if (parts?.length > 0) return toast({ title: "Error", description: "Tiene suscripciones", variant: "destructive" });
    setCanceling(true);
    try {
      await supabase.from('eventos_tesoreria').update({ estado: 'cancelado' }).eq('id', id);
      toast({ title: "✅ Cancelado" });
      setShowDetail(false);
      refreshEvents();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setCanceling(false); }
  };

  const handleDeleteEvent = async (id, parts) => {
    if (parts?.length > 0) return;
    setCanceling(true);
    try {
      await supabase.from('eventos_tesoreria').delete().eq('id', id);
      toast({ title: "✅ Eliminado" });
      setShowDetail(false);
      refreshEvents();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors text-emerald-400 group">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-emerald-400">Pactos de Desarrollo</h1>
            <p className="text-slate-400">Suscripciones estratégicas Lake AI</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => { setNuevoEvento({ ...nuevoEvento, tipo: 'pacto' }); setShowCreate(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
            <Plus size={20} /> Crear Pacto
          </button>
        )}
      </div>

      {/* Banner de balance */}
      {!isAdmin && balanceUsuario !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Saldo disponible para invertir</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${balanceUsuario.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
        </motion.div>
      )}

      <div className="grid gap-4">
        {events.map(evento => (
          <div
            key={evento.id}
            onClick={() => {
              setSelectedEvent(evento);
              if (!isAdmin) obtenerBalanceUsuario();
              setShowDetail(true);
            }}
            className="bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 cursor-pointer transition-all group"
          >
            <div className="flex gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 h-fit">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">Pacto</span>
                  {evento.estado === 'activo' && <span className="flex items-center gap-1 text-xs text-emerald-400"><Clock size={12} /> Activo</span>}
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">{evento.titulo}</h3>
                <div className="flex flex-wrap gap-4 text-sm mt-3">
                  <div className="flex items-center gap-2"><DollarSign size={16} className="text-emerald-400" /><span className="text-emerald-400">${parseFloat(evento.monthly_amount).toLocaleString()}/mes</span></div>
                  <div className="flex items-center gap-2"><Target size={16} className="text-slate-500" /><span className="text-slate-300">{evento.ue_conversion_percentage}% → UEs</span></div>
                  {evento.subscription_discount > 0 && <div className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400" /><span className="text-emerald-400">{evento.subscription_discount}% off</span></div>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && <div className="text-center text-slate-500 py-10">No hay pactos activos</div>}
      </div>

      <CreateEventModal show={showCreate} nuevoEvento={nuevoEvento} setNuevoEvento={setNuevoEvento} creating={creating} onClose={() => setShowCreate(false)} onCreate={handleCreate} />

      <EventoDetailModal
        show={showDetail}
        evento={selectedEvent}
        isAdmin={isAdmin}
        navActual={navActual}
        canceling={canceling}
        datosUsuario={null}
        onClose={() => {
          setShowDetail(false);
          setSelectedEvent(null);
        }}
        onCancel={handleCancelEvent}
        onDelete={handleDeleteEvent}
        onParticipate={() => setShowParticipate(true)}
        getTipoLabel={() => 'Pacto de Desarrollo'}
        getTipoIcon={() => Sparkles}
        getTipoColor={() => 'text-emerald-400 bg-emerald-400/10'}
        calcularProgreso={() => 0}
      />

      <ParticipateModal
        show={showParticipate}
        evento={selectedEvent}
        monto={selectedEvent?.monthly_amount}
        setMonto={() => { }}
        participating={participating}
        onClose={() => setShowParticipate(false)}
        onParticipate={handleSubscribe}
      />
    </motion.div>
  );
};

export default PactosDesarrollo;