import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ruler,
  ArrowUpDown,
  ArrowLeftRight,
  Square,
  FileDown,
  Printer,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Sliders
} from 'lucide-react';

import { MetalonInput, CalculationResult } from './types';
import { ReportViewer } from './components/ReportViewer';
import { generatePDFFromElement } from './utils/pdfGenerator';

export default function App() {
  // Input states
  const [altura, setAltura] = useState<string>('');
  const [largura, setLargura] = useState<string>('');
  const [perfil, setPerfil] = useState<string>('');
  const [vaoMaximo, setVaoMaximo] = useState<string>('80');

  // Status & loading states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState<boolean>(false);

  // Result state
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const handleGeneratePDF = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setErrorMsg(null);
    setPdfDownloaded(false);

    // Validation
    const numAltura = parseFloat(altura.replace(',', '.'));
    const numLargura = parseFloat(largura.replace(',', '.'));
    const numVaoMax = parseFloat(vaoMaximo.replace(',', '.'));

    if (isNaN(numAltura) || numAltura <= 0) {
      setErrorMsg('Por favor, informe uma altura válida em metros (número maior que zero).');
      return;
    }

    if (isNaN(numLargura) || numLargura <= 0) {
      setErrorMsg('Por favor, informe uma largura válida em metros (número maior que zero).');
      return;
    }

    if (!perfil.trim()) {
      setErrorMsg('Por favor, informe o perfil de metalon (ex: 30 x 30 mm).');
      return;
    }

    if (isNaN(numVaoMax) || numVaoMax <= 0) {
      setErrorMsg('Por favor, informe um vão máximo válido em centímetros (ex: 80).');
      return;
    }

    const inputData: MetalonInput = {
      altura: numAltura,
      largura: numLargura,
      perfil: perfil.trim(),
      vaoMaximo: numVaoMax,
    };

    try {
      setIsProcessing(true);
      setStatusMessage('Processando...');

      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || 'Erro na resposta do servidor.');
      }

      const data = await response.json();

      const newResult: CalculationResult = {
        id: Date.now().toString(),
        input: inputData,
        markdown: data.markdown,
        createdAt: new Date().toISOString(),
        dateStr: data.date,
        source: data.source,
      };

      setCurrentResult(newResult);

      setIsProcessing(false);
      setIsGeneratingPDF(true);
      setStatusMessage('Gerando relatório...');

      // Allow DOM to render reportRef
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (reportRef.current) {
        const fileName = `Relatorio_Metalon_${numLargura.toFixed(2)}x${numAltura.toFixed(2)}m.pdf`;
        await generatePDFFromElement(reportRef.current, fileName);
        setPdfDownloaded(true);
        setTimeout(() => setPdfDownloaded(false), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Falha ao processar o cálculo. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setIsGeneratingPDF(false);
      setStatusMessage('');
    }
  };

  const handleManualPDFDownload = async () => {
    if (!reportRef.current || !currentResult) return;
    setIsGeneratingPDF(true);
    const fileName = `Relatorio_Metalon_${currentResult.input.largura.toFixed(2)}x${currentResult.input.altura.toFixed(2)}m.pdf`;
    const success = await generatePDFFromElement(reportRef.current, fileName);
    setIsGeneratingPDF(false);
    if (success) {
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/80 text-slate-900 pb-16">
      {/* Top Navbar Header */}
      <header className="no-print bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
          {/* Esquerda: Nome da Empresa */}
          <div className="flex items-center justify-center sm:justify-start">
            <span className="text-2xl font-extrabold text-white font-poppins tracking-tight">
              SKYMÍDIA
            </span>
          </div>

          {/* Centro: Nome da ferramenta */}
          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Calculadora de Metalon
            </h1>
          </div>

          {/* Direita: Espaço reservado para balancear a grid de 3 colunas */}
          <div className="hidden sm:block"></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`max-w-6xl w-full mx-auto px-4 py-8 flex-1 flex flex-col ${!currentResult ? 'justify-center' : ''}`}>
        {/* Input Form Card */}
        <section className="no-print bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 mb-8 md:w-2/3 mx-auto w-full">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#707579]" />
                Dados da Estrutura
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Preencha as dimensões e o perfil para calcular a quantidade de barras de 6 metros.
              </p>
            </div>
          </div>

          <form onSubmit={handleGeneratePDF} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Largura */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-[#707579]" />
                  Largura (metros)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder=""
                    value={largura}
                    onChange={(e) => setLargura(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded">
                    m
                  </span>
                </div>
              </div>

              {/* Altura */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="w-4 h-4 text-[#707579]" />
                  Altura (metros)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder=""
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded">
                    m
                  </span>
                </div>
              </div>

              {/* Perfil Metalon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Square className="w-4 h-4 text-[#707579]" />
                  Perfil Metalon
                </label>
                <input
                  type="text"
                  placeholder="Ex: 30 x 30 mm"
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                  required
                />
              </div>

              {/* Vão Máximo (cm) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#707579]" />
                  Vão Máximo (centímetros)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 80"
                    value={vaoMaximo}
                    onChange={(e) => setVaoMaximo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded">
                    cm
                  </span>
                </div>
              </div>
            </div>


            {/* Error Message if any */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Main Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing || isGeneratingPDF}
                className="w-full bg-slate-900 hover:bg-[#707579] disabled:bg-slate-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-slate-500/20 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {isProcessing || isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                    <span>{statusMessage || 'Processando...'}</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-5 h-5 text-slate-300" />
                    <span>Gerar PDF</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Toast / Modal when PDF is auto-downloaded */}
        <AnimatePresence>
          {pdfDownloaded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
            >
              <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-2xl max-w-md w-full flex items-center justify-between gap-4 border border-emerald-500/30">
                <div className="flex items-center gap-3.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-200 shrink-0" />
                  <div>
                    <h4 className="font-bold text-base">PDF Gerado com Sucesso!</h4>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      O download do relatório em PDF foi iniciado no seu navegador.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPdfDownloaded(false)}
                  className="text-xs font-semibold bg-emerald-700/90 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results / PDF Report Display Section */}
        {currentResult && (
          <section className="space-y-4">
            {/* Document Report Viewer */}
            <ReportViewer
              markdown={currentResult.markdown}
              input={currentResult.input}
              dateStr={currentResult.dateStr}
              source={currentResult.source}
              reportRef={reportRef}
            />
          </section>
        )}
      </main>
    </div>
  );
}
