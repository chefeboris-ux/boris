import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Sale, SaleStatus, CustomerData, AppPermission, StatusHistoryEntry } from '../types.ts';
import { useApp } from '../App.tsx';
import { supabase } from '../lib/supabase.ts';
import { cpf as cpfValidator, cnpj as cnpjValidator } from 'cpf-cnpj-validator';

interface SellerDashboardProps {
  user: User;
}

const extractFilename = (url: string) => {
  if (!url) return '';
  const lastSlash = url.lastIndexOf('/');
  const fileNamePart = lastSlash !== -1 ? url.substring(lastSlash + 1) : url;
  const firstUnderscore = fileNamePart.indexOf('_');
  if (firstUnderscore !== -1) {
    return fileNamePart.substring(firstUnderscore + 1);
  }
  return fileNamePart;
};

const InputField = ({ label, field, formData, setFormData, touched, setTouched, errors, type = 'text', required = true, placeholder = '', className = '', maxLength, disabled = false }: any) => {
  const hasError = touched[field] && errors[field];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    let val = e.target.value;

    if (type === 'tel') {
      const v = val.replace(/\D/g, '').slice(0, 11);
      if (v.length === 0) val = '';
      else if (v.length <= 2) val = `(${v}`;
      else if (v.length <= 6) val = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      else if (v.length <= 10) val = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
      else val = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    }

    setFormData({ ...formData, [field]: val });
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input 
        type={type} 
        placeholder={placeholder} 
        maxLength={type === 'tel' ? 15 : maxLength}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${
          disabled ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' :
          hasError ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-500'
        }`} 
        value={(formData as any)[field] || ''} 
        onChange={handleChange}
        onBlur={() => !disabled && setTouched((prev: any) => ({ ...prev, [field]: true }))}
      />
      {hasError && !disabled && <p className="text-[9px] text-red-500 font-bold ml-1">{errors[field]}</p>}
    </div>
  );
};

const SellerDashboard: React.FC<SellerDashboardProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [viewingReturnReason, setViewingReturnReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useApp();

  const initialCustomerData: CustomerData = {
    nome: '', cpf: '', data_nascimento: '', nome_mae: '', contato: '',
    email: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    cep: '', plano: '', vencimento_dia: 10, anotacoes: '', audio_url: '',
    foto_frente_url: '', foto_verso_url: '', foto_ctps_url: '',
    foto_comprovante_residencia_url: ''
  };

  const [formData, setFormData] = useState<CustomerData>(initialCustomerData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTarget = useRef<string | null>(null);

  const isReadOnly = useMemo(() => {
    if (!editingSaleId) return false;
    const sale = sales.find(s => s.id === editingSaleId);
    return sale?.status === SaleStatus.FINISHED;
  }, [editingSaleId, sales]);

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('seller_id', user.id)
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-save rascunho no Supabase
  useEffect(() => {
    if (!showModal || isReadOnly) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      if (formData.nome || formData.cpf) {
        const payload = {
          id: editingSaleId?.startsWith('TMP_') ? undefined : editingSaleId,
          seller_id: user.id,
          seller_name: user.name,
          customer_data: formData,
          status: SaleStatus.DRAFT,
          status_history: [{ status: SaleStatus.DRAFT, updatedBy: user.name, updatedAt: new Date().toISOString() }],
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('sales')
          .upsert(payload, { onConflict: 'id' })
          .select();

        if (data && data[0] && !editingSaleId) {
          setEditingSaleId(data[0].id);
        }
      }
    }, 5000);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [formData, showModal, editingSaleId, user.id, user.name, isReadOnly]);

  const errors = useMemo(() => {
    if (isReadOnly) return {};
    const errs: Record<string, string> = {};
    if (formData.nome.trim().length <= 3) errs.nome = "Nome muito curto";
    const cleanDoc = (formData.cpf || '').replace(/[^\d]/g, '');
    if (cleanDoc.length === 11) { if (!cpfValidator.isValid(cleanDoc)) errs.cpf = "CPF Inválido"; }
    else if (cleanDoc.length === 14) { if (!cnpjValidator.isValid(cleanDoc)) errs.cpf = "CNPJ Inválido"; }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Formato de e-mail inválido";
    }

    if (!formData.plano) errs.plano = "Obrigatório";
    if (!formData.cep) errs.cep = "Obrigatório";
    if (!formData.rua) errs.rua = "Obrigatório";
    if (!formData.numero) errs.numero = "Obrigatório";
    return errs;
  }, [formData, isReadOnly]);

  const isFormValid = Object.keys(errors).length === 0 && 
                      formData.nome && 
                      formData.cpf && 
                      formData.email &&
                      formData.plano && 
                      formData.audio_url &&
                      formData.cep &&
                      formData.rua &&
                      formData.numero;

  const handleCepLookup = async (cep: string) => {
    if (isReadOnly) return;
    const cleanCep = cep.replace(/[^\d]/g, '');
    if (cleanCep.length !== 8) return;
    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev, 
          rua: data.logradouro || prev.rua, 
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade, 
          estado: data.uf || prev.estado, 
          cep: data.cep
        }));
      }
    } catch (e) {}
    finally { setIsCepLoading(false); }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este rascunho permanentemente?")) {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', draftId);

      if (!error) {
        await loadData();
        setShowModal(false);
        setEditingSaleId(null);
        setFormData(initialCustomerData);
        notify("Rascunho excluído.", "info");
      }
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!isFormValid) {
      setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      notify("Campos obrigatórios pendentes ou inválidos.", "warning");
      return;
    }

    const existingSale = sales.find(s => s.id === editingSaleId);

    const payload = {
      id: editingSaleId,
      seller_id: user.id,
      seller_name: user.name,
      customer_data: formData,
      status: SaleStatus.IN_PROGRESS,
      return_reason: null,
      status_history: [
        ...(existingSale?.statusHistory || []),
        { status: SaleStatus.IN_PROGRESS, updatedBy: user.name, updatedAt: new Date().toISOString() }
      ],
      created_at: existingSale?.createdAt || new Date().toISOString()
    };

    const { error } = await supabase
      .from('sales')
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      await loadData();
      setShowModal(false);
      setFormData(initialCustomerData);
      setEditingSaleId(null);
      setTouched({});
      notify("Ficha enviada com sucesso!", "success");
    } else {
      notify("Erro ao enviar ficha.", "warning");
    }
  };

  const openNewModal = () => {
    setFormData(initialCustomerData);
    setEditingSaleId(null);
    setTouched({});
    setShowModal(true);
  };

  const openEditModal = (sale: Sale) => {
    setFormData(sale.customerData);
    setEditingSaleId(sale.id);
    setTouched({});
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = currentUploadTarget.current;
    if (!field || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingField(field);
    
    notify(`Fazendo upload de ${file.name}...`, 'info');
    
    // Simulação de storage no Supabase (usaria bucket real se configurado)
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('sales-documents')
      .upload(filePath, file);

    const publicUrl = supabase.storage.from('sales-documents').getPublicUrl(filePath).data.publicUrl;
    
    setFormData(prev => ({ ...prev, [field]: publicUrl }));
    setUploadingField(null);
    notify(`Arquivo anexado.`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileUpload = (field: string) => {
    if (isReadOnly) return;
    currentUploadTarget.current = field;
    if (fileInputRef.current) {
      if (field === 'audio_url') fileInputRef.current.accept = 'audio/*';
      else fileInputRef.current.accept = 'image/*,application/pdf';
      fileInputRef.current.click();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas Vendas</h1>
          <p className="text-slate-500 text-sm">Gerenciamento de fichas enviadas ao banco de dados.</p>
        </div>
        <button onClick={openNewModal} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 font-bold transition-all">
          <i className="fas fa-plus mr-2"></i> Nova Ficha
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr className="text-xs font-bold text-slate-500 uppercase">
              <th className="px-6 py-4">Ref / Data</th>
              <th className="px-6 py-4">Cliente / Info</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {sales.length > 0 ? sales.map(sale => {
              const hasReturnReason = !!sale.returnReason && sale.status === SaleStatus.IN_PROGRESS;
              const isDraft = sale.status === SaleStatus.DRAFT;
              const isFinished = sale.status === SaleStatus.FINISHED;
              return (
                <tr key={sale.id} className={`hover:bg-slate-50/50 transition-colors ${hasReturnReason ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">#{sale.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-slate-400">{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-slate-900">{sale.customerData.nome || 'Pendente...'}</p>
                      {hasReturnReason && (
                        <button onClick={() => setViewingReturnReason(sale.returnReason!)} className="bg-red-100 text-red-600 w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                          <i className="fas fa-exclamation text-[10px]"></i>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p className="text-[10px] font-mono text-slate-400">{sale.customerData.cpf || '---'}</p>
                      <span className="text-[10px] text-slate-300">•</span>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {sale.customerData.cidade || '---'} - {sale.customerData.estado || '--'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      isDraft ? 'bg-slate-100 text-slate-400 border-slate-200' :
                      hasReturnReason ? 'bg-red-50 text-red-700 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {hasReturnReason ? 'NECESSITA CORREÇÃO' : sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button onClick={() => openEditModal(sale)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors">
                      <i className={`fas ${isDraft || hasReturnReason ? 'fa-edit' : 'fa-eye'}`}></i>
                    </button>
                    {isDraft && (
                      <button onClick={() => handleDeleteDraft(sale.id)} className="text-red-400 p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma ficha no banco.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className={`px-8 py-4 text-white flex justify-between items-center ${isReadOnly ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              <div>
                <h3 className="text-lg font-bold">{isReadOnly ? 'Ficha Finalizada' : 'Ficha Cadastral Nexus'}</h3>
                {!isReadOnly && <p className="text-[10px] text-indigo-200 font-bold uppercase"><i className="fas fa-sync fa-spin mr-2"></i> Sync Cloud Ativo</p>}
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleCreateSale} className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nome Completo" field="nome" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-2" disabled={isReadOnly} />
                <InputField label="CPF/CNPJ" field="cpf" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} disabled={isReadOnly} />
                <InputField label="Data Nasc." field="data_nascimento" type="date" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} disabled={isReadOnly} />
                <InputField label="E-mail" field="email" type="email" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} disabled={isReadOnly} />
                <InputField label="Contato" field="contato" type="tel" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} disabled={isReadOnly} />
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest border-b pb-1">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">CEP {isCepLoading && <i className="fas fa-spinner fa-spin text-indigo-500"></i>}</label>
                    <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100" disabled={isReadOnly} value={formData.cep} onChange={e => {setFormData({...formData, cep: e.target.value}); if(e.target.value.length === 8) handleCepLookup(e.target.value)}} maxLength={9} placeholder="00000-000" />
                  </div>
                  <InputField label="Rua" field="rua" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-4" disabled={isReadOnly} />
                  <InputField label="Nº" field="numero" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-1" disabled={isReadOnly} />
                  <InputField label="Complemento" field="complemento" required={false} formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-2" disabled={isReadOnly} />
                  <InputField label="Bairro" field="bairro" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-2" disabled={isReadOnly} />
                  <InputField label="Cidade" field="cidade" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-2" disabled={isReadOnly} />
                  <InputField label="UF" field="estado" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} className="md:col-span-1" disabled={isReadOnly} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Plano" field="plano" formData={formData} setFormData={setFormData} touched={touched} setTouched={setTouched} errors={errors} disabled={isReadOnly} />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vencimento</label>
                  <select disabled={isReadOnly} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white" value={formData.vencimento_dia} onChange={e => setFormData({...formData, vencimento_dia: parseInt(e.target.value)})}>
                    {[5, 10, 15, 20, 25, 30].map(d => <option key={d} value={d}>Dia {d}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { field: 'foto_frente_url', label: 'RG Frente' },
                  { field: 'foto_verso_url', label: 'RG Verso' },
                  { field: 'foto_comprovante_residencia_url', label: 'Comprovante' },
                  { field: 'foto_ctps_url', label: 'CTPS' },
                  { field: 'audio_url', label: 'Áudio Cliente' }
                ].map(item => {
                  const val = (formData as any)[item.field];
                  const hasVal = !!val;
                  const isUploading = uploadingField === item.field;
                  return (
                    <button key={item.field} type="button" disabled={isReadOnly || isUploading} onClick={() => triggerFileUpload(item.field)} className={`h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 transition-all ${hasVal ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'} ${isReadOnly ? 'cursor-default opacity-80' : 'hover:border-indigo-300'}`}>
                      <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : hasVal ? 'fa-check-circle' : 'fa-upload'} mb-1`}></i>
                      <span className="text-[8px] font-bold uppercase text-center leading-tight mb-1">{item.label}</span>
                      {hasVal && <span className="text-[7px] text-emerald-700 font-medium truncate w-full px-1 text-center">{extractFilename(val)}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="pt-6 border-t flex justify-between gap-4 sticky bottom-0 bg-white py-4">
                <button type="button" onClick={() => setShowModal(false)} className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold text-xs">FECHAR</button>
                {!isReadOnly && (
                  <button type="submit" disabled={!isFormValid} className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg transition-all ${isFormValid ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                    {editingSaleId && sales.find(s => s.id === editingSaleId)?.returnReason ? 'REENVIAR CORRIGIDA' : 'ENVIAR PARA ANÁLISE'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingReturnReason && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center"><i className="fas fa-exclamation-circle text-red-500 mr-2"></i> Motivo da Devolução</h3>
            <p className="text-sm text-slate-600 italic">"{viewingReturnReason}"</p>
            <button onClick={() => setViewingReturnReason(null)} className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold text-xs">ENTENDIDO</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;