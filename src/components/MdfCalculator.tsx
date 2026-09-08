import React, { useState, useMemo } from 'react';
import {
  Layers,
  Scissors,
  Box,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Printer,
  Sparkles,
  Sliders,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Ruler,
  HelpCircle,
} from 'lucide-react';
import {
  MdfMode,
  MdfFitaBorda,
  MdfSheetConfig,
  MdfPieceItem,
  MdfPanelCoveringInput,
  MdfPanelCoveringResult,
} from '../types/mdf';
import {
  MDF_SHEET_PRESETS,
  DEFAULT_SHEET_CONFIG,
  calculatePanelCovering,
  optimizeCuttingPlan,
} from '../utils/mdfOptimizer';

interface MdfCalculatorProps {
  onBackToPainel: () => void;
}

const INITIAL_PIECES: MdfPieceItem[] = [];

export function MdfCalculator({ onBackToPainel }: MdfCalculatorProps) {
  // Navigation Mode
  const [activeMode, setActiveMode] = useState<MdfMode>('revestimento');

  // Commercial Sheet Configuration
  const [sheetOption, setSheetOption] = useState<string>('');
  const [sheetConfig, setSheetConfig] = useState<MdfSheetConfig>({
    larguraMm: 0,
    alturaMm: 0,
    espessuraMm: 0,
    refiloMm: 10,
    kerfMm: 3,
  });
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);

  // Mode 1: Revestimento de Painel
  const [larguraPainelM, setLarguraPainelM] = useState<string>('');
  const [alturaPainelM, setAlturaPainelM] = useState<string>('');
  const [orientacaoChapa, setOrientacaoChapa] = useState<'horizontal' | 'vertical'>('horizontal');
  const [juntaDilatacaoMm, setJuntaDilatacaoMm] = useState<number>(3);

  // Mode 2: Lista de Peças
  const [piecesList, setPiecesList] = useState<MdfPieceItem[]>(INITIAL_PIECES);
  const [selectedSheetViewIndex, setSelectedSheetViewIndex] = useState<number>(0);

  // Handle Sheet Option Change
  const handleSheetOptionChange = (option: string) => {
    setSheetOption(option);
    if (option === '2750-1850-15') {
      setSheetConfig((prev) => ({
        ...prev,
        larguraMm: 2750,
        alturaMm: 1850,
        espessuraMm: 15,
      }));
    } else if (option === '2750-1850-6') {
      setSheetConfig((prev) => ({
        ...prev,
        larguraMm: 2750,
        alturaMm: 1850,
        espessuraMm: 6,
      }));
    } else if (option === 'personalizado') {
      setSheetConfig((prev) => ({
        ...prev,
        larguraMm: prev.larguraMm || 0,
        alturaMm: prev.alturaMm || 0,
        espessuraMm: prev.espessuraMm || 0,
      }));
    } else {
      setSheetConfig((prev) => ({
        ...prev,
        larguraMm: 0,
        alturaMm: 0,
        espessuraMm: 0,
      }));
    }
  };

  // Parsed dimensions
  const numLargura = parseFloat(larguraPainelM.replace(',', '.'));
  const numAltura = parseFloat(alturaPainelM.replace(',', '.'));
  const hasValidCoveringInputs = Boolean(
    sheetOption &&
    !isNaN(numLargura) && numLargura > 0 &&
    !isNaN(numAltura) && numAltura > 0 &&
    sheetConfig.larguraMm > 0 &&
    sheetConfig.alturaMm > 0
  );

  // Calculations
  const panelResult: MdfPanelCoveringResult = useMemo(() => {
    if (!hasValidCoveringInputs) {
      return {
        areaTotalPainelM2: 0,
        areaChapaBrutaM2: 0,
        areaChapaUtilM2: 0,
        chapasInteirasCount: 0,
        recortesCount: 0,
        totalChapasComprar: 0,
        aproveitamentoPercent: 0,
        areaSobraM2: 0,
        fitaPerimetroM: 0,
        fitaJuntasM: 0,
        piecesGrid: [],
        colunasCount: 0,
        linhasCount: 0,
        dimensoesColunasMm: [],
        dimensoesLinhasMm: [],
      };
    }
    const input: MdfPanelCoveringInput = {
      larguraPainelM: numLargura,
      alturaPainelM: numAltura,
      orientacaoChapa,
      juntaDilatacaoMm: Math.max(0, Number(juntaDilatacaoMm) || 0),
      alinhamento: 'inicio',
      sheetConfig,
    };
    return calculatePanelCovering(input);
  }, [hasValidCoveringInputs, numLargura, numAltura, orientacaoChapa, juntaDilatacaoMm, sheetConfig]);

  const cuttingPlanResult = useMemo(() => {
    const effectiveSheetConfig: MdfSheetConfig =
      sheetConfig.larguraMm > 0 && sheetConfig.alturaMm > 0
        ? sheetConfig
        : {
            larguraMm: 2750,
            alturaMm: 1850,
            espessuraMm: 15,
            refiloMm: 10,
            kerfMm: 3,
          };
    return optimizeCuttingPlan(piecesList, effectiveSheetConfig);
  }, [piecesList, sheetConfig]);

  // Piece Management Handlers
  const handleAddPiece = () => {
    const newId = `p-${Date.now()}`;
    setPiecesList((prev) => [
      ...prev,
      {
        id: newId,
        descricao: '',
        comprimentoMm: 0,
        larguraMm: 0,
        quantidade: 1,
        fitaBorda: 'nenhuma',
        respeitarVeio: false,
      },
    ]);
  };

  const handleUpdatePiece = (id: string, field: keyof MdfPieceItem, val: any) => {
    setPiecesList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleDuplicatePiece = (id: string) => {
    const target = piecesList.find((p) => p.id === id);
    if (target) {
      const copy: MdfPieceItem = {
        ...target,
        id: `p-${Date.now()}`,
        descricao: `${target.descricao} (Cópia)`,
      };
      setPiecesList((prev) => [...prev, copy]);
    }
  };

  const handleRemovePiece = (id: string) => {
    setPiecesList((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Mode Selector Tabs */}
      <div className="no-print flex p-1.5 bg-slate-200/70 rounded-2xl max-w-2xl mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveMode('revestimento')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMode === 'revestimento'
              ? 'bg-white text-slate-900 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>1. Revestimento de Painel / Fachada</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('pecas')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMode === 'pecas'
              ? 'bg-white text-slate-900 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scissors className="w-4 h-4 text-emerald-600" />
          <span>2. Otimizador de Corte (Peças)</span>
        </button>
      </div>

      {/* Commercial Sheet Configuration Bar */}
      <div className="no-print bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Padrão da Chapa Comercial de MDF
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvancedConfig ? 'Ocultar Ajustes da Serra' : 'Ajustar Refilo & Serra (Kerf)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              title="Imprimir Plano de Corte"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Padrão da Chapa de MDF
            </label>
            <select
              value={sheetOption}
              onChange={(e) => handleSheetOptionChange(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecione o padrão da chapa...</option>
              <option value="2750-1850-15">2750 × 1850 mm — 15 mm</option>
              <option value="2750-1850-6">2750 × 1850 mm — 6 mm</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          <div>
            <div className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-2 px-3">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Área Bruta / Chapa</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {sheetConfig.larguraMm > 0 && sheetConfig.alturaMm > 0
                  ? `${((sheetConfig.larguraMm * sheetConfig.alturaMm) / 1_000_000).toFixed(2)} m²`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 campos quando "Personalizado" estiver selecionado */}
        {sheetOption === 'personalizado' && (
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Largura da Chapa (mm)
              </label>
              <input
                type="number"
                min="100"
                placeholder="Ex: 2750"
                value={sheetConfig.larguraMm || ''}
                onChange={(e) =>
                  setSheetConfig((prev) => ({ ...prev, larguraMm: Number(e.target.value) || 0 }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Altura da Chapa (mm)
              </label>
              <input
                type="number"
                min="100"
                placeholder="Ex: 1850"
                value={sheetConfig.alturaMm || ''}
                onChange={(e) =>
                  setSheetConfig((prev) => ({ ...prev, alturaMm: Number(e.target.value) || 0 }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Espessura do MDF (mm)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                placeholder="Ex: 15"
                value={sheetConfig.espessuraMm || ''}
                onChange={(e) =>
                  setSheetConfig((prev) => ({ ...prev, espessuraMm: Number(e.target.value) || 0 }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Advanced Blade Kerf & Clean Refilo Settings */}
        {showAdvancedConfig && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Refilo Limpeza Borda (mm)
              </label>
              <input
                type="number"
                value={sheetConfig.refiloMm}
                onChange={(e) =>
                  setSheetConfig((prev) => ({ ...prev, refiloMm: Number(e.target.value) }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[9px] text-slate-400">Normalmente 10 a 15 mm</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Espessura Disco Serra (Kerf mm)
              </label>
              <input
                type="number"
                value={sheetConfig.kerfMm}
                onChange={(e) =>
                  setSheetConfig((prev) => ({ ...prev, kerfMm: Number(e.target.value) }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[9px] text-slate-400">Normalmente 3 ou 4 mm</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: REVESTIMENTO DE PAINEL / FACHADA                                  */}
      {/* ========================================================================= */}
      {activeMode === 'revestimento' && (
        <div className="space-y-6">
          {/* Input Controls Card */}
          <div className="no-print bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-emerald-600" />
              <span>Dimensões da Parede / Painel a Revestir</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Largura do Painel (m)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    placeholder="0,00"
                    value={larguraPainelM}
                    onChange={(e) => setLarguraPainelM(e.target.value)}
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">m</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {!isNaN(numLargura) && numLargura > 0 ? `${Math.round(numLargura * 1000)} mm` : '—'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Altura do Painel (m)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    placeholder="0,00"
                    value={alturaPainelM}
                    onChange={(e) => setAlturaPainelM(e.target.value)}
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">m</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {!isNaN(numAltura) && numAltura > 0 ? `${Math.round(numAltura * 1000)} mm` : '—'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Orientação das Chapas
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrientacaoChapa('horizontal')}
                    className={`text-xs font-bold py-1.5 px-2 rounded-lg transition cursor-pointer ${
                      orientacaoChapa === 'horizontal'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientacaoChapa('vertical')}
                    className={`text-xs font-bold py-1.5 px-2 rounded-lg transition cursor-pointer ${
                      orientacaoChapa === 'vertical'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Vertical
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {orientacaoChapa === 'horizontal' ? 'Chapas deitadas (maior largura)' : 'Chapas em pé (maior altura)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Junta de Dilatação (Friso)
                </label>
                <select
                  value={juntaDilatacaoMm}
                  onChange={(e) => setJuntaDilatacaoMm(Number(e.target.value))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={0}>0 mm (Topo a Topo / Sem Junta)</option>
                  <option value={2}>2 mm (Fino)</option>
                  <option value={3}>3 mm (Padrão Marceneiro)</option>
                  <option value={5}>5 mm (Friso Marcado)</option>
                  <option value={8}>8 mm (Junta Expressiva)</option>
                  <option value={10}>10 mm (1 cm)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Espaçamento entre placas
                </span>
              </div>
            </div>
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total a Comprar</span>
              <span className="text-2xl font-black text-emerald-600">
                {hasValidCoveringInputs ? panelResult.totalChapasComprar : '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">Chapas de MDF</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Chapas Inteiras</span>
              <span className="text-2xl font-black text-slate-900">
                {hasValidCoveringInputs ? panelResult.chapasInteirasCount : '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">Sem Recorte</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Recortes Fechamento</span>
              <span className="text-2xl font-black text-amber-600">
                {hasValidCoveringInputs ? panelResult.recortesCount : '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">Peças Cortadas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Aproveitamento</span>
              <span className="text-2xl font-black text-blue-600">
                {hasValidCoveringInputs ? `${panelResult.aproveitamentoPercent.toFixed(1)}%` : '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">
                {hasValidCoveringInputs ? `Sobra ${panelResult.areaSobraM2.toFixed(1)} m²` : '—'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Área do Painel</span>
              <span className="text-2xl font-black text-slate-900">
                {hasValidCoveringInputs ? panelResult.areaTotalPainelM2.toFixed(2) : '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">m² cobertos</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Fita de Borda</span>
              <span className="text-2xl font-black text-purple-600">
                {hasValidCoveringInputs ? Math.ceil(panelResult.fitaPerimetroM) : '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">Metros (Perímetro)</span>
            </div>
          </div>

          {/* SVG Paginação de Fachada */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Planta de Paginação e Modulação da Fachada</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualização da disposição das chapas inteiras e dos recortes de fechamento com cotas em milímetros.
                </p>
              </div>

              {hasValidCoveringInputs && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
                    <span className="text-slate-700 font-medium">Chapas Inteiras</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                    <span className="text-slate-700 font-medium">Recortes de Ajuste</span>
                  </span>
                </div>
              )}
            </div>

            {/* Interactive SVG Canvas or Empty State */}
            {!hasValidCoveringInputs ? (
              <div className="w-full py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <Ruler className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Aguardando definição das medidas</h4>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  {!sheetOption
                    ? 'Selecione o padrão da chapa de MDF e preencha a largura e altura do painel para calcular a modulação.'
                    : 'Preencha a largura e altura do painel acima para calcular o número de chapas e visualizar a paginação.'}
                </p>
              </div>
            ) : (
              <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 overflow-x-auto flex justify-center">
                {(() => {
                  const svgW = 950;
                  const ratio = numLargura / Math.max(0.1, numAltura);
                  let svgH = 500;
                  if (ratio > 2.5) svgH = 420;
                  else if (ratio < 1.0) svgH = 620;

                  const padL = 50;
                  const padR = 80;
                  const padT = 60;
                  const padB = 60;

                  const availW = svgW - padL - padR;
                  const availH = svgH - padT - padB;

                  let drawW = availW;
                  let drawH = drawW / ratio;
                  if (drawH > availH) {
                    drawH = availH;
                    drawW = drawH * ratio;
                  }

                  const startX = padL + (availW - drawW) / 2;
                  const startY = padT + (availH - drawH) / 2;

                  const totalMmW = Math.round(numLargura * 1000);
                  const totalMmH = Math.round(numAltura * 1000);

                  return (
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-auto max-w-[950px] select-none"
                      style={{ minHeight: '380px' }}
                    >
                      <defs>
                        <pattern id="mdf-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                        </pattern>
                      </defs>

                      {/* Background */}
                      <rect width={svgW} height={svgH} fill="url(#mdf-grid)" rx="8" />

                      {/* Outer Frame */}
                      <rect
                        x={startX}
                        y={startY}
                        width={drawW}
                        height={drawH}
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />

                      {/* Pieces Grid */}
                      {panelResult.piecesGrid.map((p) => {
                        const px = startX + (p.xMm / totalMmW) * drawW;
                        const py = startY + (p.yMm / totalMmH) * drawH;
                        const pw = (p.larguraMm / totalMmW) * drawW;
                        const ph = (p.alturaMm / totalMmH) * drawH;

                        return (
                          <g key={p.id}>
                            <rect
                              x={px + 0.5}
                              y={py + 0.5}
                              width={Math.max(1, pw - 1)}
                              height={Math.max(1, ph - 1)}
                              fill={p.isFullSheet ? '#ecfdf5' : '#fffbeb'}
                              stroke={p.isFullSheet ? '#059669' : '#d97706'}
                              strokeWidth="1.5"
                            />

                            {/* Dimensions and Label Badge */}
                            {pw > 50 && ph > 35 && (
                              <g>
                                <rect
                                  x={px + pw / 2 - 40}
                                  y={py + ph / 2 - 13}
                                  width="80"
                                  height="26"
                                  rx="4"
                                  fill="#ffffff"
                                  stroke={p.isFullSheet ? '#059669' : '#d97706'}
                                  strokeWidth="1"
                                />
                                <text
                                  x={px + pw / 2}
                                  y={py + ph / 2 - 2}
                                  fill="#0f172a"
                                  fontSize="8.5"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {p.isFullSheet ? 'CHAPA INTEIRA' : 'RECORTE'}
                                </text>
                                <text
                                  x={px + pw / 2}
                                  y={py + ph / 2 + 9}
                                  fill="#475569"
                                  fontSize="8"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  {p.larguraMm} × {p.alturaMm}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Top Total Width Dimension */}
                      <g id="top-dim">
                        <line x1={startX} y1={startY - 22} x2={startX + drawW} y2={startY - 22} stroke="#0f172a" strokeWidth="1.5" />
                        <line x1={startX} y1={startY - 28} x2={startX} y2={startY - 16} stroke="#0f172a" strokeWidth="1.5" />
                        <line x1={startX + drawW} y1={startY - 28} x2={startX + drawW} y2={startY - 16} stroke="#0f172a" strokeWidth="1.5" />
                        <rect
                          x={startX + drawW / 2 - 110}
                          y={startY - 31}
                          width="220"
                          height="18"
                          rx="3"
                          fill="#ffffff"
                          stroke="#0f172a"
                          strokeWidth="1.2"
                        />
                        <text
                          x={startX + drawW / 2}
                          y={startY - 18}
                          fill="#0f172a"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          LARGURA: {numLargura.toFixed(2)} m ({totalMmW} mm)
                        </text>
                      </g>

                      {/* Right Total Height Dimension */}
                      <g id="right-dim">
                        <line x1={startX + drawW + 22} y1={startY} x2={startX + drawW + 22} y2={startY + drawH} stroke="#0f172a" strokeWidth="1.5" />
                        <line x1={startX + drawW + 16} y1={startY} x2={startX + drawW + 28} y2={startY} stroke="#0f172a" strokeWidth="1.5" />
                        <line x1={startX + drawW + 16} y1={startY + drawH} x2={startX + drawW + 28} y2={startY + drawH} stroke="#0f172a" strokeWidth="1.5" />
                        <g transform={`rotate(90, ${startX + drawW + 36}, ${startY + drawH / 2})`}>
                          <rect
                            x={startX + drawW + 36 - 110}
                            y={startY + drawH / 2 - 9}
                            width="220"
                            height="18"
                            rx="3"
                            fill="#ffffff"
                            stroke="#0f172a"
                            strokeWidth="1.2"
                          />
                          <text
                            x={startX + drawW + 36}
                            y={startY + drawH / 2 + 4}
                            fill="#0f172a"
                            fontSize="9.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            ALTURA: {numAltura.toFixed(2)} m ({totalMmH} mm)
                          </text>
                        </g>
                      </g>

                      {/* Column partial indicators at bottom */}
                      {panelResult.dimensoesColunasMm.map((colW, cIdx) => {
                        let accMm = 0;
                        for (let i = 0; i < cIdx; i++) accMm += panelResult.dimensoesColunasMm[i] + juntaDilatacaoMm;
                        const cx = startX + (accMm / totalMmW) * drawW;
                        const cw = (colW / totalMmW) * drawW;

                        return (
                          <g key={`col-dim-${cIdx}`}>
                            <line x1={cx + 2} y1={startY + drawH + 14} x2={cx + cw - 2} y2={startY + drawH + 14} stroke="#64748b" strokeWidth="1" />
                            <text
                              x={cx + cw / 2}
                              y={startY + drawH + 26}
                              fill="#334155"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {colW} mm
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            )}

            {/* Technical Specifications Summary Footer */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="font-bold text-slate-900 block">Modulação:</span>
                <span>{panelResult.colunasCount} colunas × {panelResult.linhasCount} linhas ({panelResult.piecesGrid.length} painéis no total)</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Emendas / Juntas:</span>
                <span>{juntaDilatacaoMm === 0 ? 'Sem junta (topo a topo)' : `${juntaDilatacaoMm} mm de friso`} ({panelResult.fitaJuntasM.toFixed(1)} m linear)</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Acabamento das Bordas:</span>
                <span>{panelResult.fitaPerimetroM.toFixed(1)} m de fita para o perímetro total</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: LISTA DE PEÇAS & OTIMIZADOR DE CORTE (2D PLANO DE CORTE)          */}
      {/* ========================================================================= */}
      {activeMode === 'pecas' && (
        <div className="space-y-6">
          {/* Piece List Input Table */}
          <div className="no-print bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-emerald-600" />
                  <span>Lista de Peças Sob Medida</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cadastre as peças a serem cortadas nas chapas de MDF. O sistema calculará o encaixe perfeito com aproveitamento máximo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddPiece}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Peça</span>
                </button>
              </div>
            </div>

            {/* Pieces Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-3">Descrição da Peça</th>
                    <th className="py-2.5 px-3">Comprimento (mm)</th>
                    <th className="py-2.5 px-3">Largura (mm)</th>
                    <th className="py-2.5 px-2 text-center">Qtd</th>
                    <th className="py-2.5 px-3">Fita de Borda</th>
                    <th className="py-2.5 px-2 text-center" title="Se ativo, a peça não poderá ser girada para manter o veio da madeira alinhado">
                      Sentido Veio
                    </th>
                    <th className="py-2.5 px-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {piecesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <p className="text-sm font-medium text-slate-600">Nenhuma peça cadastrada</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Clique no botão <strong>"Adicionar Peça"</strong> acima para incluir as medidas das suas peças.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    piecesList.map((piece, idx) => (
                    <tr key={piece.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder={`Ex: Peça ${idx + 1}`}
                          value={piece.descricao}
                          onChange={(e) => handleUpdatePiece(piece.id, 'descricao', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            value={piece.comprimentoMm > 0 ? piece.comprimentoMm : ''}
                            onChange={(e) =>
                              handleUpdatePiece(
                                piece.id,
                                'comprimentoMm',
                                e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-slate-400">mm</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            value={piece.larguraMm > 0 ? piece.larguraMm : ''}
                            onChange={(e) =>
                              handleUpdatePiece(
                                piece.id,
                                'larguraMm',
                                e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-slate-400">mm</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          placeholder="1"
                          value={piece.quantidade > 0 ? piece.quantidade : ''}
                          onChange={(e) =>
                            handleUpdatePiece(
                              piece.id,
                              'quantidade',
                              e.target.value === '' ? 0 : Math.max(1, Number(e.target.value))
                            )
                          }
                          className="w-14 text-center bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 mx-auto"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={piece.fitaBorda}
                          onChange={(e) => handleUpdatePiece(piece.id, 'fitaBorda', e.target.value as MdfFitaBorda)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="nenhuma">Nenhum Lado (0L)</option>
                          <option value="1C">1 Comprimento (1C)</option>
                          <option value="2C">2 Comprimentos (2C)</option>
                          <option value="1L">1 Largura (1L)</option>
                          <option value="2L">2 Larguras (2L)</option>
                          <option value="4L">Todos os 4 Lados (4L)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdatePiece(piece.id, 'respeitarVeio', !piece.respeitarVeio)}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                            piece.respeitarVeio
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={piece.respeitarVeio ? 'Sentido do veio travado (não rotaciona)' : 'Rotação livre para melhor encaixe'}
                        >
                          {piece.respeitarVeio ? 'Fixo' : 'Livre'}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicatePiece(piece.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="Duplicar Peça"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePiece(piece.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Excluir Peça"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI Dashboard Cards for Cutting Plan */}
          {(() => {
            const hasValidPieces = piecesList.some((p) => p.comprimentoMm > 0 && p.larguraMm > 0 && p.quantidade > 0);
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Total de Chapas</span>
                    <span className="text-3xl font-black text-emerald-600">
                      {hasValidPieces ? cuttingPlanResult.totalChapas : '—'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      {sheetConfig.larguraMm > 0 && sheetConfig.alturaMm > 0
                        ? `${sheetConfig.larguraMm}×${sheetConfig.alturaMm} mm`
                        : 'Padrão ou Personalizado'}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Aproveitamento Médio</span>
                    <span className="text-3xl font-black text-blue-600">
                      {hasValidPieces ? `${cuttingPlanResult.aproveitamentoGeralPercent.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      {hasValidPieces ? `Perda ${cuttingPlanResult.areaPerdaTotalM2.toFixed(2)} m²` : '—'}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Peças Cortadas</span>
                    <span className="text-3xl font-black text-slate-900">
                      {hasValidPieces ? cuttingPlanResult.totalPecasCortadas : '—'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      {hasValidPieces ? `${cuttingPlanResult.areaPecasTotalM2.toFixed(2)} m² útil` : '—'}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Fita de Borda Total</span>
                    <span className="text-3xl font-black text-purple-600">
                      {hasValidPieces ? cuttingPlanResult.fitaBordaTotalMetros.toFixed(1) : '—'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      {hasValidPieces ? 'Metros lineares' : '—'}
                    </span>
                  </div>
                </div>

                {/* Empty State when no valid pieces */}
                {!hasValidPieces && (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                      <Scissors className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Plano de corte aguardando medidas</h4>
                    <p className="text-xs text-slate-500 max-w-md mt-1">
                      {piecesList.length === 0
                        ? 'Adicione as peças que deseja cortar na tabela acima para gerar o plano de corte otimizado com mapa visual e cálculo de aproveitamento.'
                        : 'Preencha o comprimento e a largura das peças na tabela acima para calcular o plano de corte otimizado.'}
                    </p>
                  </div>
                )}

                {/* Visual Cutting Plan (SVG Sheets Viewer) */}
                {hasValidPieces && cuttingPlanResult.sheets.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Mapa Visual das Chapas (Plano de Corte)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Layout exato de cada chapa para a serra/esquadrejadeira com posições, nomes de peças e retalhos.
                  </p>
                </div>

                {/* Sheet Selector Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cuttingPlanResult.sheets.map((sheet, sIdx) => (
                    <button
                      key={sheet.sheetIndex}
                      type="button"
                      onClick={() => setSelectedSheetViewIndex(sIdx)}
                      className={`text-xs font-bold py-1.5 px-3 rounded-xl transition cursor-pointer ${
                        selectedSheetViewIndex === sIdx
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Chapa {sheet.sheetIndex} ({sheet.aproveitamentoPercent.toFixed(0)}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Selected Sheet SVG Visualizer */}
              {(() => {
                const currentSheet = cuttingPlanResult.sheets[selectedSheetViewIndex] || cuttingPlanResult.sheets[0];
                if (!currentSheet) return null;

                const svgW = 950;
                const ratio = currentSheet.larguraUtilMm / currentSheet.alturaUtilMm;
                const svgH = 540;

                const pad = 40;
                const availW = svgW - pad * 2;
                const availH = svgH - pad * 2;

                let drawW = availW;
                let drawH = drawW / ratio;
                if (drawH > availH) {
                  drawH = availH;
                  drawW = drawH * ratio;
                }

                const startX = pad + (availW - drawW) / 2;
                const startY = pad + (availH - drawH) / 2;

                const sheetW = currentSheet.larguraUtilMm;
                const sheetH = currentSheet.alturaUtilMm;

                return (
                  <div className="space-y-3">
                    <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 overflow-x-auto flex justify-center">
                      <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        className="w-full h-auto max-w-[950px] select-none"
                        style={{ minHeight: '380px' }}
                      >
                        <defs>
                          <pattern id="mdf-wood-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#f8fafc" strokeWidth="0.8" />
                          </pattern>
                        </defs>

                        {/* Background */}
                        <rect width={svgW} height={svgH} fill="#fdfbf7" rx="8" />

                        {/* Sheet Outline */}
                        <rect
                          x={startX}
                          y={startY}
                          width={drawW}
                          height={drawH}
                          fill="#ffffff"
                          stroke="#1e293b"
                          strokeWidth="2.5"
                        />

                        {/* Free / Scrap Rectangles (Cinza Pontilhado) */}
                        {currentSheet.freeRects.map((fr, frIdx) => {
                          const rx = startX + (fr.xMm / sheetW) * drawW;
                          const ry = startY + (fr.yMm / sheetH) * drawH;
                          const rw = (fr.larguraMm / sheetW) * drawW;
                          const rh = (fr.alturaMm / sheetH) * drawH;

                          return (
                            <g key={`fr-${frIdx}`}>
                              <rect
                                x={rx}
                                y={ry}
                                width={rw}
                                height={rh}
                                fill="#f1f5f9"
                                stroke="#94a3b8"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                              />
                              {rw > 40 && rh > 25 && (
                                <text
                                  x={rx + rw / 2}
                                  y={ry + rh / 2 + 3}
                                  fill="#64748b"
                                  fontSize="7.5"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  Sobra {fr.larguraMm}×{fr.alturaMm}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* Placed Pieces */}
                        {currentSheet.placedPieces.map((p, pIdx) => {
                          const px = startX + (p.xMm / sheetW) * drawW;
                          const py = startY + (p.yMm / sheetH) * drawH;
                          const pw = (p.comprimentoMm / sheetW) * drawW;
                          const ph = (p.larguraMm / sheetH) * drawH;

                          // Cores suaves alternadas
                          const colors = ['#ecfdf5', '#eff6ff', '#fefce8', '#f5f3ff'];
                          const borderColors = ['#059669', '#2563eb', '#ca8a04', '#7c3aed'];
                          const color = colors[pIdx % colors.length];
                          const borderColor = borderColors[pIdx % borderColors.length];

                          return (
                            <g key={`placed-${p.pieceId}-${pIdx}`}>
                              <rect
                                x={px}
                                y={py}
                                width={pw}
                                height={ph}
                                fill={color}
                                stroke={borderColor}
                                strokeWidth="1.8"
                              />

                              {/* Fita de Borda Indicator (Linha Vermelha de Borda) */}
                              {p.fitaBorda !== 'nenhuma' && (
                                <g>
                                  {(p.fitaBorda === '1C' || p.fitaBorda === '2C' || p.fitaBorda === '4L') && (
                                    <line x1={px} y1={py + 1} x2={px + pw} y2={py + 1} stroke="#ef4444" strokeWidth="2.5" />
                                  )}
                                  {(p.fitaBorda === '2C' || p.fitaBorda === '4L') && (
                                    <line x1={px} y1={py + ph - 1} x2={px + pw} y2={py + ph - 1} stroke="#ef4444" strokeWidth="2.5" />
                                  )}
                                  {(p.fitaBorda === '1L' || p.fitaBorda === '2L' || p.fitaBorda === '4L') && (
                                    <line x1={px + 1} y1={py} x2={px + 1} y2={py + ph} stroke="#ef4444" strokeWidth="2.5" />
                                  )}
                                  {(p.fitaBorda === '2L' || p.fitaBorda === '4L') && (
                                    <line x1={px + pw - 1} y1={py} x2={px + pw - 1} y2={py + ph} stroke="#ef4444" strokeWidth="2.5" />
                                  )}
                                </g>
                              )}

                              {/* Piece Label Badge */}
                              {pw > 45 && ph > 30 && (
                                <g>
                                  <text
                                    x={px + pw / 2}
                                    y={py + ph / 2 - 2}
                                    fill="#0f172a"
                                    fontSize="8"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {p.descricao.length > 20 ? `${p.descricao.slice(0, 18)}...` : p.descricao}
                                  </text>
                                  <text
                                    x={px + pw / 2}
                                    y={py + ph / 2 + 9}
                                    fill="#334155"
                                    fontSize="7.5"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                  >
                                    {p.comprimentoMm} × {p.larguraMm} mm {p.rotated ? '↻' : ''}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}

                        {/* Top Dimensions Badge */}
                        <text
                          x={startX + drawW / 2}
                          y={startY - 12}
                          fill="#0f172a"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          CHAPA {currentSheet.sheetIndex}: {sheetW} × {sheetH} mm Útil (Aproveitamento {currentSheet.aproveitamentoPercent.toFixed(1)}%)
                        </text>
                      </svg>
                    </div>

                    {/* Sheet Legend & Cut Sequence for Workshop */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-slate-700">
                          {currentSheet.placedPieces.length} peças alocadas nesta chapa
                        </span>
                        <span className="flex items-center gap-1 text-rose-600 font-bold">
                          <span className="w-3 h-1 bg-red-500 inline-block"></span>
                          Borda com fita
                        </span>
                      </div>

                      <div className="text-slate-500">
                        Área de retalho / sobra: <strong className="text-slate-800">{currentSheet.areaSobraM2.toFixed(2)} m²</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      );
    })()}
  </div>
)}
    </div>
  );
}
