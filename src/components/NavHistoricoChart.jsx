import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient"; // Adjusted import path
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function NavHistoricoChart() {
  const [data, setData] = useState([]);

  // 1️⃣ Cargar datos desde Supabase
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("nav_historico")
      .select("fecha, nav")
      .order("fecha", { ascending: false });

    if (error) console.error("Error cargando NAV:", error);
    else setData(data);
  };

  // 2️⃣ Cargar una vez al montar
  useEffect(() => {
    fetchData();

    // 3️⃣ Escuchar actualizaciones en tiempo real
    const channel = supabase
      .channel("nav_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nav_historico" },
        (payload) => {
          setData((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 4️⃣ Formato de datos para el gráfico
  const reversedData = [...data].reverse(); // Ensure data is reversed for chronological order in chart
  const chartData = reversedData.map((item) => ({
    fecha: new Date(item.fecha).toLocaleDateString("es-CL", {
      month: "short",
    }),
    nav: parseFloat(item.nav).toFixed(2),
  }));

  return (
    <div className="bg-neutral-900 rounded-2xl p-6 shadow-md">
      <h2 className="text-xl font-bold text-yellow-500 mb-4">
        Mercado - NAV Histórico
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="fecha" stroke="#ccc" />
          <YAxis stroke="#ccc" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              borderRadius: "10px",
              border: "1px solid #333",
            }}
          />
          <Line
            type="monotone"
            dataKey="nav"
            stroke="#FFD700"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}