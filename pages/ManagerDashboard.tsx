import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sale, SaleStatus, AppPermission, StatusHistoryEntry, UserRole } from '../types.ts';
import { useApp } from '../App.tsx';

const ManagerDashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filterSellerId, setFilterSellerId] = useState<string>('all');
  const [returnReason, setReturnReason] = useState('');
  const [regressions, setRegressions] = useState<string[]>([]);
  const notifiedRegressions = useRef<Set<string>>(new Set());
  const { notify, hasPermission, users } = useApp();

  const savedAuth = localStorage.getItem('nexus_auth');
  const currentUser = savedAuth ? JSON.parse(savedAuth).user : null;

  const sellers = useMemo(() => {
    return users.filter(u => u.role === UserRole.SELLER);
  }, [users]);

  const loadAllSales = () => {
    const allSales: Sale[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_sales_')) {
        try {
          const userSales = JSON.parse(localStorage.getItem(key) || '[]');
          allSales.push(...userSales);
        } catch (e) {
          console.error("Erro ao ler vendas do localStorage", e);
        }
      }
    }
    
    const submittedSales = allSales.filter(s => s.status !== SaleStatus.DRAFT);
    const sortedSales = submittedSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const currentRegressions: string[] = [];
    sortedSales.forEach(sale => {
      const history = sale.statusHistory || [];
      const hasBeenApproved = history.some(h => h.status === SaleStatus.ANALYZED || h.status === SaleStatus.FINISHED);
      const isCurrentlyEarlyStage = sale.status === SaleStatus.IN_PROGRESS;

      if (hasBeenApproved && isCurrentlyEarlyStage) {
        currentRegressions.push(sale.id);
        if (!notifiedRegressions.current.has(sale.id)) {
          notify(`ALERTA: A venda #${sale.id} retornou para análise após aprovação prévia!`, 'warning');
          notifiedRegressions.current.add(sale.id);
        }
      }
    });

    setRegressions(currentRegressions);
    setSales(sortedSales);
  };

  useEffect(() => {
    loadAllSales();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('nexus_sales_')) loadAllSales();
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(loadAllSales, 5000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const filteredSales = useMemo(() => {
    if (filterSellerId === 'all') return sales;
    return sales.filter(s => s.sellerId === filterSellerId);
  }, [sales, filterSellerId]);

  const handleUpdateStatus = (id: string, newStatus: SaleStatus, reason?: string) => {
    if (!hasPermission(AppPermission.APPROVE_SALES)) {
      notify("Permissão insuficiente.", "warning");
      return;
    }

    const saleToUpdate = sales.find(s => s.id === id);
    if (!saleToUpdate) return;

    // Regressão definida como: sair de ANALYZADA ou FINALIZADA para EM_ANDAMENTO (correção)
    const isRegression = (saleToUpdate.status === SaleStatus.ANALYZED || saleToUpdate.status === SaleStatus.FINISHED) && newStatus === SaleStatus.IN_PROGRESS;

    if (isRegression && (!reason || reason.trim().length < 5)) {
      notify("É obrigatório informar uma justificativa detalhada para o retorno da venda.", "warning");
      return;
    }

    const newHistoryEntry: StatusHistoryEntry = {
      status: newStatus,
      updatedBy: currentUser?.name || 'Sistema',
      updatedAt: new Date().toISOString(),
      reason: isRegression ? reason : undefined
    };

    const updatedSale = { 
      ...saleToUpdate, 
      status: newStatus, 
      returnReason: isRegression ? reason : saleToUpdate.returnReason,
      statusHistory: [...(saleToUpdate.statusHistory || []), newHistoryEntry] 
    };
    
    const storageKey = `nexus_sales_${saleToUpdate.sellerId}`;
    const ownerSales = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedOwnerSales = ownerSales.map((os: Sale) => os.id === id ? updatedSale : os);
    localStorage.setItem(storageKey, JSON.stringify(updatedOwnerSales));

    loadAllSales();
    if (selectedSale?.id === id) setSelectedSale(null);
    setReturnReason('');
    notify(`Status da venda #${id} atualizado para ${newStatus}.`, 'success');
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerência de Vendas</h1>
          <p className="text-slate-500 text-sm">Monitoramento de vendas em tempo real.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">Vendedor:</label>
              <select 
                value={filterSellerId}
                onChange={(e) => setFilterSellerId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                <option value="all">Todos os Vendedores</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
              Vendas: {filteredSales.length}
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
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => {
                  const isFinished = sale.status === SaleStatus.FINISHED;
                  const isRegression = regressions.includes(sale.id);
                  return (
                    <tr key={sale.id} className={`hover:bg-slate-50/50 transition-colors ${isRegression ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-6 py-4 font-medium text-slate-600">{sale.sellerName}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{sale.customerData.nome}</p>
                        <p className="text-[10px] text-slate-500 font-medium flex items-center mt-0.5">
                          <i className="fas fa-map-marker-alt mr-1 text-slate-300"></i>
                          {sale.customerData.cidade || '---'} - {sale.customerData.estado || '--'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          sale.status === SaleStatus.IN_PROGRESS ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setSelectedSale(sale); setReturnReason(''); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                          {isFinished ? 'Ver Detalhes' : 'Analisar Ficha'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className={`px-8 py-5 text-white flex justify-between items-center ${selectedSale.status === SaleStatus.FINISHED ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              <div>
                <h3 className="text-xl font-bold">#{selectedSale.id} - {selectedSale.status === SaleStatus.FINISHED ? 'Ficha Concluída' : 'Análise de Ficha'}</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Vendedor: {selectedSale.sellerName}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors hover:bg-white/20">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 scrollbar-hide">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-user-circle mr-2"></i> Dados Pessoais
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Nome Completo</p><p className="text-sm font-bold">{selectedSale.customerData.nome}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">CPF / CNPJ</p><p className="text-sm font-semibold font-mono">{selectedSale.customerData.cpf}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Data de Nascimento</p><p className="text-sm font-semibold">{selectedSale.customerData.data_nascimento || '---'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Nome da Mãe</p><p className="text-sm font-semibold">{selectedSale.customerData.nome_mae || '---'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">E-mail</p><p className="text-sm font-semibold">{selectedSale.customerData.email || '---'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Contato</p><p className="text-sm font-semibold">{selectedSale.customerData.contato || '---'}</p></div>
                </div>
              </div>

              {/* Seção 2: Endereço */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-map-marker-alt mr-2"></i> Endereço
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1"><p className="text-[10px] text-slate-400 font-bold uppercase">CEP</p><p className="text-sm font-semibold">{selectedSale.customerData.cep || '---'}</p></div>
                  <div className="md:col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">Rua</p><p className="text-sm font-semibold">{selectedSale.customerData.rua || '---'}, {selectedSale.customerData.numero}</p></div>
                  <div className="md:col-span-1"><p className="text-[10px] text-slate-400 font-bold uppercase">Complemento</p><p className="text-sm font-semibold">{selectedSale.customerData.complemento || '---'}</p></div>
                  <div className="md:col-span-1"><p className="text-[10px] text-slate-400 font-bold uppercase">Bairro</p><p className="text-sm font-semibold">{selectedSale.customerData.bairro || '---'}</p></div>
                  <div className="md:col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">Cidade / UF</p><p className="text-sm font-semibold">{selectedSale.customerData.cidade || '---'} - {selectedSale.customerData.estado || '--'}</p></div>
                </div>
              </div>

              {/* Seção 3: Detalhes da Venda */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-shopping-bag mr-2"></i> Detalhes da Venda
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Plano</p><p className="text-sm font-bold text-indigo-600">{selectedSale.customerData.plano}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Dia de Vencimento</p><p className="text-sm font-semibold">Dia {selectedSale.customerData.vencimento_dia}</p></div>
                </div>
                {selectedSale.customerData.anotacoes && (
                  <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Anotações do Vendedor</h4>
                    <p className="text-sm text-slate-700 italic leading-relaxed">
                      "{selectedSale.customerData.anotacoes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Seção 4: Documentos e Arquivos */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center">
                  <i className="fas fa-paperclip mr-2"></i> Documentos e Arquivos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'RG/CNH Frente', url: selectedSale.customerData.foto_frente_url, icon: 'fa-id-card' },
                    { label: 'RG/CNH Verso', url: selectedSale.customerData.foto_verso_url, icon: 'fa-id-card' },
                    { label: 'Comprovante', url: selectedSale.customerData.foto_comprovante_residencia_url, icon: 'fa-home' },
                    { label: 'CTPS Digital', url: selectedSale.customerData.foto_ctps_url, icon: 'fa-briefcase' },
                  ].map((file, idx) => (
                    <div key={idx} className={`aspect-video rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${file.url ? 'bg-slate-50 border-indigo-100' : 'bg-slate-100 border-slate-200 grayscale opacity-40'}`}>
                      <i className={`fas ${file.icon} mb-2 text-slate-400`}></i>
                      <p className="text-[9px] font-bold uppercase text-slate-500">{file.label}</p>
                      {file.url && (
                        <a href="#" onClick={(e) => { e.preventDefault(); notify("Visualização de imagem simulada."); }} className="mt-2 text-[10px] text-indigo-600 font-bold hover:underline">
                          Visualizar Arquivo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedSale.customerData.audio_url && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <i className="fas fa-microphone"></i>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 uppercase">Gravação de Voz</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-tight">Confirmação verbal do cliente anexada</p>
                      </div>
                    </div>
                    <button onClick={() => notify("Player de áudio simulado.")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center">
                      <i className="fas fa-play mr-2"></i> Ouvir Áudio
                    </button>
                  </div>
                )}
              </div>

              {/* Seção de Controle de Status - Ajustada para regressão obrigatória */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Controle de Status</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fluxo de Aprovação:</label>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.ANALYZED)}
                        disabled={selectedSale.status === SaleStatus.FINISHED}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSale.status === SaleStatus.ANALYZED ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                        {selectedSale.status === SaleStatus.FINISHED ? 'Já Analisada' : 'Analisada'}
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.FINISHED)}
                        disabled={selectedSale.status === SaleStatus.FINISHED}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSale.status === SaleStatus.FINISHED ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                        {selectedSale.status === SaleStatus.FINISHED ? 'Concluída' : 'Finalizar Venda'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-red-400 uppercase">Ações de Correção:</label>
                    <button 
                      onClick={() => handleUpdateStatus(selectedSale.id, SaleStatus.IN_PROGRESS, returnReason)}
                      className="w-full px-4 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-all flex items-center justify-center"
                    >
                      <i className="fas fa-undo mr-2"></i> Retornar para Vendedor
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Motivo do Retorno / Justificativa</label>
                    <span className="text-[9px] text-red-500 font-bold uppercase">* Obrigatório para retorno</span>
                  </div>
                  <textarea 
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Descreva detalhadamente o que precisa ser corrigido pelo vendedor..."
                    className={`w-full p-4 rounded-xl border outline-none text-sm min-h-[100px] bg-white transition-all ${
                      returnReason.trim().length > 0 && returnReason.trim().length < 5 ? 'border-amber-300' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {returnReason.trim().length > 0 && returnReason.trim().length < 5 && (
                    <p className="text-[9px] text-amber-600 font-bold mt-1">Insira pelo menos 5 caracteres para justificar.</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end">
                <button onClick={() => setSelectedSale(null)} className="text-slate-500 font-bold py-2 px-8 rounded-xl hover:bg-slate-100 transition-all">Sair da Análise</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;