
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, AuthState, User, Notification, AppPermission, RolePermissionsMap } from './types.ts';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ManagerDashboard from './pages/ManagerDashboard.tsx';
import SellerDashboard from './pages/SellerDashboard.tsx';
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';
import NotificationToast from './components/NotificationToast.tsx';

const DEFAULT_PERMISSIONS: RolePermissionsMap = {
  [UserRole.ADMIN]: Object.values(AppPermission),
  [UserRole.MANAGER]: [AppPermission.VIEW_ALL_SALES, AppPermission.APPROVE_SALES],
  [UserRole.SELLER]: [AppPermission.VIEW_OWN_SALES, AppPermission.CREATE_SALES],
};

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin Principal', email: 'admin@nexus.com', role: UserRole.ADMIN, confirmed: true, createdAt: '2023-01-01' },
  { id: '2', name: 'Carlos Gerente', email: 'gerente@nexus.com', role: UserRole.MANAGER, confirmed: true, createdAt: '2023-02-15' },
  { id: '3', name: 'Ana Vendedora', email: 'vendedor@nexus.com', role: UserRole.SELLER, confirmed: true, createdAt: '2023-03-10' },
];

interface AppContextType {
  notify: (message: string, type?: Notification['type']) => void;
  permissions: RolePermissionsMap;
  updateRolePermissions: (role: UserRole, newPerms: AppPermission[]) => void;
  hasPermission: (permission: AppPermission) => boolean;
  users: User[];
  registerUser: (userData: Omit<User, 'id' | 'createdAt' | 'confirmed'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
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
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('nexus_auth');
      if (savedAuth) setAuth(JSON.parse(savedAuth));

      const savedPerms = localStorage.getItem('nexus_permissions');
      if (savedPerms) setPermissions(JSON.parse(savedPerms));

      const savedUsers = localStorage.getItem('nexus_users');
      if (savedUsers) setUsers(JSON.parse(savedUsers));
    } catch (error) {
      console.error("Erro ao carregar dados do localStorage:", error);
    }
  }, []);

  const notify = (message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);
  };

  const updateRolePermissions = (role: UserRole, newPerms: AppPermission[]) => {
    const updated = { ...permissions, [role]: newPerms };
    setPermissions(updated);
    localStorage.setItem('nexus_permissions', JSON.stringify(updated));
    notify(`Permissões do perfil ${role} atualizadas com sucesso!`, 'success');
  };

  const hasPermission = (permission: AppPermission) => {
    if (!auth.user) return false;
    return (permissions[auth.user.role] || []).includes(permission);
  };

  const registerUser = (userData: Omit<User, 'id' | 'createdAt' | 'confirmed'>) => {
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      confirmed: false // Novo usuário SEMPRE começa como não confirmado
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('nexus_users', JSON.stringify(updatedUsers));
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    setUsers(updatedUsers);
    localStorage.setItem('nexus_users', JSON.stringify(updatedUsers));
  };

  const deleteUser = (id: string) => {
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    localStorage.setItem('nexus_users', JSON.stringify(updatedUsers));
    notify("Usuário removido com sucesso.");
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

  const PermissionRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission: AppPermission }) => {
    if (!auth.isAuthenticated) return <Navigate to="/login" />;
    if (!hasPermission(requiredPermission)) {
      notify("Acesso negado: você não tem permissão para esta área.", "warning");
      return <Navigate to="/" />;
    }
    return <>{children}</>;
  };

  return (
    <AppContext.Provider value={{ 
      notify, 
      permissions, 
      updateRolePermissions, 
      hasPermission, 
      users, 
      registerUser, 
      updateUser, 
      deleteUser 
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
                    hasPermission(AppPermission.ACCESS_ADMIN_PANEL) ? <Navigate to="/admin" /> :
                    hasPermission(AppPermission.VIEW_ALL_SALES) ? <Navigate to="/manager" /> :
                    <Navigate to="/seller" />
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
