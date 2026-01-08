
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App.tsx';
import { UserRole } from '../types.ts';

const Register: React.FC = () => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const { registerUser } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.SELLER,
    consent: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      alert("Você deve aceitar os termos da LGPD.");
      return;
    }
    
    registerUser({
      name: formData.name,
      email: formData.email,
      role: formData.role
    });

    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-clock text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Solicitação Enviada</h2>
          <p className="text-slate-600 mb-8">
            Seu cadastro foi realizado com sucesso. Por segurança, sua conta precisa ser <strong>aprovada por um administrador</strong> antes do primeiro acesso.
          </p>
          <Link to="/login" className="inline-block bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors">
            Voltar para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Crie sua conta</h1>
          <p className="text-slate-500 mt-2">Junte-se à nossa plataforma de vendas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail Corporativo</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Perfil Solicitado</label>
            <select 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
            >
              <option value={UserRole.SELLER}>Vendedor</option>
              <option value={UserRole.MANAGER}>Gerente</option>
              <option value={UserRole.ADMIN}>Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="lgpd"
              className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              checked={formData.consent}
              onChange={(e) => setFormData({...formData, consent: e.target.checked})}
            />
            <label htmlFor="lgpd" className="text-xs text-slate-600 leading-relaxed">
              Consinto com o processamento dos meus dados pessoais conforme a <span className="font-bold">LGPD</span> para fins de gestão de acesso e operacionalização comercial no sistema.
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
          >
            Cadastrar e Confirmar
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            Já tem conta? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
