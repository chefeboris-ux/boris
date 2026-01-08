import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, AuthState, User, Notification, AppPermission, RolePermissionsMap } from './types.ts';
import { supabase } from './lib/supabase.ts';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ManagerDashboard from './pages/ManagerDashboard.tsx';
import SellerDashboard from './pages/SellerDashboard.tsx';
import BusinessIntelligence from './pages/BusinessIntelligence.tsx';
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';
import NotificationToast from './components/NotificationToast.tsx';

const DEFAULT_PERMISSIONS: RolePermissionsMap = {
  [UserRole.ADMIN]: [...Object.values(AppPermission)],
  [UserRole.MANAGER]: [AppPermission.VIEW_ALL_SALES, AppPermission.APPROVE_SALES, AppPermission.VIEW_DASHBOARD],
  [UserRole.SELLER]: [AppPermission.VIEW_OWN_SALES, AppPermission.CREATE_SALES, AppPermission.VIEW_DASHBOARD],
};

interface AppContextType {
  notify: (message: string, type?: Notification['type']) => void;
  permissions: RolePermissionsMap;
  updateRolePermissions: (role: UserRole, newPerms: AppPermission[]) => void;
  hasPermission: (permission: AppPermission) => boolean;
  users: User[];
  registerUser: (userData: Omit<User, 'id' | 'createdAt' | 'confirmed'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissions, setPermissions] = useState<RolePermissionsMap>(DEFAULT_PERMISSIONS);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Carrega Auth do localStorage apenas para a sessão
        const savedAuth = localStorage.getItem('nexus_auth');
        if (savedAuth) setAuth(JSON.parse(savedAuth));

        // Busca Permissões do Supabase (tabela crm_config ou similar)
        const { data: permsData, error: permsError } = await supabase
          .from('permissions')
          .select('*');
        
        if (permsData && permsData.length > 0) {
          const mappedPerms = permsData.reduce((acc, curr) => {
            acc[curr.role as UserRole] = curr.permissions;
            return acc;
          }, {} as RolePermissionsMap);
          setPermissions(mappedPerms);
        } else {
          // Se não houver, usa default
          setPermissions(DEFAULT_PERMISSIONS);
        }

        await refreshUsers();
      } catch (error) {
        console.error("Erro ao inicializar app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const refreshUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setUsers(data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        confirmed: u.confirmed,
        createdAt: u.created_at
      })));
    }
  };

  const notify = (message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);
  };

  const updateRolePermissions = async (role: UserRole, newPerms: AppPermission[]) => {
    const updated = { ...permissions, [role]: newPerms };
    setPermissions(updated);
    
    // Persiste no Supabase
    const { error } = await supabase
      .from('permissions')
      .upsert({ role, permissions: newPerms }, { onConflict: 'role' });

    if (error) {
      notify("Erro ao salvar permissões no banco.", "warning");
    } else {
      notify(`Permissões do perfil ${role} atualizadas com sucesso!`, 'success');
    }
  };

  const hasPermission = (permission: AppPermission) => {
    if (!auth.user) return false;
    return (permissions[auth.user.role] || []).includes(permission);
  };

  const registerUser = async (userData: Omit<User, 'id' | 'createdAt' | 'confirmed'>) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        name: userData.name,
        email: userData.email,
        role: userData.role,
        confirmed: false
      }])
      .select();

    if (error) {
      notify("Erro ao realizar cadastro: " + error.message, "warning");
      throw error;
    } else {
      await refreshUsers();
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      notify("Erro ao atualizar usuário.", "warning");
    } else {
      await refreshUsers();
    }
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      notify("Erro ao remover usuário.", "warning");
    } else {
      await refreshUsers();
      notify("Usuário removido com sucesso.");
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const login = (user: User) => {
    if (!user.confirmed) {
      notify("Sua conta ainda não foi aprovada por um administrador.", "warning");
      return;
    }
    const newState = { user, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('nexus_auth', JSON.stringify(newState));
    notify(`Bem-vindo, ${user.name}!`, 'success');
  };

  const logout = () => {
    setAuth({ user: null, isAuthenticated: false });
    localStorage.removeItem('nexus_auth');
    notify("Sessão encerrada.");
  };

  const PermissionRoute = ({ children, requiredPermission }: { children?: React.ReactNode, requiredPermission: AppPermission }) => {
    if (!auth.isAuthenticated) return <Navigate to="/login" />;
    if (!hasPermission(requiredPermission)) {
      notify("Acesso negado: você não tem permissão para esta área.", "warning");
      return <Navigate to="/" />;
    }
    return <>{children}</>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold animate-pulse">Conectando ao Nexus Core...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      notify, 
      permissions, 
      updateRolePermissions, 
      hasPermission, 
      users, 
      registerUser, 
      updateUser, 
      deleteUser,
      refreshUsers
    }}>
      <HashRouter>
        <div className="flex min-h-screen">
          {auth.isAuthenticated && <Sidebar user={auth.user} logout={logout} />}
          <div className="flex-1 flex flex-col min-w-0">
            {auth.isAuthenticated && <Navbar user={auth.user} />}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
              <Routes>
                <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/" /> : <Login onLogin={login} />} />
                <Route path="/register" element={<Register />} />
                
                <Route path="/dashboard" element={
                  <PermissionRoute requiredPermission={AppPermission.VIEW_DASHBOARD}>
                    <BusinessIntelligence user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/admin" element={
                  <PermissionRoute requiredPermission={AppPermission.ACCESS_ADMIN_PANEL}>
                    <AdminDashboard />
                  </PermissionRoute>
                } />
                
                <Route path="/manager" element={
                  <PermissionRoute requiredPermission={AppPermission.VIEW_ALL_SALES}>
                    <ManagerDashboard />
                  </PermissionRoute>
                } />
                
                <Route path="/seller" element={
                  <PermissionRoute requiredPermission={AppPermission.VIEW_OWN_SALES}>
                    <SellerDashboard user={auth.user!} />
                  </PermissionRoute>
                } />

                <Route path="/" element={
                  auth.isAuthenticated ? (
                    <Navigate to="/dashboard" />
                  ) : <Navigate to="/login" />
                } />
              </Routes>
            </main>
          </div>
        </div>
        <NotificationToast notifications={notifications} removeNotification={removeNotification} />
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;