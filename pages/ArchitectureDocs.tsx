import React from 'react';

const ArchitectureDocs: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12">
      <section>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Documentação Técnica - NexusCRM</h1>
        <p className="text-slate-600 text-lg">Arquitetura de dados para o fluxo de Ficha Cadastral e Documentação Digital.</p>
      </section>

      <section id="database" className="space-y-6">
        <h2 className="text-2xl font-bold text-indigo-600 flex items-center">
          <i className="fas fa-database mr-3"></i> Tabela Vendas (Sales)
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-bold text-slate-800">Definição dos Campos (CustomerData)</h4>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2">Campo</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Obrigatoriedade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-2 font-mono">nome, cpf, email</td><td className="py-2">VARCHAR</td><td className="py-2 text-red-500 font-bold">SIM</td></tr>
                <tr><td className="py-2 font-mono">rua, numero, bairro, cidade</td><td className="py-2">VARCHAR</td><td className="py-2 text-red-500 font-bold">SIM</td></tr>
                <tr><td className="py-2 font-mono">cep, estado</td><td className="py-2">VARCHAR</td><td className="py-2 text-red-500 font-bold">SIM</td></tr>
                <tr><td className="py-2 font-mono">plano</td><td className="py-2">VARCHAR</td><td className="py-2 text-red-500 font-bold">SIM</td></tr>
                <tr><td className="py-2 font-mono">anotacoes</td><td className="py-2">TEXT</td><td className="py-2 text-slate-400">NÃO</td></tr>
                <tr><td className="py-2 font-mono">audio_url, foto_frente</td><td className="py-2">URL (S3/GCS)</td><td className="py-2 text-red-500 font-bold">SIM</td></tr>
                <tr><td className="py-2 font-mono">status_history</td><td className="py-2">JSONB</td><td className="py-2 text-red-500 font-bold">SIM</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-indigo-600 flex items-center">
          <i className="fas fa-shield-check mr-3"></i> Segurança e Auditoria
        </h2>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
          <p className="text-sm text-indigo-700 leading-relaxed">
            As <strong>Anotações</strong> do vendedor são tratadas como dados complementares para auxiliar a equipe de análise de fraude e gerência. O sistema mantém um log completo de auditoria para cada venda, garantindo que qualquer alteração de status seja rastreada até o usuário responsável.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ArchitectureDocs;