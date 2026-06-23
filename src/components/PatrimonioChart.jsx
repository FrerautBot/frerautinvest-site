import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PatrimonioChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 bg-black/20 rounded-xl border border-white/5">
        No hay datos historicos disponibles
      </div>
    );
  }

  // Formatter for currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Formatter for date in X axis
  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'd MMM', { locale: es });
    } catch (e) {
      return '';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/10 p-4 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-gray-400 text-xs mb-2">{format(new Date(label), 'd MMMM yyyy', { locale: es })}</p>
          <p className="text-emerald-400 font-bold text-lg">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Patrimonio Total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[350px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="fecha" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis 
            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="patrimonio_total_real"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorPatrimonio)"
            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PatrimonioChart;