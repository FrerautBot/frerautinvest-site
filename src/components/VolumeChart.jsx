import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { TrendingUp, TrendingDown } from 'lucide-react';

const VolumeChart = () => {
  const [volumeData, setVolumeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVolumeData();
  }, []);

  const fetchVolumeData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('calcular_ajuste_nav_por_volumen');
      if (error) {
        console.error('Error fetching volume data:', error);
        setVolumeData(null);
      } else if (data && data.length > 0) {
        setVolumeData(data[0]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-center">
        <span className="text-slate-400">Cargando volumen...</span>
      </div>
    );
  }

  if (!volumeData) {
    return (
      <div className="w-full h-80 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-center">
        <span className="text-slate-500">Sin datos de órdenes en los últimos 30 días</span>
      </div>
    );
  }

  // Safe extraction of values with fallbacks to 0 to prevent toFixed errors
  // Note: RPC returns 'ajuste_por_volumen', mapping it to 'ajuste_porcentaje' for display
  const volumen_compras_ejecutadas = Number(volumeData.volumen_compras_ejecutadas || 0);
  const volumen_ventas_vigentes = Number(volumeData.volumen_ventas_vigentes || 0);
  const volumen_neto = Number(volumeData.volumen_neto || 0);
  const ajuste_porcentaje = Number(volumeData.ajuste_por_volumen || volumeData.ajuste_porcentaje || 0);

  const isPositive = volumen_neto >= 0;
  const mensaje = isPositive
    ? 'El volumen de compra presenta un breve aumento, hay más gente comprando'
    : 'El volumen de venta presenta una tendencia, hay más gente vendiendo';

  // Datos para gráfico
  const chartHeight = 150;
  const maxValue = Math.max(volumen_compras_ejecutadas, volumen_ventas_vigentes) || 1;
  const compraHeight = (volumen_compras_ejecutadas / maxValue) * chartHeight;
  const ventaHeight = (volumen_ventas_vigentes / maxValue) * chartHeight;

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Análisis de Volumen</h3>
          <p className={`text-sm mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {mensaje}
          </p>
        </div>
        {isPositive ? (
          <TrendingUp className="w-8 h-8 text-emerald-400" />
        ) : (
          <TrendingDown className="w-8 h-8 text-red-400" />
        )}
      </div>

      {/* Gráfico de barras */}
      <div className="flex justify-center items-end gap-8 mb-8 h-40">
        <div className="flex flex-col items-center">
          <div className="relative h-32 w-16 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
            <div
              className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ height: `${compraHeight}px` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">Compras</p>
          <p className="text-sm text-emerald-400 font-bold">{volumen_compras_ejecutadas.toFixed(2)}</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative h-32 w-16 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
            <div
              className="absolute bottom-0 w-full bg-gradient-to-t from-red-500 to-red-400 transition-all duration-300"
              style={{ height: `${ventaHeight}px` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">Ventas</p>
          <p className="text-sm text-red-400 font-bold">{volumen_ventas_vigentes.toFixed(2)}</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Volumen Neto</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-teal-400' : 'text-orange-400'}`}>
            {volumen_neto.toFixed(2)} UE
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Ajuste NAV</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{ajuste_porcentaje.toFixed(2)}%
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Diferencia</p>
          <p className="text-lg font-bold text-slate-300">
            {(volumen_compras_ejecutadas - volumen_ventas_vigentes).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VolumeChart;