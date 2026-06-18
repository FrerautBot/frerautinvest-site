import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Calendar, DollarSign, Clock, Percent, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BonosCorporativos({ events = [], onRefresh }) {
  const [selectedBono, setSelectedBono] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const activeEvents = events.filter(e => e.estado === 'activo');

  const openDetail = (bono) => {
    setSelectedBono(bono);
    setInvestmentAmount(bono.monto_total ? String(bono.monto_total) : '');
    setShowDetail(true);
  };

  const handleSuscribir = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please login to subscribe to corporate bonds.",
      });
      return;
    }

    if (!investmentAmount || isNaN(investmentAmount) || Number(investmentAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
      });
      return;
    }

    const minAmount = selectedBono?.monto_minimo || selectedBono?.monto_total || 0;
    if (Number(investmentAmount) < minAmount) {
      toast({
        variant: "destructive",
        title: "Minimum Not Met",
        description: `The minimum investment for this bond is $${Number(minAmount).toLocaleString()}.`,
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('suscribir_evento_tesoreria', {
        p_evento_id: selectedBono.id,
        p_usuario_id: user.id,
        p_user_email: user.email,
        p_monto: Number(investmentAmount)
      });

      if (error) throw error;

      if (data && data.success === false) {
        throw new Error(data.mensaje || 'Failed to subscribe');
      }

      toast({
        title: "Subscription Successful",
        description: `You have successfully subscribed to ${selectedBono.titulo}.`,
      });

      setShowDetail(false);
      setSelectedBono(null);
      
      if (onRefresh) {
        onRefresh();
      }

    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        variant: "destructive",
        title: "Subscription Failed",
        description: error.message || "An unexpected error occurred while subscribing.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {activeEvents.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-gray-800">
          <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No Active Bonds</h3>
          <p className="text-gray-400">There are currently no corporate bonds available for subscription.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEvents.map((bono, index) => (
            <motion.div
              key={bono.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col cursor-pointer hover:border-blue-500/50 transition-colors shadow-lg"
              onClick={() => openDetail(bono)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                  <Percent className="w-3 h-3 mr-1" />
                  {bono.tasa_interes}% APY
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{bono.titulo}</h3>
              <p className="text-gray-400 text-sm mb-6 line-clamp-2">{bono.descripcion}</p>

              <div className="mt-auto space-y-3">
                <div className="flex items-center text-sm text-gray-300">
                  <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                  Min. Investment: ${Number(bono.monto_total || 0).toLocaleString()}
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  Period: {bono.plazo_dias ? Math.round(bono.plazo_dias / 30) : 0} Months
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  Payment: {bono.monthly_amount ? 'Monthly' : 'At Maturity'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedBono && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => !loading && setShowDetail(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <button
                onClick={() => !loading && setShowDetail(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8">
                <div className="mb-6">
                  <div className="inline-flex items-center px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium mb-4">
                    Corporate Bond
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedBono.titulo}</h2>
                  <p className="text-gray-400">{selectedBono.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-1">Annual Interest</p>
                    <p className="text-xl font-bold text-emerald-400">{selectedBono.tasa_interes}%</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-1">Term</p>
                    <p className="text-xl font-bold text-white">
                      {selectedBono.plazo_dias ? Math.round(selectedBono.plazo_dias / 30) : 0} Months
                    </p>
                  </div>
                </div>

                {selectedBono.benefits && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">Benefits</h4>
                    <div className="text-sm text-gray-400 bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
                      {typeof selectedBono.benefits === 'string' 
                        ? selectedBono.benefits 
                        : JSON.stringify(selectedBono.benefits)}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="investment" className="text-gray-300">Investment Amount ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        id="investment"
                        type="number"
                        min={selectedBono.monto_total || 0}
                        step="100"
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(e.target.value)}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-lg"
                        placeholder="0.00"
                        disabled={loading}
                      />
                    </div>
                    {selectedBono.monto_total && (
                      <p className="text-xs text-gray-500 text-right">
                        Minimum: ${Number(selectedBono.monto_total).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleSuscribir} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl mt-4"
                    disabled={loading || !investmentAmount}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Subscribe Now'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}