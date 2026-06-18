import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ShoppingCart, Lock, TrendingUp, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { CreateEventModal, EventoDetailModal, ParticipateModal } from './TreasuryComponents';

const OfertasUEs = ({
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
  const [participacionMonto, setParticipacionMonto] = useState('');

  const [creating, setCreating] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [datosUsuario, setDatosUsuario] = useState(null);
  const [balanceUsuario, setBalanceUsuario] = useState(0); // 🔥 NUEVO

  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: 'lockup_ues',
    titulo: '',
    descripcion: '',
    descuento_porcentaje: '',
    plazo_lockup_dias: ''
  });

  // 🔥 NUEVO: Obtener balance del usuario y retornarlo
  const obtenerBalanceUsuario = async () => {
    if (isAdmin) return 0;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('saldo_clp')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const balance = parseFloat(data?.saldo_clp || 0);
      setBalanceUsuario(balance);
      return balance;
    } catch (err) {
      console.error('Error obteniendo balance:', err);
      setBalanceUsuario(0);
      return 0;
    }
  };

  // 🔥 CORREGIDO: Maneja el caso cuando no hay participaciones
  const calcularDatosUsuario = async (eventoId) => {
    // Si es admin, no calcular datos de usuario
    if (isAdmin) {
      setDatosUsuario(null);
      return;
    }

    // 🔥 Cargar balance al abrir un evento
    await obtenerBalanceUsuario();

    try {
      const { data, error } = await supabase
        .from('participaciones_tesoreria')
        .select('*, eventos_tesoreria(*)')
        .eq('evento_id', eventoId)
        .eq('usuario_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar participación:', error);
        setDatosUsuario(null);
        return;
      }

      if (!data) {
        setDatosUsuario(null);
        return;
      }

      const evento = data.eventos_tesoreria;
      const diasTranscurridos = Math.floor((new Date() - new Date(data.fecha_participacion)) / (1000 * 60 * 60 * 24));
      const progreso = (diasTranscurridos / evento.plazo_lockup_dias) * 100;

      setDatosUsuario({
        diasTranscurridos,
        progreso: Math.min(progreso, 100),
        montoInvertido: data.monto_invertido,
        fechaParticipacion: data.fecha_participacion
      });
    } catch (err) {
      console.error('Error calculando datos usuario:', err);
      setDatosUsuario(null);
    }
  };

  const handleCreate = async () => {
    if (!nuevoEvento.titulo.trim()) {
      toast({ title: "Error", description: "El título es obligatorio", variant: "destructive" });
      return;
    }

    const descuento = parseFloat(nuevoEvento.descuento_porcentaje);
    const plazo = parseInt(nuevoEvento.plazo_lockup_dias);

    if (isNaN(descuento) || descuento <= 0 || descuento >= 100) {
      toast({ title: "Error", description: "El descuento debe estar entre 0% y 100%", variant: "destructive" });
      return;
    }

    if (isNaN(plazo) || plazo <= 0) {
      toast({ title: "Error", description: "El plazo debe ser un número positivo de días", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('eventos_tesoreria').insert({
        tipo: 'lockup_ues',
        estado: 'activo',
        titulo: nuevoEvento.titulo,
        descripcion: nuevoEvento.descripcion,
        creado_por: userEmail,
        descuento_porcentaje: descuento,
        plazo_lockup_dias: plazo
      });

      if (error) throw error;

      toast({ title: "✅ Oferta creada", description: "La oferta se publicó exitosamente" });

      setNuevoEvento({
        tipo: 'lockup_ues',
        titulo: '',
        descripcion: '',
        descuento_porcentaje: '',
        plazo_lockup_dias: ''
      });

      setShowCreate(false);
      refreshEvents();
    } catch (e) {
      console.error('Error al crear oferta:', e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // 🔥 VALIDACIÓN COMPLETA con balance
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

    const monto = parseFloat(participacionMonto);

    if (!monto || monto <= 0) {
      toast({
        title: "Monto inválido",
        description: "Ingresa un monto válido",
        variant: "destructive"
      });
      return;
    }

    // 🔥 VALIDAR BALANCE ANTES DE CONTINUAR
    const currentBalance = await obtenerBalanceUsuario();

    if (monto > currentBalance) {
      toast({
        title: "Fondos insuficientes",
        description: `Tu saldo disponible es $${balanceUsuario.toLocaleString('es-CL')}. No puedes invertir $${monto.toLocaleString('es-CL')}.`,
        variant: "destructive"
      });
      return;
    }

    setParticipating(true);
    try {
      // 🔥 USAR LA FUNCIÓN RPC PARA GARANTIZAR ATOMICIDAD
      const { data, error } = await supabase.rpc('suscribir_evento_tesoreria', {
        p_evento_id: selectedEvent.id,
        p_usuario_id: userId,
        p_user_email: userEmail,
        p_monto: monto
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data.mensaje || 'Error al procesar la suscripción');
      }

      toast({
        title: "✅ Suscripción exitosa",
        description: `Has invertido $${monto.toLocaleString('es-CL')}`
      });

      setParticipacionMonto('');
      setShowParticipate(false);
      setShowDetail(false);
      refreshEvents();

      await calcularDatosUsuario(selectedEvent.id);
      await obtenerBalanceUsuario(); // Refrescar balance
    } catch (e) {
      console.error('Error al suscribirse:', e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setParticipating(false);
    }
  };

  const handleCancelEvent = async (id, parts) => {
    if (parts?.length > 0) {
      toast({
        title: "No se puede cancelar",
        description: "El evento tiene suscripciones activas",
        variant: "destructive"
      });
      return;
    }

    setCanceling(true);
    try {
      const { error } = await supabase
        .from('eventos_tesoreria')
        .update({ estado: 'cancelado' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "✅ Evento cancelado" });
      setShowDetail(false);
      setSelectedEvent(null);
      setDatosUsuario(null);
      refreshEvents();
    } catch (e) {
      console.error('Error al cancelar:', e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  const handleDeleteEvent = async (id, parts) => {
    if (parts?.length > 0) {
      toast({
        title: "No se puede eliminar",
        description: "El evento tiene suscripciones activas",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm('¿Eliminar esta oferta permanentemente?')) {
      return;
    }

    setCanceling(true);
    try {
      await supabase
        .from('participaciones_tesoreria')
        .delete()
        .eq('evento_id', id);

      const { error } = await supabase
        .from('eventos_tesoreria')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "✅ Oferta eliminada" });
      setShowDetail(false);
      setSelectedEvent(null);
      setDatosUsuario(null);
      refreshEvents();
    } catch (e) {
      console.error('Error al eliminar:', e);
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-purple-400 group"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Ofertas de UEs</h1>
            <p className="text-slate-400">Adquisición con descuento (Lock-up)</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setNuevoEvento({
                tipo: 'lockup_ues',
                titulo: '',
                descripcion: '',
                descuento_porcentaje: '',
                plazo_lockup_dias: ''
              });
              setShowCreate(true);
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus size={20} /> Crear Oferta
          </button>
        )}
      </div>

      {/* 🔥 NUEVO: Mostrar balance disponible */}
      {!isAdmin && balanceUsuario !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Saldo disponible para invertir</p>
                <p className="text-2xl font-bold text-purple-400">
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
              if (!isAdmin) {
                calcularDatosUsuario(evento.id);
              }
              setShowDetail(true);
            }}
            className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 rounded-xl p-6 cursor-pointer transition-all group"
          >
            <div className="flex gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 h-fit">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400">
                    Oferta
                  </span>
                  {evento.estado === 'activo' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Clock size={12} /> Activo
                    </span>
                  )}
                  {evento.estado === 'cancelado' && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      Cancelado
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
                  {evento.titulo}
                </h3>
                {evento.descripcion && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{evento.descripcion}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm mt-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-purple-400" />
                    <span className="text-purple-400">{evento.descuento_porcentaje}% descuento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-slate-500" />
                    <span className="text-slate-300">Lock {evento.plazo_lockup_dias} días</span>
                  </div>
                  {navActual > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-slate-500" />
                      <span className="text-slate-300">
                        ${(navActual * (1 - evento.descuento_porcentaje / 100)).toLocaleString('es-CL')} / UE
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-xl border border-slate-800">
            No hay ofertas activas en este momento
          </div>
        )}
      </div>

      <CreateEventModal
        show={showCreate}
        nuevoEvento={nuevoEvento}
        setNuevoEvento={setNuevoEvento}
        creating={creating}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <EventoDetailModal
        show={showDetail}
        evento={selectedEvent}
        isAdmin={isAdmin}
        navActual={navActual}
        canceling={canceling}
        datosUsuario={datosUsuario}
        onClose={() => {
          setShowDetail(false);
          setSelectedEvent(null);
          setDatosUsuario(null);
        }}
        onCancel={handleCancelEvent}
        onDelete={handleDeleteEvent}
        onParticipate={() => setShowParticipate(true)}
        getTipoLabel={() => 'Oferta de UEs'}
        getTipoIcon={() => ShoppingCart}
        getTipoColor={() => 'text-purple-400 bg-purple-400/10 border-purple-400/20'}
        calcularProgreso={() => 0}
      />

      <ParticipateModal
        show={showParticipate}
        evento={selectedEvent}
        monto={participacionMonto}
        setMonto={setParticipacionMonto}
        participating={participating}
        onClose={() => {
          setShowParticipate(false);
          setParticipacionMonto('');
        }}
        onParticipate={handleSubscribe}
      />
    </motion.div>
  );
};

export default OfertasUEs;