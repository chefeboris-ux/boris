import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sale, SaleStatus, AppPermission, StatusHistoryEntry, UserRole } from '../types.ts';
import { useApp } from '../App.tsx';
import { supabase } from '../lib/supabase.ts';

const ManagerDashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filterSellerId, setFilterSellerId] = useState<string>('all');
  const [returnReason, setReturnReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { notify, hasPermission, users } = useApp();

  const savedAuth = localStorage.getItem('nexus_auth');
  const currentUser = savedAuth ? JSON.parse(savedAuth).user : null;

  const sellers = useMemo(() => users.filter(u => u.role === UserRole.SELLER), [users]);

  const loadAllSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .neq('status', SaleStatus.DRAFT)
      .order('created_at', { ascending: false });
    
    if (data) {
      setSales(data.map(s => ({
        id: s.id,
        sellerId: s.seller_id,
        sellerName: s.seller_name,
        customerData: s.customer_data,
        status: s.status as SaleStatus,
        statusHistory: s.status_history,
        createdAt: s.created_at,
        returnReason: s.return_reason
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllSales();
    const interval = setInterval(loadAllSales, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredSales = useMemo(() => {
    if (filterSellerId === 'all') return sales;
    return sales.filter(s => s.sellerId === filterSellerId);
  }, [sales, filterSellerId]);

  const handleUpdateStatus = async (id: string, newStatus: SaleStatus, reason?: string) => {
    if (!hasPermission(AppPermission.APPROVE_SALES)) {
      notify("Permissão insuficiente.", "warning");
      return;
    }

    const saleToUpdate = sales.find(s => s.id === id);
    if (!saleToUpdate) return;

    const isRegression = (saleToUpdate.status === SaleStatus.ANALYZED || saleToUpdate.status === SaleStatus.FINISHED) && newStatus === SaleStatus.IN_PROGRESS;

    if (isRegression && (!reason || reason.trim().length < 5)) {
      notify("Justificativa detalhada obrigatória.", "warning");
      return;
    }

    const newHistoryEntry: StatusHistoryEntry = {
      status: newStatus,
      updatedBy: currentUser?.name || 'Sistema',
      updatedAt: new Date().toISOString(),
      reason: isRegression ? reason : undefined
    };

    const updates = {
      status: newStatus,
      return_reason: isRegression ? reason : saleToUpdate.returnReason,
      status_history: [...(saleToUpdate.statusHistory || []), newHistoryEntry]
    };

    const { error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await loadAllSales();
      if (selectedSale?.id === id) setSelectedSale(null);
      setReturnReason('');
      notify(`Venda #${id.slice(0,5)} atualizada para ${newStatus}.`, 'success');
    } else {
      notify("Erro ao atualizar banco.", "warning");
    }
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) { notify("Sem dados.", "warning"); return; }

    const headers = ["ID", "Vendedor", "Cliente", "CPF/CNPJ", "Email", "Telefone", "Cidade", "UF", "Plano", "Status", "Data"];
    const rows = filteredSales.map(s => [
      s.id, s.sellerName, s.customerData.nome, s.customerData.cpf, s.customerData.email,
      s.customerData.contato, s.customerData.cidade, s.customerData.estado, s.customerData.plano,
      s.status, new Date(s.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus_vendas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    notify("Exportação concluída!", "success");
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerência de Vendas</h1>
          <p className="text-slate-500 text-sm">Controle de qualidade e aprovação em tempo real.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button onClick={handleExportCSV} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <i className="fas fa-file-export mr-2 text-indigo-500"></i> Exportar CSV
            </button>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">Vendedor:</label>
              <select value={filterSellerId} onChange={(e) => setFilterSellerId(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent outline-none">
                <option value="all">Todos</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-xs font-bold text-slate-500 uppercase">
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Cliente / Localização</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(sale => {
                const isFinished = sale.status === SaleStatus.FINISHED;
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-600">{sale.sellerName}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{sale.customerData.nome}</p>
                      <p className="text-[10px] text-slate-500 flex items-center mt-0.5"><i className="fas fa-map-marker-alt mr-1"></i>{sale.customerData.cidade} - {sale.customerData.estado}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setSelectedSale(sale); setReturnReason(''); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">ANLISAR</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className={`px-8 py-5 text-white flex justify-between items-center ${selectedSale.status === SaleStatus.FINISHED ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              <div>
                <h3 className="text-xl font-bold">Ficha #{selectedSale.id.slice(0,8)}</h3>
                <p className="text-[10px] uppercase font-bold opacity-80">Vendedor: {selectedSale.sellerName}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Nome</p><p className="text-sm font-bold">{selectedSale.customerData.nome}</p></div>
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">CPF</p><p className="text-sm font-semibold">{selectedSale.customerData.cpf}</p></div>
                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Plano</p><p className="text-sm font-bold text-indigo-600">{selectedSale.customerData.plano}</p></div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Ações do Gerente</h4>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.ANALYZED)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold">MARCAR ANALISADA</button>
                  <button onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.FINISHED)} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold">FINALIZAR VENDA</button>
                  <button onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.IN_PROGRESS, returnReason)} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl text-xs font-bold">DEVOLVER P/ CORREÇÃO</button>
                </div>
                <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Motivo da devolução..." className="w-full p-4 rounded-xl border border-slate-200 outline-none text-sm min-h-[80px]" />
              </div>

              <div className="pt-6 border-t flex justify-end">
                <button onClick={() => setSelectedSale(null)} className="text-slate-500 font-bold py-2 px-8 rounded-xl hover:bg-slate-100">FECHAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;