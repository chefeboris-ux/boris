import React, { useState, useEffect, useMemo } from 'react';
import { Sale, SaleStatus, User, UserRole } from '../types.ts';
import { supabase } from '../lib/supabase.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface BIProps {
  user: User;
}

const BusinessIntelligence: React.FC<BIProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const query = supabase.from('sales').select('*').neq('status', SaleStatus.DRAFT);
      
      if (user.role === UserRole.SELLER) {
        query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (data) {
        setSales(data.map(s => ({
          id: s.id,
          sellerId: s.seller_id,
          sellerName: s.seller_name,
          customerData: s.customer_data,
          status: s.status as SaleStatus,
          statusHistory: s.status_history,
          createdAt: s.created_at
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [user.id]);

  const stats = useMemo(() => {
    const total = sales.length;
    const finished = sales.filter(s => s.status === SaleStatus.FINISHED).length;
    const analyzing = sales.filter(s => s.status === SaleStatus.ANALYZED).length;
    const conversion = total > 0 ? ((finished / total) * 100).toFixed(1) : 0;

    return { total, finished, analyzing, conversion };
  }, [sales]);

  const pieData = useMemo(() => {
    return [
      { name: 'Finalizadas', value: stats.finished, color: '#10b981' },
      { name: 'Em Análise', value: stats.analyzing, color: '#6366f1' },
      { name: 'Em Andamento', value: sales.filter(s => s.status === SaleStatus.IN_PROGRESS).length, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [sales, stats]);

  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString();
    }).reverse();

    return last7Days.map(date => ({
      name: date.split('/')[0] + '/' + date.split('/')[1],
      vendas: sales.filter(s => new Date(s.createdAt).toLocaleDateString() === date).length
    }));
  }, [sales]);

  if (isLoading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Nexus</h1>
        <p className="text-slate-500 text-sm">Dados consolidados do banco central em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Volume Total', value: stats.total, icon: 'fa-database', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Conversão', value: `${stats.conversion}%`, icon: 'fa-chart-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pendentes', value: stats.analyzing, icon: 'fa-clock', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Finalizadas', value: stats.finished, icon: 'fa-check-double', color: 'text-slate-600', bg: 'bg-slate-100' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center text-xl`}><i className={`fas ${kpi.icon}`}></i></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase mb-6">Cadastros p/ Dia</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tick={{fontSize: 10}} />
                <Tooltip />
                <Area type="monotone" dataKey="vendas" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase mb-6">Status Geral</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessIntelligence;