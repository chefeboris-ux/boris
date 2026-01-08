import React, { useState, useEffect, useMemo } from 'react';
import { Sale, SaleStatus, User, UserRole } from '../types.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface BIProps {
  user: User;
}

const BusinessIntelligence: React.FC<BIProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);

  const loadData = () => {
    const allSales: Sale[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_sales_')) {
        try {
          const userSales = JSON.parse(localStorage.getItem(key) || '[]');
          allSales.push(...userSales);
        } catch (e) {}
      }
    }
    
    // Filtro por perfil
    const filtered = user.role === UserRole.SELLER 
      ? allSales.filter(s => s.sellerId === user.id)
      : allSales;

    setSales(filtered.filter(s => s.status !== SaleStatus.DRAFT));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
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

  const topSellers = useMemo(() => {
    if (user.role === UserRole.SELLER) return [];
    const counts: Record<string, {name: string, count: number}> = {};
    sales.forEach(s => {
      if (!counts[s.sellerId]) counts[s.sellerId] = { name: s.sellerName, count: 0 };
      if (s.status === SaleStatus.FINISHED) counts[s.sellerId].count += 1;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [sales, user.role]);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard de Acompanhamento</h1>
        <p className="text-slate-500 text-sm">Visão estratégica do fluxo comercial {user.role === UserRole.SELLER ? 'pessoal' : 'global'}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Volume Total', value: stats.total, icon: 'fa-file-invoice', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Taxa de Conversão', value: `${stats.conversion}%`, icon: 'fa-bullseye', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Em Análise', value: stats.analyzing, icon: 'fa-magnifying-glass-chart', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Fichas Concluídas', value: stats.finished, icon: 'fa-circle-check', color: 'text-slate-600', bg: 'bg-slate-100' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center text-xl`}>
              <i className={`fas ${kpi.icon}`}></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Tendência de Cadastros (7 Dias)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                />
                <Area type="monotone" dataKey="vendas" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Status do Funil</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                  <span className="text-slate-500 font-medium">{d.name}</span>
                </div>
                <span className="font-bold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {user.role !== UserRole.SELLER && topSellers.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Top Vendedores (Finalizadas)</h3>
          <div className="space-y-3">
            {topSellers.map((seller, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-indigo-600">#{i+1}</span>
                  <p className="text-sm font-bold text-slate-700">{seller.name}</p>
                </div>
                <p className="text-sm font-extrabold text-slate-900">{seller.count} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Vendas</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessIntelligence;