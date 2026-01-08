
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types.ts';
import { useApp } from '../App.tsx';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { users, notify } = useApp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      // Busca usuário no "banco" local
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (foundUser) {
        if (!foundUser.confirmed) {
          notify("Acesso negado: Sua conta aguarda aprovação de um administrador.", "warning");
          setLoading(false);
          return;
        }
        onLogin(foundUser);
      } else {
        notify("Usuário não encontrado ou senha incorreta.", "warning");
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <i className="fas fa-rocket text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Bem-vindo ao Nexus</h1>
          <p className="text-slate-500 mt-2">Entre com suas credenciais para acessar o CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="vendedor@nexus.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-700">Senha</label>
              <a href="#" className="text-xs text-indigo-600 font-medium hover:underline">Esqueceu a senha?</a>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
            Acessar Sistema
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-sm">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-indigo-600 font-bold hover:underline">Cadastre-se</Link>
          </p>
        </div>

        <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-800 font-semibold mb-1 uppercase tracking-wider">Acesso de Teste:</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• <span className="font-bold">admin@nexus.com</span> (Aprovado)</li>
            <li>• <span className="font-bold">gerente@nexus.com</span> (Aprovado)</li>
            <li>• <span className="font-bold">vendedor@nexus.com</span> (Aprovado)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
