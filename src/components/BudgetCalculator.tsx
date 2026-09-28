import React, { useState, useRef } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Printer,
  FileDown,
  CheckCircle2,
  Layers,
  Sliders,
  X,
  Search,
} from 'lucide-react';
import { BUDGET_CATALOG_GROUPS } from '../data/budgetCatalog';
import { BudgetItem, BudgetUnit } from '../types/budget';
import { generatePDFFromElement } from '../utils/pdfGenerator';

interface BudgetCalculatorProps {
  onBackToPainel?: () => void;
}

export function BudgetCalculator({ onBackToPainel }: BudgetCalculatorProps) {
  // Lista de grupos do catálogo (carregados a partir do CSV em src/data/tabela_precos.csv)
  const catalogGroups = BUDGET_CATALOG_GROUPS;

  // Busca e filtro
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Estado de seleção do catálogo
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    BUDGET_CATALOG_GROUPS[0]?.id || 'grp-1'
  );
  const [selectedSubItemId, setSelectedSubItemId] = useState<string>(
    BUDGET_CATALOG_GROUPS[0]?.subItems[0]?.id || ''
  );

  // Grupo e subitem selecionados
  const currentGroup =
    catalogGroups.find((g) => g.id === selectedGroupId) || catalogGroups[0];
  const currentSubItem =
    currentGroup?.subItems.find((s) => s.id === selectedSubItemId) ||
    currentGroup?.subItems[0];

  // Estado dos inputs do item atual
  const [unitMode, setUnitMode] = useState<BudgetUnit>(
    currentSubItem?.defaultUnit || 'm2'
  );
  const [larguraM, setLarguraM] = useState<string>('');
  const [alturaM, setAlturaM] = useState<string>('');
  const [comprimentoM, setComprimentoM] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [precoUnitario, setPrecoUnitario] = useState<string>(
    currentSubItem?.suggestedPrice && currentSubItem.suggestedPrice > 0
      ? String(currentSubItem.suggestedPrice)
      : ''
  );
  const [itemObs, setItemObs] = useState<string>('');

  // Lista de itens do orçamento
  const [items, setItems] = useState<BudgetItem[]>([]);

  // Financeiro extra
  const [descontoValor, setDescontoValor] = useState<string>('0');
  const [descontoTipo, setDescontoTipo] = useState<'fixo' | 'percent'>('fixo');
  const [taxaInstalacao, setTaxaInstalacao] = useState<string>('0');

  // Modal de visualização / impressão de PDF
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const pdfPrintRef = useRef<HTMLDivElement>(null);

  // Notificação temporária de sucesso
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quando o usuário troca de grupo
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const grp = catalogGroups.find((g) => g.id === groupId);
    if (grp && grp.subItems.length > 0) {
      const firstSub = grp.subItems[0];
      setSelectedSubItemId(firstSub.id);
      setUnitMode(firstSub.defaultUnit || 'm2');
      setPrecoUnitario(
        firstSub.suggestedPrice && firstSub.suggestedPrice > 0
          ? String(firstSub.suggestedPrice)
          : ''
      );
    }
  };

  // Quando o usuário troca de subitem
  const handleSelectSubItem = (subId: string) => {
    setSelectedSubItemId(subId);
    const sub = currentGroup?.subItems.find((s) => s.id === subId);
    if (sub) {
      setUnitMode(sub.defaultUnit || 'm2');
      setPrecoUnitario(
        sub.suggestedPrice && sub.suggestedPrice > 0
          ? String(sub.suggestedPrice)
          : ''
      );
    }
  };

  // Cálculo da medida do item em edição
  const parsedLargura = parseFloat(larguraM.replace(',', '.')) || 0;
  const parsedAltura = parseFloat(alturaM.replace(',', '.')) || 0;
  const parsedComprimento = parseFloat(comprimentoM.replace(',', '.')) || 0;
  const parsedQtd = Math.max(1, parseInt(quantidade, 10) || 1);
  const parsedPrecoUnit = parseFloat(precoUnitario.replace(',', '.')) || 0;

  const currentAreaM2 = parsedLargura * parsedAltura;

  // Total do item que está sendo editado no momento
  const calculateCurrentItemTotal = () => {
    if (unitMode === 'm2') {
      const area = currentAreaM2 > 0 ? currentAreaM2 : 1;
      return area * parsedQtd * parsedPrecoUnit;
    }
    if (unitMode === 'linear') {
      const comp = parsedComprimento > 0 ? parsedComprimento : 1;
      return comp * parsedQtd * parsedPrecoUnit;
    }
    return parsedQtd * parsedPrecoUnit;
  };

  const currentItemPreviewTotal = calculateCurrentItemTotal();

  // Adicionar item ao orçamento
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentGroup || !currentSubItem) {
      showToast('Selecione um grupo e uma opção antes de adicionar.');
      return;
    }

    let computedTotal = 0;
    if (unitMode === 'm2') {
      const area = currentAreaM2 > 0 ? currentAreaM2 : 1;
      computedTotal = area * parsedQtd * parsedPrecoUnit;
    } else if (unitMode === 'linear') {
      const comp = parsedComprimento > 0 ? parsedComprimento : 1;
      computedTotal = comp * parsedQtd * parsedPrecoUnit;
    } else {
      computedTotal = parsedQtd * parsedPrecoUnit;
    }

    const newItem: BudgetItem = {
      id: `item-${Date.now()}`,
      groupId: currentGroup.id,
      groupName: currentGroup.nome,
      subItemId: currentSubItem.id,
      itemCode: currentSubItem.code,
      itemName: currentSubItem.nome,
      unit: unitMode,
      larguraM: unitMode === 'm2' ? parsedLargura : undefined,
      alturaM: unitMode === 'm2' ? parsedAltura : undefined,
      comprimentoM: unitMode === 'linear' ? parsedComprimento : undefined,
      areaM2: unitMode === 'm2' ? currentAreaM2 : undefined,
      quantidade: parsedQtd,
      precoUnitario: parsedPrecoUnit,
      total: computedTotal,
      observacoes: itemObs.trim() || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    setItemObs('');
    showToast(`"${currentSubItem.nome}" adicionado ao orçamento!`);
  };

  // Remover item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Duplicar item
  const handleDuplicateItem = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (item) {
      const duplicate: BudgetItem = {
        ...item,
        id: `item-${Date.now()}`,
      };
      setItems((prev) => [...prev, duplicate]);
      showToast('Item duplicado no orçamento!');
    }
  };

  // Totais do orçamento
  const subtotal = items.reduce((acc, it) => acc + it.total, 0);

  const parsedDesconto = parseFloat(descontoValor.replace(',', '.')) || 0;
  const valorDesconto =
    descontoTipo === 'percent' ? (subtotal * parsedDesconto) / 100 : parsedDesconto;

  const valorInstalacao = parseFloat(taxaInstalacao.replace(',', '.')) || 0;
  const valorTotalFinal = Math.max(0, subtotal - valorDesconto + valorInstalacao);

  // Formatação em Real brasileiro
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!pdfPrintRef.current) return;
    setIsExportingPDF(true);
    try {
      const filename = `Orcamento_${new Date().toISOString().slice(0, 10)}.pdf`;
      await generatePDFFromElement(pdfPrintRef.current, filename);
      showToast('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  // Filtragem de catálogo (por texto de busca)
  const normalizedSearch = searchFilter.trim().toLowerCase();
  const filteredGroups = catalogGroups.filter((grp) => {
    if (!normalizedSearch) return true;
    const matchGroupName = grp.nome.toLowerCase().includes(normalizedSearch);
    const matchGroupCode = grp.code.toLowerCase().includes(normalizedSearch);
    const hasSubItemMatch = grp.subItems.some(
      (s) =>
        s.nome.toLowerCase().includes(normalizedSearch) ||
        s.code.toLowerCase().includes(normalizedSearch)
    );
    return matchGroupName || matchGroupCode || hasSubItemMatch;
  });

  // Itens do grupo atual que batem com o filtro (se houver)
  const currentGroupSubItems = (currentGroup?.subItems || []).filter((sub) => {
    if (!normalizedSearch) return true;
    return (
      sub.nome.toLowerCase().includes(normalizedSearch) ||
      sub.code.toLowerCase().includes(normalizedSearch) ||
      currentGroup.nome.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid Principal: Seletor Dinâmico à esquerda, Resumo à direita */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Painel de Adicionar Item (Colunas 1 a 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80">
            {/* Barra Superior do Catálogo: Busca e Botão CSV */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>1. Escolha o Grupo Primário</span>
              </h2>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar grupos ou itens..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 w-44 sm:w-56"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grupos Primários Carregados do CSV */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 mb-6">
              {filteredGroups.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                  Nenhum grupo encontrado para "{searchFilter}".
                </div>
              ) : (
                filteredGroups.map((grp) => {
                  const isSelected = selectedGroupId === grp.id;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleSelectGroup(grp.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/40'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold opacity-75">{grp.code}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            isSelected ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200/80 text-slate-600'
                          }`}>
                            {grp.subItems.length} {grp.subItems.length === 1 ? 'opção' : 'opções'}
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                        </div>
                      </div>
                      <span className="block text-xs font-bold mt-1 line-clamp-1">{grp.nome}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Subitens Dinâmicos do Grupo Selecionado */}
            {currentGroup && (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span>2. Selecione a Opção ({currentGroup.nome})</span>
                  </div>
                  <span className="text-xs text-slate-400 font-normal">
                    {currentGroupSubItems.length} opções disponíveis
                  </span>
                </h2>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mb-6">
                  {currentGroupSubItems.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Nenhuma opção encontrada com o termo "{searchFilter}".
                    </div>
                  ) : (
                    currentGroupSubItems.map((sub) => {
                      const isSelected = selectedSubItemId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectSubItem(sub.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[11px] text-slate-500">{sub.code}</span>
                              <span className="font-bold text-slate-900">{sub.nome}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {sub.hasSpecificUnit ? (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                                  Unidade: {sub.rawUnitText || (sub.defaultUnit === 'm2' ? 'm²' : sub.defaultUnit === 'linear' ? 'm linear' : 'un')}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300">
                                  Unidade livre (m², linear ou un)
                                </span>
                              )}
                              {sub.descricaoSugestao && (
                                <span className="text-[10px] text-slate-400 line-clamp-1">{sub.descricaoSugestao}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Preço Base
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {sub.suggestedPrice && sub.suggestedPrice > 0
                                ? formatBRL(sub.suggestedPrice)
                                : 'Sob Consulta'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Formulário de Medidas, Quantidade e Preço */}
            {currentSubItem && (
              <form onSubmit={handleAddItem} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                {/* Seleção de Unidade:
                    - Se estiver em branco no CSV (!currentSubItem.hasSpecificUnit), exibe com destaque para o usuário escolher entre Área (m²), Metro Linear (m) ou Unidade (un).
                    - Se tiver unidade pré-definida no CSV, exibe o aviso com a unidade padrão configurada. */}
                {!currentSubItem.hasSpecificUnit ? (
                  <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-lg space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-amber-600" />
                          <span>Selecione a Unidade de Cobrança:</span>
                        </span>
                        <span className="text-[11px] text-amber-800 block">
                          Item com unidade em branco no catálogo. Escolha como calcular este produto:
                        </span>
                      </div>

                      {/* 3 Opções de Unidade Solicitadas */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-amber-300 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setUnitMode('m2')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            unitMode === 'm2'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Área (m²)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitMode('linear')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            unitMode === 'linear'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Metro Linear (m)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitMode('un')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            unitMode === 'un'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          Unidade (un)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Configuração de Medidas &amp; Valores
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Unidade definida na opção selecionada (bloqueada para alteração):
                      </span>
                    </div>

                    {/* Exibe exclusivamente a unidade definida no item, sem permitir troca */}
                    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Unidade Fixa:</span>
                      <span className="uppercase font-extrabold text-emerald-950">
                        {currentSubItem.rawUnitText || (currentSubItem.defaultUnit === 'm2' ? 'Área (m²)' : currentSubItem.defaultUnit === 'linear' ? 'Metro Linear (m)' : 'Unidade (un)')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Campos condicionais por Unidade de Medida */}
                {unitMode === 'm2' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Largura (metros)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Ex: 3.50"
                          value={larguraM}
                          onChange={(e) => setLarguraM(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                        <span className="absolute right-2.5 top-2.5 text-[11px] font-semibold text-slate-400">m</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Altura (metros)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Ex: 1.20"
                          value={alturaM}
                          onChange={(e) => setAlturaM(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                        <span className="absolute right-2.5 top-2.5 text-[11px] font-semibold text-slate-400">m</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Área Calculada
                      </label>
                      <div className="w-full bg-slate-200/60 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 flex items-center justify-between">
                        <span>{currentAreaM2 > 0 ? currentAreaM2.toFixed(2) : '0.00'}</span>
                        <span className="text-[11px] font-semibold text-slate-500">m²</span>
                      </div>
                    </div>
                  </div>
                )}

                {unitMode === 'linear' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Comprimento Total (metros lineares)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Ex: 6.50"
                        value={comprimentoM}
                        onChange={(e) => setComprimentoM(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] font-semibold text-slate-400">m linear</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Quantidade */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Quantidade de Peças
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Preço Unitário Editável */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Preço Unitário (R$ / {unitMode === 'm2' ? 'm²' : unitMode === 'linear' ? 'm' : 'un'})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={precoUnitario}
                        onChange={(e) => setPrecoUnitario(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Observações Opcionais do Item */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observações do Item (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cor preta fosca, aplicação externa com andaime"
                    value={itemObs}
                    onChange={(e) => setItemObs(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Prévia do Item e Botão Adicionar */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left w-full sm:w-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Deste Item:</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {formatBRL(currentItemPreviewTotal)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Adicionar Item ao Orçamento</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Resumo do Orçamento e Botão de Gerar PDF no Final (Colunas 8 a 12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Itens no Orçamento ({items.length})</span>
              </h3>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Limpar Todos
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs font-medium text-slate-500">Nenhum item adicionado ainda.</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Escolha um grupo primário e subopção ao lado para adicionar o primeiro item ao orçamento.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold mr-1">#{idx + 1}</span>
                        <strong className="text-slate-900">{it.itemName}</strong>
                        <span className="block text-[10px] text-slate-500">{it.groupName}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(it.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition cursor-pointer"
                          title="Duplicar item"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <div>
                        {it.unit === 'm2' && it.larguraM && it.alturaM && (
                          <span>
                            {it.larguraM.toFixed(2)}m × {it.alturaM.toFixed(2)}m = <strong>{it.areaM2?.toFixed(2)} m²</strong>
                          </span>
                        )}
                        {it.unit === 'linear' && it.comprimentoM && (
                          <span>
                            <strong>{it.comprimentoM.toFixed(2)} m</strong> lineares
                          </span>
                        )}
                        {it.unit === 'un' && <span>Peça unitária</span>}
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>Qtd: <strong>{it.quantidade}</strong></span>
                      </div>

                      <span className="font-bold text-slate-900 text-xs font-mono">
                        {formatBRL(it.total)}
                      </span>
                    </div>

                    {it.observacoes && (
                      <p className="text-[10px] text-slate-500 italic bg-white p-1 rounded border border-slate-200">
                        Obs: {it.observacoes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Ajustes Financeiros (Desconto & Instalação) */}
            {items.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Desconto</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={descontoTipo}
                        onChange={(e) => setDescontoTipo(e.target.value as any)}
                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-700"
                      >
                        <option value="fixo">R$</option>
                        <option value="percent">%</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={descontoValor}
                        onChange={(e) => setDescontoValor(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Instalação / Frete</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-[11px] text-slate-400">R$</span>
                      <input
                        type="number"
                        min="0"
                        value={taxaInstalacao}
                        onChange={(e) => setTaxaInstalacao(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumo Final */}
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5 shadow-md">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-mono">{formatBRL(subtotal)}</span>
                  </div>

                  {valorDesconto > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Desconto Aplicado:</span>
                      <span className="font-mono">- {formatBRL(valorDesconto)}</span>
                    </div>
                  )}

                  {valorInstalacao > 0 && (
                    <div className="flex justify-between text-xs text-blue-300">
                      <span>Instalação / Frete:</span>
                      <span className="font-mono">+ {formatBRL(valorInstalacao)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm sm:text-base font-black text-white pt-2 border-t border-slate-700">
                    <span>TOTAL DO ORÇAMENTO:</span>
                    <span className="text-emerald-400 font-mono">{formatBRL(valorTotalFinal)}</span>
                  </div>
                </div>

                {/* Botão de Gerar PDF no Final da Coluna Direita */}
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition cursor-pointer mt-3"
                >
                  <Printer className="w-4 h-4" />
                  <span>Visualizar Proposta &amp; Gerar PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal / Visualização de Proposta Comercial Pronta para Impressão */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header da Modal */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Proposta Comercial / Visualização do Orçamento</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNativePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  disabled={isExportingPDF}
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{isExportingPDF ? 'Gerando...' : 'Baixar PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Folha A4 timbrada para Impressão / PDF */}
            <div className="overflow-y-auto p-6 sm:p-10 bg-slate-100 flex justify-center">
              <div
                ref={pdfPrintRef}
                className="bg-white w-full max-w-[794px] min-h-[1050px] p-8 sm:p-12 shadow-md border border-slate-200 text-slate-900 text-xs font-sans space-y-6"
              >
                {/* Cabeçalho da Proposta */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      PROPOSTA COMERCIAL
                    </h1>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                      Comunicação Visual &amp; Fachadas
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Fachadas em ACM • Letras Caixa • Painéis Luminosos • Sinalização • Impressão Digital
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-500 block">
                      ORÇAMENTO Nº {new Date().getFullYear()}-{String(Date.now()).slice(-4)}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Data: <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                    </span>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Discriminação dos Produtos &amp; Serviços
                  </h4>

                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px]">
                        <th className="py-2.5 px-3 border border-slate-700 w-10 text-center">Item</th>
                        <th className="py-2.5 px-3 border border-slate-700">Descrição Técnica</th>
                        <th className="py-2.5 px-3 border border-slate-700 w-28 text-center">Dimensões / Medida</th>
                        <th className="py-2.5 px-3 border border-slate-700 w-14 text-center">Qtd</th>
                        <th className="py-2.5 px-3 border border-slate-700 w-24 text-right">Valor Unit.</th>
                        <th className="py-2.5 px-3 border border-slate-700 w-28 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {items.map((it, idx) => (
                        <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200">
                            <strong className="text-slate-900 block">{it.itemName}</strong>
                            <span className="text-[10px] text-slate-500">{it.groupName}</span>
                            {it.observacoes && (
                              <span className="text-[10px] text-slate-600 italic block mt-0.5">
                                • {it.observacoes}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono">
                            {it.unit === 'm2' && it.larguraM && it.alturaM && (
                              <span>{it.larguraM.toFixed(2)} × {it.alturaM.toFixed(2)}m ({it.areaM2?.toFixed(2)} m²)</span>
                            )}
                            {it.unit === 'linear' && it.comprimentoM && (
                              <span>{it.comprimentoM.toFixed(2)} m</span>
                            )}
                            {it.unit === 'un' && <span>Peça</span>}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-bold">
                            {it.quantidade}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-right font-mono">
                            {formatBRL(it.precoUnitario)}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-right font-mono font-bold text-slate-900">
                            {formatBRL(it.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quadro de Totais */}
                <div className="flex justify-end">
                  <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal dos Itens:</span>
                      <span className="font-mono font-bold">{formatBRL(subtotal)}</span>
                    </div>

                    {valorDesconto > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Desconto Especial:</span>
                        <span className="font-mono">- {formatBRL(valorDesconto)}</span>
                      </div>
                    )}

                    {valorInstalacao > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Instalação / Transporte:</span>
                        <span className="font-mono">+ {formatBRL(valorInstalacao)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-300">
                      <span>VALOR TOTAL:</span>
                      <span className="text-emerald-700 font-mono">{formatBRL(valorTotalFinal)}</span>
                    </div>
                  </div>
                </div>

                {/* Termos e Assinatura */}
                <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-500 space-y-4">
                  <div>
                    <h5 className="font-bold uppercase text-slate-700 mb-1">Termos e Condições Gerais:</h5>
                    <p>• O prazo de produção inicia-se após a aprovação do layout final e confirmação do sinal de pagamento.</p>
                    <p>• Orçamento válido pelo período informado. Alterações de medidas ou especificações requerem reavaliação de custos.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                    <div className="border-t border-slate-400 pt-1.5">
                      <span className="font-bold text-slate-800 block">Assinatura da Empresa</span>
                      <span className="text-[10px] text-slate-500">Departamento Comercial</span>
                    </div>
                    <div className="border-t border-slate-400 pt-1.5">
                      <span className="font-bold text-slate-800 block">De Acordo do Cliente</span>
                      <span className="text-[10px] text-slate-500">Data de Aprovação: ___/___/______</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
