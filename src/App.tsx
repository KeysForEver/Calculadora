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
  Sliders,
  Calculator,
  RefreshCw
} from 'lucide-react';

import { MetalonInput, CalculationResult, CalculatorPage } from './types';
import { ReportViewer } from './components/ReportViewer';
import { LedCalculatorPlaceholder } from './components/LedCalculatorPlaceholder';
import { MdfCalculatorPlaceholder } from './components/MdfCalculatorPlaceholder';
import { generatePDFFromElement } from './utils/pdfGenerator';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { generateReportMarkdown, getPortugueseDate, extractProfileDimensions } from './utils/calculator';

export default function App() {
  // Navigation state
  const [activePage, setActivePage] = useState<CalculatorPage>('painel');

  // Input states
  const [altura, setAltura] = useState<string>('');
  const [largura, setLargura] = useState<string>('');
  const [perfilExterno, setPerfilExterno] = useState<string>('');
  const [perfilInterno, setPerfilInterno] = useState<string>('');
  const [vaoMaxHoriz, setVaoMaxHoriz] = useState<string>('80');
  const [vaoMaxVert, setVaoMaxVert] = useState<string>('80');

  // Orientation states (when profile is rectangular)
  const [faceExternoChoice, setFaceExternoChoice] = useState<number | null>(null);
  const [faceInternoChoice, setFaceInternoChoice] = useState<number | null>(null);

  // Status & loading states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState<boolean>(false);

  // Result state
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  // Derived dimensions for profile orientation
  const extDims = extractProfileDimensions(perfilExterno);
  const intDims = extractProfileDimensions(perfilInterno || perfilExterno);

  const effectiveFaceExt = (!extDims.isSquare && extDims.isValid)
    ? (faceExternoChoice === extDims.dim1 || faceExternoChoice === extDims.dim2 ? faceExternoChoice : extDims.dim1)
    : extDims.dim1;
  const effectiveProfExt = (!extDims.isSquare && extDims.isValid)
    ? (effectiveFaceExt === extDims.dim1 ? extDims.dim2 : extDims.dim1)
    : extDims.dim2;

  const effectiveFaceInt = (!intDims.isSquare && intDims.isValid)
    ? (faceInternoChoice === intDims.dim1 || faceInternoChoice === intDims.dim2 ? faceInternoChoice : intDims.dim1)
    : intDims.dim1;
  const effectiveProfInt = (!intDims.isSquare && intDims.isValid)
    ? (effectiveFaceInt === intDims.dim1 ? intDims.dim2 : intDims.dim1)
    : intDims.dim2;

  const handleGeneratePDF = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setErrorMsg(null);
    setPdfDownloaded(false);

    // Validation
    const numAltura = parseFloat(altura.replace(',', '.'));
    const numLargura = parseFloat(largura.replace(',', '.'));
    const numVaoHoriz = parseFloat(vaoMaxHoriz.replace(',', '.'));
    const numVaoVert = parseFloat(vaoMaxVert.replace(',', '.'));

    if (isNaN(numAltura) || numAltura <= 0) {
      setErrorMsg('Por favor, informe uma altura válida em metros (número maior que zero).');
      return;
    }

    if (isNaN(numLargura) || numLargura <= 0) {
      setErrorMsg('Por favor, informe uma largura válida em metros (número maior que zero).');
      return;
    }

    if (!perfilExterno.trim()) {
      setErrorMsg('Por favor, informe o perfil de metalon externo/borda (ex: 50 x 30 mm).');
      return;
    }

    const finalPerfilInterno = perfilInterno.trim() || perfilExterno.trim();

    if (isNaN(numVaoHoriz) || numVaoHoriz <= 0) {
      setErrorMsg('Por favor, informe um vão máximo horizontal válido em centímetros (ex: 80).');
      return;
    }

    if (isNaN(numVaoVert) || numVaoVert <= 0) {
      setErrorMsg('Por favor, informe um vão máximo vertical válido em centímetros (ex: 80).');
      return;
    }

    const posicaoExtDesc = extDims.isSquare
      ? `Perfil Quadrado (${extDims.dim1} × ${extDims.dim2} mm)`
      : `Face ${effectiveFaceExt} mm (Frente) × ${effectiveProfExt} mm (Profundidade)`;

    const posicaoIntDesc = intDims.isSquare
      ? `Perfil Quadrado (${intDims.dim1} × ${intDims.dim2} mm)`
      : `Face ${effectiveFaceInt} mm (Frente) × ${effectiveProfInt} mm (Profundidade)`;

    const inputData: MetalonInput = {
      altura: numAltura,
      largura: numLargura,
      perfilExterno: perfilExterno.trim(),
      perfilInterno: finalPerfilInterno,
      perfil: perfilExterno.trim(), // retrocompatibilidade
      posicaoExterno: posicaoExtDesc,
      posicaoInterno: posicaoIntDesc,
      faceExternoMm: effectiveFaceExt,
      profundidadeExternoMm: effectiveProfExt,
      faceInternoMm: effectiveFaceInt,
      profundidadeInternoMm: effectiveProfInt,
      vaoMaxHoriz: numVaoHoriz,
      vaoMaxVert: numVaoVert,
      vaoMaximo: numVaoHoriz, // fallback retrocompatível
    };

    try {
      setIsProcessing(true);
      setStatusMessage('Calculando...');

      let markdownData = '';
      let dateString = getPortugueseDate();
      let sourceTag: 'gemini' | 'calculator' = 'gemini';

      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        let errDetails = 'Erro de processamento, contate o administrador do sistema.';
        try {
          const errData = await response.json();
          if (errData?.error) errDetails = errData.error;
        } catch (_) {}
        throw new Error(errDetails);
      }

      const data = await response.json();
      if (!data?.markdown) {
        throw new Error(data?.error || 'Erro de processamento, contate o administrador do sistema.');
      }

      markdownData = data.markdown;
      if (data.date) dateString = data.date;
      sourceTag = 'gemini';

      const newResult: CalculationResult = {
        id: Date.now().toString(),
        input: inputData,
        markdown: markdownData,
        createdAt: new Date().toISOString(),
        dateStr: dateString,
        source: sourceTag,
        modelUsed: data.modelUsed || 'gemini-3.7-flash',
        doubleCheckVerified: Boolean(data?.doubleCheckVerified),
      };

      setCurrentResult(newResult);
      setIsProcessing(false);
      setStatusMessage('');

      // Smooth scroll to the result view
      setTimeout(() => {
        const resultElement = document.getElementById('report-container');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Erro de processamento, contate o administrador do sistema.');
    } finally {
      setIsProcessing(false);
      setIsGeneratingPDF(false);
      setStatusMessage('');
    }
  };

  const handleManualPDFDownload = async () => {
    if (!reportRef.current || !currentResult) return;
    try {
      setIsGeneratingPDF(true);
      const fileName = `Relatorio_Metalon_${currentResult.input.largura.toFixed(2)}x${currentResult.input.altura.toFixed(2)}m.pdf`;
      const success = await generatePDFFromElement(reportRef.current, fileName);
      if (success) {
        setPdfDownloaded(true);
        setTimeout(() => setPdfDownloaded(false), 3000);
      }
    } catch (e) {
      console.error('Erro ao baixar PDF:', e);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleNewCalculation = () => {
    setCurrentResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="min-h-screen flex flex-col bg-slate-100/80 text-slate-900 pb-16">
      {/* Top Navbar Header */}
      <header className="no-print bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Esquerda: Nome da Empresa */}
          <div className="flex items-center">
            <span className="text-2xl font-extrabold text-white font-poppins tracking-tight">
              SKYMÍDIA
            </span>
          </div>

          {/* Centro: Abas de Navegação das Calculadoras Centralizadas sem Ícones e sem Barra de Rolagem */}
          <div className="flex items-center justify-center">
            <nav className="flex items-center gap-1 p-1 bg-slate-800/90 rounded-xl border border-slate-700/70">
              <button
                type="button"
                onClick={() => setActivePage('painel')}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  activePage === 'painel'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Painel &amp; Front Light
              </button>

              <button
                type="button"
                onClick={() => setActivePage('led')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  activePage === 'led'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>LED</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  activePage === 'led' ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  Em breve
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActivePage('mdf')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                  activePage === 'mdf'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>MDF</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  activePage === 'mdf' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  Em breve
                </span>
              </button>
            </nav>
          </div>

          {/* Direita: Elemento de compensação para manter o nav perfeitamente centralizado */}
          <div className="hidden md:block w-32"></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`max-w-6xl w-full mx-auto px-4 py-8 flex-1 flex flex-col ${(!currentResult || activePage !== 'painel') ? 'justify-center' : ''}`}>
        {/* Render LED Page Placeholder */}
        {activePage === 'led' && (
          <LedCalculatorPlaceholder onBackToPainel={() => setActivePage('painel')} />
        )}

        {/* Render MDF Page Placeholder */}
        {activePage === 'mdf' && (
          <MdfCalculatorPlaceholder onBackToPainel={() => setActivePage('painel')} />
        )}

        {/* Render Painel & Front Light Calculator */}
        {activePage === 'painel' && (
          <>
            {/* Input Form Card */}
            <section className="no-print bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 mb-8 md:w-2/3 mx-auto w-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-[#707579]" />
                    Painel &amp; Front Light — Estrutura de Metalon
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

              {/* Vão Máximo Horizontal (cm) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#707579]" />
                  Vão Máx. Horizontal (Colunas)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 80"
                    value={vaoMaxHoriz}
                    onChange={(e) => setVaoMaxHoriz(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded">
                    cm
                  </span>
                </div>
              </div>

              {/* Vão Máximo Vertical (Linhas) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#707579]" />
                  Vão Máx. Vertical (Linhas)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 80"
                    value={vaoMaxVert}
                    onChange={(e) => setVaoMaxVert(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded">
                    cm
                  </span>
                </div>
              </div>

              {/* Perfil Metalon Externo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Square className="w-4 h-4 text-[#707579]" />
                  Perfil Metalon Externo (Borda)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 50 x 30 mm"
                  value={perfilExterno}
                  onChange={(e) => setPerfilExterno(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                  required
                />
              </div>

              {/* Perfil Metalon Interno */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Square className="w-4 h-4 text-[#707579]" />
                  Perfil Metalon Interno (Travessas)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 30 x 30 mm"
                  value={perfilInterno}
                  onChange={(e) => setPerfilInterno(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition"
                />
              </div>

              {/* Posição / Orientação do Metalon Externo (quando não for quadrado) */}
              <div className="sm:col-span-2 bg-slate-100/70 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-[#707579]" />
                    Posição e Orientação dos Perfis
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 lowercase">
                    (especifique a face frontal e a profundidade)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Posição Metalon Externo */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Posição Metalon Externo (Borda):
                      </span>
                      {extDims.isValid && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {extDims.isSquare ? 'Quadrado' : `${extDims.dim1}×${extDims.dim2} mm`}
                        </span>
                      )}
                    </div>

                    {extDims.isValid && !extDims.isSquare ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] text-slate-500">
                          Qual dimensão ficará virada para a <strong>frente (face do painel)</strong>?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFaceExternoChoice(extDims.dim1)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition flex flex-col ${
                              effectiveFaceExt === extDims.dim1
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-bold">Face: {extDims.dim1} mm</span>
                            <span className={`text-[10px] ${effectiveFaceExt === extDims.dim1 ? 'text-slate-300' : 'text-slate-500'}`}>
                              Profundidade: {extDims.dim2} mm
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFaceExternoChoice(extDims.dim2)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition flex flex-col ${
                              effectiveFaceExt === extDims.dim2
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-bold">Face: {extDims.dim2} mm</span>
                            <span className={`text-[10px] ${effectiveFaceExt === extDims.dim2 ? 'text-slate-300' : 'text-slate-500'}`}>
                              Profundidade: {extDims.dim1} mm
                            </span>
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 bg-slate-50 rounded-md p-1.5 border border-slate-200/60 mt-1">
                          Desconto de encaixe vertical: <strong>-{effectiveFaceExt * 2} mm</strong> nas colunas.
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 py-1">
                        {extDims.isValid
                          ? `Perfil quadrado simétrico (${extDims.dim1} × ${extDims.dim2} mm) — a face e profundidade são idênticas.`
                          : 'Digite o perfil externo acima para definir a orientação.'}
                      </p>
                    )}
                  </div>

                  {/* Posição Metalon Interno */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Posição Metalon Interno (Travessas):
                      </span>
                      {intDims.isValid && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {intDims.isSquare ? 'Quadrado' : `${intDims.dim1}×${intDims.dim2} mm`}
                        </span>
                      )}
                    </div>

                    {intDims.isValid && !intDims.isSquare ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] text-slate-500">
                          Qual dimensão ficará virada para a <strong>frente (face do painel)</strong>?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFaceInternoChoice(intDims.dim1)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition flex flex-col ${
                              effectiveFaceInt === intDims.dim1
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-bold">Face: {intDims.dim1} mm</span>
                            <span className={`text-[10px] ${effectiveFaceInt === intDims.dim1 ? 'text-slate-300' : 'text-slate-500'}`}>
                              Profundidade: {intDims.dim2} mm
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFaceInternoChoice(intDims.dim2)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition flex flex-col ${
                              effectiveFaceInt === intDims.dim2
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-bold">Face: {intDims.dim2} mm</span>
                            <span className={`text-[10px] ${effectiveFaceInt === intDims.dim2 ? 'text-slate-300' : 'text-slate-500'}`}>
                              Profundidade: {intDims.dim1} mm
                            </span>
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 bg-slate-50 rounded-md p-1.5 border border-slate-200/60 mt-1">
                          Face visível no plano: <strong>{effectiveFaceInt} mm</strong> | Profundidade: <strong>{effectiveProfInt} mm</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 py-1">
                        {intDims.isValid
                          ? `Perfil quadrado simétrico (${intDims.dim1} × ${intDims.dim2} mm) — a face e profundidade são idênticas.`
                          : 'Digite o perfil interno acima para definir a orientação.'}
                      </p>
                    )}
                  </div>
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
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                    <span>{statusMessage || 'Calculando...'}</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5 text-slate-300" />
                    <span>Calcular</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Toast / Modal when PDF is downloaded */}
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
                      O download do relatório foi concluído com sucesso.
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
          <section id="report-container" className="space-y-6 pt-4">
            {/* Top Results Action Bar */}
            <div className="no-print bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200/80 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Relatório Técnico Concluído
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estrutura de {currentResult.input.largura.toFixed(2)}m × {currentResult.input.altura.toFixed(2)}m calculada com sucesso.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleManualPDFDownload}
                  disabled={isGeneratingPDF}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-[#707579] disabled:bg-slate-400 text-white font-bold py-2.5 px-5 rounded-xl shadow transition cursor-pointer text-sm"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                      <span>Gerando PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 text-slate-300" />
                      <span>Gerar / Baixar PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNewCalculation}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer text-sm border border-slate-200"
                  title="Novo Cálculo"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Cálculo</span>
                </button>
              </div>
            </div>

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
          </>
        )}

      </main>
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
