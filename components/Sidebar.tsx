import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, AppPermission } from '../types.ts';
import { useApp } from '../App.tsx';

interface SidebarProps {
  user: User | null;
  logout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ logout }) => {
  const location = useLocation();
  const { hasPermission } = useApp();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard BI', icon: 'fa-chart-pie', permission: AppPermission.VIEW_DASHBOARD },
    { path: '/admin', label: 'Admin Panel', icon: 'fa-user-shield', permission: AppPermission.ACCESS_ADMIN_PANEL },
    { path: '/manager', label: 'Vendas (Geral)', icon: 'fa-list-check', permission: AppPermission.VIEW_ALL_SALES },
    { path: '/seller', label: 'Minhas Vendas', icon: 'fa-hand-holding-dollar', permission: AppPermission.VIEW_OWN_SALES },
  ];

  const filteredItems = menuItems.filter(item => hasPermission(item.permission));

  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
          <i className="fas fa-rocket text-xl"></i>
        </div>
        <span className="text-xl font-bold tracking-tight">NexusCRM</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {filteredItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-5`}></i>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;