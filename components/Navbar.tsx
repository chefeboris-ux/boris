
import React from 'react';
import { User } from '../types.ts';

interface NavbarProps {
  user: User | null;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center text-slate-500">
        <span className="text-sm font-medium">Dashboard &nbsp;/&nbsp; </span>
        <span className="text-sm text-indigo-600 font-semibold ml-1">
          {user?.role.charAt(0) + user?.role.slice(1).toLowerCase()}
        </span>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <i className="fas fa-bell"></i>
        </button>
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
            <span className="text-indigo-700 font-bold">{user?.name.charAt(0)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
