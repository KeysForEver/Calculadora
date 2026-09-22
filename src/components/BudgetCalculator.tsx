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
} from 'lucide-react';
import { BUDGET_CATALOG_GROUPS } from '../data/budgetCatalog';
import { BudgetItem, BudgetUnit } from '../types/budget';
import { generatePDFFromElement } from '../utils/pdfGenerator';

interface BudgetCalculatorProps {
  onBackToPainel?: () => void;
}

export function BudgetCalculator({ onBackToPainel }: BudgetCalculatorProps) {
  // Estado de seleção do catálogo
  const [selectedGroupId, setSelectedGroupId] = useState<string>('grp-1');
  const [selectedSubItemId, setSelectedSubItemId] = useState<string>('1.1');

  // Estado dos inputs do item atual
  const [unitMode, setUnitMode] = useState<BudgetUnit>('m2');
  const [larguraM, setLarguraM] = useState<string>('');
  const [alturaM, setAlturaM] = useState<string>('');
  const [comprimentoM, setComprimentoM] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [precoUnitario, setPrecoUnitario] = useState<string>('380');
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

  // Grupo e subitem selecionados
  const currentGroup = BUDGET_CATALOG_GROUPS.find((g) => g.id === selectedGroupId) || BUDGET_CATALOG_GROUPS[0];
  const currentSubItem = currentGroup.subItems.find((s) => s.id === selectedSubItemId) || currentGroup.subItems[0];

  // Quando o usuário troca de grupo
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const grp = BUDGET_CATALOG_GROUPS.find((g) => g.id === groupId);
    if (grp && grp.subItems.length > 0) {
      const firstSub = grp.subItems[0];
      setSelectedSubItemId(firstSub.id);
      setUnitMode(firstSub.defaultUnit);
      setPrecoUnitario(String(firstSub.suggestedPrice || 0));
    }
  };

  // Quando o usuário troca de subitem
  const handleSelectSubItem = (subId: string) => {
    setSelectedSubItemId(subId);
    const sub = currentGroup.subItems.find((s) => s.id === subId);
    if (sub) {
      setUnitMode(sub.defaultUnit);
      setPrecoUnitario(String(sub.suggestedPrice || 0));
    }
  };

  // Cálculo da medida do item em edição
  const parsedLargura = parseFloat(larguraM) || 0;
  const parsedAltura = parseFloat(alturaM) || 0;
  const parsedComprimento = parseFloat(comprimentoM) || 0;
  const parsedQtd = Math.max(1, parseInt(quantidade, 10) || 1);
  const parsedPrecoUnit = parseFloat(precoUnitario) || 0;

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
    showToast(`"${currentSubItem.nome}" adicionado com sucesso!`);
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

  // Atualizar campo inline de item
  const handleUpdateItem = (id: string, field: keyof BudgetItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };

        // Recalcula total se mudar qtd ou preço
        if (field === 'quantidade' || field === 'precoUnitario') {
          const q = field === 'quantidade' ? Math.max(1, Number(val) || 1) : item.quantidade;
          const p = field === 'precoUnitario' ? Number(val) || 0 : item.precoUnitario;
          if (item.unit === 'm2' && item.areaM2) {
            updated.total = item.areaM2 * q * p;
          } else if (item.unit === 'linear' && item.comprimentoM) {
            updated.total = item.comprimentoM * q * p;
          } else {
            updated.total = q * p;
          }
        }
        return updated;
      })
    );
  };

  // Totais do orçamento
  const subtotal = items.reduce((acc, it) => acc + it.total, 0);

  const parsedDesconto = parseFloat(descontoValor) || 0;
  const valorDesconto =
    descontoTipo === 'percent' ? (subtotal * parsedDesconto) / 100 : parsedDesconto;

  const valorInstalacao = parseFloat(taxaInstalacao) || 0;
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>1. Escolha o Grupo Primário</span>
            </h2>

            {/* Grupos Primários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {BUDGET_CATALOG_GROUPS.map((grp) => {
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
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    </div>
                    <span className="block text-xs font-bold mt-1 line-clamp-1">{grp.nome}</span>
                  </button>
                );
              })}
            </div>

            {/* Subitens Dinâmicos do Grupo Selecionado */}
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>2. Selecione a Opção ({currentGroup.subItems.length} opções disponíveis)</span>
            </h2>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-6">
              {currentGroup.subItems.map((sub) => {
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
                      {sub.descricaoSugestao && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{sub.descricaoSugestao}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Base ({sub.defaultUnit === 'm2' ? 'm²' : sub.defaultUnit === 'linear' ? 'm' : 'un'})
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {sub.suggestedPrice ? formatBRL(sub.suggestedPrice) : 'Sob Consulta'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulário de Medidas, Quantidade e Preço */}
            <form onSubmit={handleAddItem} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  Configuração de Medidas &amp; Valores
                </span>

                {/* Seleção de Unidade */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUnitMode('m2')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      unitMode === 'm2' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Área (m²)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitMode('linear')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      unitMode === 'linear' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Metro Linear (m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitMode('un')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      unitMode === 'un' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Unidade (un)
                  </button>
                </div>
              </div>

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
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Observações do Item */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Observações / Acabamento do Item (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: ACM cor Preto Brilho, lona com bainha e ilhós a cada 30cm, etc."
                  value={itemObs}
                  onChange={(e) => setItemObs(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Barra de Subtotal do Item e Botão Adicionar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Previsto deste Item</span>
                  <span className="text-base font-black text-slate-900">
                    {formatBRL(currentItemPreviewTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar ao Orçamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tabela de Itens e Resumo Financeiro (Colunas 8 a 12) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Lista de Itens Adicionados */}
          <div className="bg-white rounded-2xl p-5 shadow-xl border border-slate-200/80">
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
              <div className="py-10 text-center text-slate-400">
                <p className="text-xs font-medium text-slate-500">Nenhum item adicionado ainda.</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Escolha um grupo primário e subopção ao lado para adicionar o primeiro item ao orçamento.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
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

                      <span className="font-bold text-slate-900 text-xs">
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

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
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
