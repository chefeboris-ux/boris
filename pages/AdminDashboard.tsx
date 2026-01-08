
import React, { useState } from 'react';
import { UserRole, AppPermission, User } from '../types.ts';
import { useApp } from '../App.tsx';

const AdminDashboard: React.FC = () => {
  const { permissions, updateRolePermissions, users, updateUser, deleteUser, notify } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');

  const togglePermission = (role: UserRole, permission: AppPermission) => {
    const currentPerms = permissions[role] || [];
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter(p => p !== permission)
      : [...currentPerms, permission];
    updateRolePermissions(role, newPerms);
  };

  const changeRole = (id: string, newRole: UserRole) => {
    updateUser(id, { role: newRole });
    notify("Cargo atualizado com sucesso.", "success");
  };

  const toggleConfirmation = (id: string, currentStatus: boolean) => {
    updateUser(id, { confirmed: !currentStatus });
    notify(!currentStatus ? "Usuário aprovado com sucesso!" : "Acesso do usuário revogado.", "info");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações Enterprise</h1>
          <p className="text-slate-500">Gestão de acesso e segurança da plataforma NexusCRM.</p>
        </div>
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm self-stretch md:self-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <i className="fas fa-users mr-2"></i> Usuários
          </button>
          <button 
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <i className="fas fa-shield-alt mr-2"></i> Permissões
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Perfil</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u: User) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                      >
                        <option value={UserRole.ADMIN}>Administrador</option>
                        <option value={UserRole.MANAGER}>Gerente</option>
                        <option value={UserRole.SELLER}>Vendedor</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.confirmed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => toggleConfirmation(u.id, u.confirmed)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          u.confirmed 
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
                        }`}
                      >
                        {u.confirmed ? 'Bloquear' : 'Aprovar'}
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
                            deleteUser(u.id);
                          }
                        }}
                        className="text-slate-300 hover:text-red-600 transition-colors p-2"
                        title="Excluir Usuário"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Matriz de Controle de Acesso (RBAC)</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Configuração Granular de Permissões</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Funcionalidade</th>
                  {Object.values(UserRole).map(role => (
                    <th key={role} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(AppPermission).map(permission => (
                  <tr key={permission} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 capitalize">{permission.replace(/_/g, ' ').toLowerCase()}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Controle de Fluxo</p>
                    </td>
                    {Object.values(UserRole).map(role => (
                      <td key={`${role}-${permission}`} className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={(permissions[role] || []).includes(permission)}
                            onChange={() => togglePermission(role, permission)}
                            disabled={role === UserRole.ADMIN && permission === AppPermission.ACCESS_ADMIN_PANEL}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start space-x-3">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
          <i className="fas fa-info-circle"></i>
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">Políticas de Segurança</h4>
          <p className="text-xs text-indigo-700 leading-relaxed mt-1">
            Novos cadastros realizados via página pública de registro entram no sistema com o status <span className="font-bold italic">"Pendente"</span>. 
            Eles não poderão efetuar login até que você aprove o acesso nesta tela. O perfil Admin possui permissões mestre por padrão.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
