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
  Building2,
  Phone,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  ShieldCheck,
  Award,
  Globe,
  Instagram,
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

  // Dados do Cliente e Proposta Comercial (SKYMÍDIA)
  const [clienteNome, setClienteNome] = useState<string>('Cliente Especial');
  const [clienteEmpresa, setClienteEmpresa] = useState<string>('');
  const [clienteTelefone, setClienteTelefone] = useState<string>('(00) 00000-0000');
  const [clienteEmail, setClienteEmail] = useState<string>('');
  const [clienteCidade, setClienteCidade] = useState<string>('');
  const [validadeDias, setValidadeDias] = useState<number>(10);
  const [prazoProducao, setPrazoProducao] = useState<string>('7 a 10 dias úteis após aprovação final e sinal');
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>('50% de entrada no aceite + 50% na conclusão / entrega');
  const [formaPagamento, setFormaPagamento] = useState<string>('Pix, Transferência Bancária ou Cartão de Crédito');
  const [garantiaMeses, setGarantiaMeses] = useState<string>('12 meses contra defeitos de fabricação e descolamento');

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
  const [quantidade, setQuantidade] = useState<string>(
    currentSubItem?.minimo && currentSubItem.minimo > 0 ? String(currentSubItem.minimo) : '1'
  );
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
      setQuantidade(firstSub.minimo && firstSub.minimo > 0 ? String(firstSub.minimo) : '1');
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
      setQuantidade(sub.minimo && sub.minimo > 0 ? String(sub.minimo) : '1');
    }
  };

  // Cálculo da medida do item em edição
  const parsedLargura = parseFloat(larguraM.replace(',', '.')) || 0;
  const parsedAltura = parseFloat(alturaM.replace(',', '.')) || 0;
  const parsedComprimento = parseFloat(comprimentoM.replace(',', '.')) || 0;
  const parsedQtd = Math.max(0, parseFloat(quantidade.replace(',', '.')) || 0);
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
    // Para 'minuto', 'placa' ou 'un'
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

    if (parsedQtd <= 0) {
      showToast('Por favor, informe uma quantidade válida maior que zero.');
      return;
    }

    // Validação de Mínimo
    if (currentSubItem.minimo && currentSubItem.minimo > 0 && parsedQtd < currentSubItem.minimo) {
      showToast(`A quantidade mínima para "${currentSubItem.nome}" é ${currentSubItem.minimo}.`);
      return;
    }

    // Validação de Máximo
    if (currentSubItem.maximo && currentSubItem.maximo > 0 && parsedQtd > currentSubItem.maximo) {
      showToast(`A quantidade máxima permitida para "${currentSubItem.nome}" é ${currentSubItem.maximo}.`);
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
      const sanitizedClient = clienteNome ? clienteNome.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20) : 'Cliente';
      const filename = `Proposta_SKYMÍDIA_${sanitizedClient}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {sub.hasSpecificUnit ? (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                                  Unidade: {sub.rawUnitText || (sub.defaultUnit === 'm2' ? 'm²' : sub.defaultUnit === 'linear' ? 'm linear' : sub.defaultUnit === 'minuto' ? 'minuto' : sub.defaultUnit === 'placa' ? 'placa' : 'un')}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300">
                                  Unidade livre (m², linear ou un)
                                </span>
                              )}
                              {sub.minimo !== undefined && (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                  Mín: {sub.minimo}
                                </span>
                              )}
                              {sub.maximo !== undefined && (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                                  Máx: {sub.maximo}
                                </span>
                              )}
                              {sub.descricaoSugestao && (
                                <span className="text-[10px] text-slate-400 line-clamp-1">{sub.descricaoSugestao}</span>
                              )}
                            </div>
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
                        {currentSubItem.rawUnitText || (
                          currentSubItem.defaultUnit === 'm2'
                            ? 'Área (m²)'
                            : currentSubItem.defaultUnit === 'linear'
                            ? 'Metro Linear (m)'
                            : currentSubItem.defaultUnit === 'minuto'
                            ? 'Minuto (min)'
                            : currentSubItem.defaultUnit === 'placa'
                            ? 'Placa (un)'
                            : 'Unidade (un)'
                        )}
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
                  {/* Quantidade com respeito a Mínimo e Máximo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">
                        {unitMode === 'minuto'
                          ? 'Tempo / Minutos'
                          : unitMode === 'placa'
                          ? 'Quantidade de Placas'
                          : unitMode === 'm2'
                          ? 'Quantidade de Peças'
                          : unitMode === 'linear'
                          ? 'Quantidade de Barras / Vias'
                          : 'Quantidade de Peças'}
                      </label>
                      {currentSubItem && (currentSubItem.minimo !== undefined || currentSubItem.maximo !== undefined) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                          {currentSubItem.minimo !== undefined && currentSubItem.maximo !== undefined
                            ? `Mín: ${currentSubItem.minimo} | Máx: ${currentSubItem.maximo}`
                            : currentSubItem.minimo !== undefined
                            ? `Mínimo: ${currentSubItem.minimo}`
                            : `Máximo: ${currentSubItem.maximo}`}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      min={currentSubItem?.minimo && currentSubItem.minimo > 0 ? currentSubItem.minimo : 0.01}
                      max={currentSubItem?.maximo && currentSubItem.maximo > 0 ? currentSubItem.maximo : undefined}
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
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

                {/* Botão Adicionar Item */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
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
                        {it.unit === 'minuto' && (
                          <span>
                            <strong>{it.quantidade}</strong> min de usinagem
                          </span>
                        )}
                        {it.unit === 'placa' && (
                          <span>
                            <strong>{it.quantidade}</strong> placa(s)
                          </span>
                        )}
                        {it.unit === 'un' && <span>Peça unitária</span>}
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>Qtd: <strong>{it.quantidade}</strong></span>
                      </div>
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
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Header da Modal com Ações e Edição Rápida de Dados da Proposta */}
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide flex items-center gap-2">
                    <span>SKYMÍDIA</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Proposta Comercial
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Documento profissional pronto para impressão ou exportação em PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleNativePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  disabled={isExportingPDF}
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{isExportingPDF ? 'Gerando PDF...' : 'Baixar PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Ajuste dos Dados do Cliente & Condições Comerciais */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0">
              <details className="group">
                <summary className="text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between list-none">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Personalizar Dados do Cliente &amp; Condições da Proposta (Clique para expandir)</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold group-open:hidden">
                    Editar Dados +
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold hidden group-open:inline">
                    Recolher -
                  </span>
                </summary>

                <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome do Cliente</label>
                    <input
                      type="text"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      placeholder="Ex: Carlos Oliveira"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Empresa / Razão Social</label>
                    <input
                      type="text"
                      value={clienteEmpresa}
                      onChange={(e) => setClienteEmpresa(e.target.value)}
                      placeholder="Ex: Loja Modelo Ltda"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={clienteTelefone}
                      onChange={(e) => setClienteTelefone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Cidade / UF</label>
                    <input
                      type="text"
                      value={clienteCidade}
                      onChange={(e) => setClienteCidade(e.target.value)}
                      placeholder="Ex: São Paulo / SP"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Validade da Proposta (Dias)</label>
                    <input
                      type="number"
                      min="1"
                      value={validadeDias}
                      onChange={(e) => setValidadeDias(parseInt(e.target.value, 10) || 10)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Prazo de Produção</label>
                    <input
                      type="text"
                      value={prazoProducao}
                      onChange={(e) => setPrazoProducao(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Condições de Pagamento</label>
                    <input
                      type="text"
                      value={condicoesPagamento}
                      onChange={(e) => setCondicoesPagamento(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Garantia Oferecida</label>
                    <input
                      type="text"
                      value={garantiaMeses}
                      onChange={(e) => setGarantiaMeses(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                </div>
              </details>
            </div>

            {/* Conteúdo da Folha A4 timbrada para Impressão / PDF */}
            <div className="overflow-y-auto p-4 sm:p-8 bg-slate-200/80 flex justify-center">
              <div
                ref={pdfPrintRef}
                className="bg-white w-full max-w-[794px] min-h-[1050px] p-8 sm:p-10 shadow-lg border border-slate-300 text-slate-900 text-xs font-sans space-y-5"
              >
                {/* Cabeçalho da Proposta Timbrada SKYMÍDIA */}
                <div className="border-b-2 border-slate-900 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-poppins">
                          SKYMÍDIA
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-700 mt-2">
                        <a
                          href="https://skymidiabh.com.br/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-emerald-700 text-slate-700"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>skymidiabh.com.br</span>
                        </a>
                        <a
                          href="https://www.instagram.com/skymidiabh/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-rose-600 text-slate-700"
                        >
                          <Instagram className="w-3.5 h-3.5 text-rose-500" />
                          <span>@skymidiabh</span>
                        </a>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-block bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Proposta Comercial Nº
                        </span>
                        <span className="font-mono text-sm font-extrabold text-slate-900">
                          SKY-{new Date().getFullYear()}-{String(Date.now()).slice(-4)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5">
                        <p>Data de Emissão: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
                        <p className="text-emerald-700 font-semibold">
                          Validade da Proposta: <strong>{validadeDias} dias</strong> ({
                            new Date(Date.now() + validadeDias * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
                          })
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco de Informações do Cliente */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                    Dados do Solicitante / Cliente:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Cliente / Contato:</span>
                      <strong className="text-slate-900">{clienteNome || 'Não informado'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Empresa:</span>
                      <span className="font-medium text-slate-800">{clienteEmpresa || 'Pessoa Física / Particular'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Telefone / WhatsApp:</span>
                      <span className="font-medium text-slate-800">{clienteTelefone || 'A confirmar'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Cidade / Local:</span>
                      <span className="font-medium text-slate-800">{clienteCidade || 'Atendimento Geral'}</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Itens Selecionados (Proteção Intelectual: Apenas descrição, dimensões e quantidade) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Relação de Produtos &amp; Serviços Orçados ({items.length} itens)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 italic">
                      Todos os itens selecionados para este projeto
                    </span>
                  </div>

                  <table className="w-full text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px]">
                        <th className="py-2 px-3 border border-slate-700 w-10 text-center">Item</th>
                        <th className="py-2 px-3 border border-slate-700">Descrição Técnica do Serviço / Produto</th>
                        <th className="py-2 px-3 border border-slate-700 w-36 text-center">Dimensões / Medidas</th>
                        <th className="py-2 px-3 border border-slate-700 w-20 text-center">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {items.map((it, idx) => (
                        <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200">
                            <strong className="text-slate-900 block">{it.itemName}</strong>
                            <span className="text-[10px] text-slate-500">{it.groupName}</span>
                            {it.observacoes && (
                              <span className="text-[10px] text-slate-600 italic block mt-0.5">
                                • Observação: {it.observacoes}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono">
                            {it.unit === 'm2' && it.larguraM && it.alturaM && (
                              <span>
                                {it.larguraM.toFixed(2)}m × {it.alturaM.toFixed(2)}m
                                <strong className="block text-[10px] text-emerald-800">
                                  ({it.areaM2?.toFixed(2)} m²)
                                </strong>
                              </span>
                            )}
                            {it.unit === 'linear' && it.comprimentoM && (
                              <span><strong>{it.comprimentoM.toFixed(2)} m</strong> linear</span>
                            )}
                            {it.unit === 'minuto' && (
                              <span><strong>{it.quantidade}</strong> min de corte/laser</span>
                            )}
                            {it.unit === 'placa' && (
                              <span><strong>{it.quantidade}</strong> placa(s)</span>
                            )}
                            {it.unit === 'un' && <span>Peça unitária</span>}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-bold">
                            {it.quantidade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quadro de Valores Totais do Orçamento */}
                <div className="flex justify-end pt-1">
                  <div className="w-80 bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal dos Itens:</span>
                      <span className="font-mono font-bold">{formatBRL(subtotal)}</span>
                    </div>

                    {valorDesconto > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Desconto Especial Concedido:</span>
                        <span className="font-mono">- {formatBRL(valorDesconto)}</span>
                      </div>
                    )}

                    {valorInstalacao > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Instalação / Frete no Local:</span>
                        <span className="font-mono">+ {formatBRL(valorInstalacao)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-black text-slate-950 pt-2.5 border-t-2 border-slate-300">
                      <span>VALOR TOTAL DO INVESTIMENTO:</span>
                      <span className="text-emerald-700 font-mono text-lg">{formatBRL(valorTotalFinal)}</span>
                    </div>
                  </div>
                </div>

                {/* Condições Comerciais Padronizadas */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-[11px] text-slate-600">
                  <h5 className="font-bold uppercase tracking-wider text-slate-800 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Condições Comerciais &amp; Execução:</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <strong className="text-slate-800 block">• Prazo de Produção e Entrega:</strong>
                      <span>{prazoProducao}</span>
                    </div>

                    <div>
                      <strong className="text-slate-800 block">• Condições de Pagamento:</strong>
                      <span>{condicoesPagamento}</span>
                    </div>

                    <div>
                      <strong className="text-slate-800 block">• Formas de Pagamento Aceitas:</strong>
                      <span>{formaPagamento}</span>
                    </div>

                    <div>
                      <strong className="text-slate-800 block">• Garantia e Qualidade:</strong>
                      <span>{garantiaMeses}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
                    <p>
                      <strong>Nota 1:</strong> A fabricação é iniciada estritamente após a aprovação formal do layout técnico e confirmação da entrada financeira.
                    </p>
                    <p>
                      <strong>Nota 2:</strong> O cliente deve disponibilizar ponto de energia elétrica compatível no local caso o projeto inclua iluminação.
                    </p>
                    <p>
                      <strong>Nota 3:</strong> Proposta válida por {validadeDias} dias a partir da data de emissão. Alterações de medidas ou especificações requerem reavaliação.
                    </p>
                  </div>
                </div>

                {/* Assinaturas Formais de De Acordo */}
                <div className="grid grid-cols-2 gap-10 pt-10 mt-6 text-center text-xs">
                  <div className="border-t border-slate-400 pt-3">
                    <span className="font-bold text-slate-900 block text-xs">SKYMÍDIA COMUNICAÇÃO VISUAL</span>
                    <span className="text-[10px] text-slate-500 block mt-2 tracking-wide">Departamento Técnico / Comercial</span>
                  </div>

                  <div className="border-t border-slate-400 pt-3">
                    <span className="font-bold text-slate-900 block text-xs">DE ACORDO DO CLIENTE</span>
                    <span className="text-[10px] text-slate-500 block mt-2 tracking-wide">
                      {clienteNome || 'Assinatura do Responsável'} • Data: ___/___/______
                    </span>
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
