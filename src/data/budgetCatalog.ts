import { BudgetCatalogGroup, BudgetCatalogSubItem, BudgetUnit } from '../types/budget';
import tabelaPrecosRaw from './tabela_precos.csv?raw';

/**
 * CSV padrão embutido para contingência ou restauração caso o arquivo seja corrompido.
 */
export const DEFAULT_TABELA_CSV = `DESCRICAO;UNIDADE;VALOR
1. IMPRESSÃO;M2; R$ -
1.1 Impressão 3D;M2; R$ -
1.2 Impressão Digital vinil leitoso;M2; R$ 140,00
1.3 Impressão Digital em vinil Jateado;M2; R$ 170,00
1.4 Impressão Digital em Vinil Transparente Calçado de branco;M2; R$ 165,00
1.5 Impressão Digital com recorte ;M2; R$ 170,00
1.6 Impressão Digital em vinil transparente calçado com recorte;M2; R$ 195,00
1.7 Impressões digitais utilizando vinil premium acrescer 38%;M2;
1.8 Vinil calandrado recorte ;M2; R$ 160,00
1.9 Vinil calandrado premium recorte ;M2; R$ 190,00
2.0 Vinil calandrado importado recorte;M2; R$ 337,14
2.1 Vinil calandrado refletivo recorte;M2; R$ 235,63
2.2 Vinil Fotoluminescente recorte;M2; R$ 1.123,80
2.2 Impressão Digital vinil leitoso com laminação;M2; R$ 195,00
2.2 Gabarito Instalação;; R$ -
2.6 Router ACM;; R$ -
2.7 Acrílico;; R$ -
2.9 Laser Acrílico;; R$ -
2.10 Router MDF;; R$ -
3. SOLDAS;; R$ -
3.1 Branca;; R$ -
3.2 Eletrodo;; R$ -
3.3 MIG;; R$ -
3.4 TIG;; R$ -
4. ACABAMENTO GROSSO;; R$ -
4.1 Desbaste;; R$ -
4.2 Fino;; R$ -
5. PINTURA;; R$ 225,00
5.1 Automotiva;; R$ -
5.2 Acetinado / Semi-Brilho;; R$ -
5.3 Laca;; R$ -
5.4 Eletrostática;; R$ -
5.5 Brilhante;; R$ -
5.6 Poliéster;; R$ -
5.7 Fosco;; R$ -
5.8 PU;; R$ -
6. ACABAMENTO FINAL;; R$ -
6.1 ACM;; R$ 253,76
ACM CORES ;; R$ 253,76
ACM CORES ESPECIAIS ;; R$ 290,00
6.2 Lixamento / Preparação;; R$ -
6.3 Acrílico;; R$ -
6.4 MDF;; R$ -
6.5 Adesivo;; R$ -
6.6 Pintura;; R$ -
6.7 Impressão;; R$ -
7. ILUMINAÇÃO;; R$ -
7.1 Fita LED;; R$ -
7.2 LED / Soldagem / Fiação;; R$ -
7.3 RGB;; R$ -
7.4 Haste;; R$ -
7.5 Módulo LED;; R$ -
7.6 Lâmpada Tubular / Fiação;; R$ -
7.7 Refletor / Fiação;; R$ -
8. ACESSÓRIOS;; R$ -
8.1 Barra Roscada;; R$ -
8.2 Cantoneiras;; R$ -
8.3 Fita VHB;; R$ -
8.4 Parabolt;; R$ -
8.5 Pino Fixador;; R$ -
8.6 Sikadur;; R$ -
8.7 Bucha;; R$ -
8.8 Fiação;; R$ -
8.9 Fonte;; R$ -
8.10 Parafuso;; R$ -
8.11 Prolongador;; R$ -
8.12 Vidros;; R$ -
8.13 Canaleta de LED;; R$ -
8.14 Interruptor LD;; R$ -
8.15 Mão Amiga;; R$ -
8.16 Perfil Alumínio;; R$ -
8.17 Sapata Regulável;; R$ -
9. COLAGEM;; R$ -
9.1 ACM;; R$ -
9.2 Módulo de LED;; R$ -
9.3 Acrílico;; R$ -
9.4 Primmer;; R$ -
9.5 Cola / Cianocrilato;; R$ -
9.6 Silicone / Vedação;; R$ -
9.7 Fita de Borda;; R$ -
10. FACHADA DE ACM;; R$ -
11. PLACA FACHADA  DE ACM ADESIVADA ;; R$ -
11.1. PLACA FACHADA DE ACM COM LETRA CAIXA EM AÇO SEM ILUMINAÇÃO;; R$ -
11.2. PLACA FACHADA DE ACM COM LETRA CAIXA EM AÇO COM ILUMINAÇÃO;; R$ -
11.3. PLACA FACHADA DE ACM COM LETRA CAIXA EM PVC SEM ILUMINAÇÃO;; R$ -
11.4. PLACA FACHADA DE ACM COM LETRA CAIXA EM PVC COM ILUMINAÇÃO;; R$ -
11.5. PLACA FACHADA DE ACM COM LETRA CAIXA EM ACRILICO COM ILUMINAÇÃO;; R$ -
11.6. PLACA FACHADA DE ACM COM LETRA CAIXA EM ACRILICO SEM ILUMINAÇÃO;; R$ -
11.7. PLACA FACHADA LONA FRONT;; R$ -
11.8. PLACA FACHADA LONA BACK;; R$ -
12. PLACA DE SINALIZAÇÃO PVC ADESIVADO;; R$ -
12.1. PLACA DE SINALIZAÇÃO ACRILICO ADESIVADO;; R$ -
12.2. PLACA DE SINALIZAÇÃO AÇO ADESICADO;; R$ -
12.3. PLACA DE SINALIZAÇÃO PVC PINTADA COM VINIL RECORTADO;; R$ -
12.4. PLACA DE SINALIZAÇÃO PVC PINTADA COM ACRILICO RECORTADO;; R$ -
12.5. PLACA DE SINALIZAÇÃO ACRILICO PINTADO COM RECORTE;; R$ -
12.6. PLACA DE SINALIZAÇÃO ACRILICO PINTADO COM ACRILICO RECORTADO;; R$ -
12.7. PLACA DE SINALIZAÇÃO AÇO PINTADO COM VINIL RECORTADO;; R$ -
12.8. PLACA DE SINALIZAÇÃO AÇO PINTADO COM ACRILICO RECORTADO;; R$ -
12.9. PLACA DE SINALIZAÇÃO ACRILICO CRISTAL COM VINIL CALÇADO;; R$ -
12.10. PLACA DE SINALIZAÇÃO ACRILICO CRISTAL CALÇADO E RECORTE;; R$ -
12.11. PLACA DE SINALIZAÇÃO ACRILICO CRISTLA CALÇADO E ACRILICO RECORTADO;; R$ -
12.12. PLACA DE SINALIZAÇÃO PSID COM ADESIVO;; R$ -
12.13. PLACA DE SINALIZAÇÃO PSID COM ADESICO E ACRILICO RECORTADO;; R$ -
12.14. PLACA DE SINALIZAÇÃO VIDRO COM ADESIVO IMPRESSO CALÇADO ;; R$ -
12.15. PLACA DE SINALIZAÇÃO VIDRO COM ADESIVO IMPRESSO CALÇADO  E ACRILICO RECORTADO;; R$ -
12.16. PLACA DE SINALIZAÇÃO INOX PINTADO COM RECORTE;; R$ -
12.17. PLACA DE SINALIZAÇÃO INOX PINTADO COM ACRILICO RECORTADO;; R$ -
12.18. PLACA DE SINALIZAÇÃO ACM PINTADO COM RECORTE;; R$ -
12.19. PLACA DE SINALIZAÇÃO ACM PINTADO COM ACRILICO RECORTADO;; R$ -
12.20. PLACA DE SINALIZAÇÃO EM ACM COM VINIL IMPRESSO;; R$ -
12.21. PLACA DE SINALIZAÇÃO EM ACM COM VINIL RECORTADO;; R$ -
12.22. PLACA DE SINALIZAÇÃO EM ACM COM ACRILICO RECORTADO;; R$ -
13. LETREIRO EM AÇO GALVANIZADO SEM ILUMINAÇÃO;; R$ -
13.1. LETREIRO EM AÇO GALVANIZADO COM ILUMINAÇÃO;; R$ -
13.2. LETREIRO EM AÇO INOX SEM ILUMINAÇÃO;; R$ -
13.3. LETREIRO EM AÇO INOX COM ILUMNAÇÃO;; R$ -
13.4. LETREIRO EM PVC EXPANDIDO SEM ILUMINAÇÃO;; R$ -
13.5. LETREIRO EM PVC EXPANDIDO COM ILUMINAÇÃO;; R$ -
13.6. LETREIRO EM ACRILICO PINTADO;; R$ -
14. ADESIVO IMPRESSO;; R$ -
14.1. ADESIVO RECORTE;; R$ -
14.2. ADESIVO IMPRESSO COM RECORTE;; R$ -
14.3. ADESIVO IMPRESSO COM CALÇO;; R$ -
14.4. GRAVAÇÃO LASER ;; R$ -
14.5. LONA IMPRESSA SIMPLES ;; R$ -
14.6. LONA IMPRESSA COM ACABAMENTO;; R$ -
14.7. BANNER;; R$ -`;

/**
 * Converte string de preço (ex: "R$ 140,00", "R$ 1.123,80", "R$ -") para number ou undefined
 */
export function parseCsvPrice(valStr: string): number | undefined {
  if (!valStr) return undefined;
  const clean = valStr.replace(/R\$/i, '').trim();
  if (!clean || clean === '-' || clean === 'sob consulta') return undefined;

  // Trata formato brasileiro (1.123,80 -> 1123.80)
  if (clean.includes(',')) {
    const standardized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(standardized);
    return isNaN(parsed) || parsed < 0 ? undefined : parsed;
  }

  const parsed = parseFloat(clean);
  return isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

/**
 * Identifica a unidade de medida configurada no CSV.
 * Se estiver em branco, retorna hasSpecificUnit = false para o usuário escolher livremente.
 */
export function parseCsvUnit(unitStr: string): {
  unit: BudgetUnit;
  hasSpecificUnit: boolean;
  rawText: string;
} {
  const trimmed = (unitStr || '').trim();
  if (!trimmed || trimmed === '-') {
    return {
      unit: 'm2',
      hasSpecificUnit: false,
      rawText: '',
    };
  }

  const upper = trimmed.toUpperCase();
  if (upper.includes('M2') || upper.includes('M²')) {
    return { unit: 'm2', hasSpecificUnit: true, rawText: 'm²' };
  }
  if (upper.includes('ML') || upper.includes('LINEAR') || upper === 'M' || upper.includes('METRO')) {
    return { unit: 'linear', hasSpecificUnit: true, rawText: 'metro linear' };
  }
  if (upper.includes('UN') || upper.includes('UND') || upper.includes('PC') || upper.includes('PEÇA') || upper.includes('PECA')) {
    return { unit: 'un', hasSpecificUnit: true, rawText: 'unidade' };
  }

  return { unit: 'un', hasSpecificUnit: true, rawText: trimmed };
}

/**
 * Analisa e transforma o conteúdo do arquivo CSV na estrutura hierárquica de Grupos e Sub-opções.
 */
export function parseBudgetCsv(csvContent: string): BudgetCatalogGroup[] {
  const text = csvContent && csvContent.trim().length > 0 ? csvContent : DEFAULT_TABELA_CSV;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const groups: BudgetCatalogGroup[] = [];
  let currentGroup: BudgetCatalogGroup | null = null;
  let subIndexInGroup = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignora cabeçalho
    if (line.toUpperCase().startsWith('DESCRICAO') || line.toUpperCase().startsWith('DESCRIÇÃO')) {
      continue;
    }

    // Identifica separador (; ou ,)
    const delimiter = line.includes(';') ? ';' : ',';
    const parts = line.split(delimiter).map((p) => p.trim());
    const rawDesc = parts[0] || '';
    const rawUnit = parts[1] || '';
    const rawPrice = parts[2] || '';

    if (!rawDesc) continue;

    const parsedPrice = parseCsvPrice(rawPrice);
    const parsedUnitInfo = parseCsvUnit(rawUnit);

    // Regex para identificar sub-itens numerados (ex: "1.1 Impressão", "2.10 Router", "11.1. PLACA...")
    // Note que sub-itens possuem ponto no meio dos números (ex: 1.1 ou 11.2.)
    const subItemMatch = rawDesc.match(/^(\d+\.\d+)\.?\s*(.*)$/);

    // Regex para grupos primários (ex: "1. IMPRESSÃO", "3. SOLDAS", "10. FACHADA DE ACM")
    const groupMatch = !subItemMatch ? rawDesc.match(/^(\d+)\.\s*(.*)$/) : null;

    if (groupMatch) {
      // Salva grupo anterior
      if (currentGroup) {
        // Se o grupo não possuía nenhum subitem, gera um item default com seus dados
        if (currentGroup.subItems.length === 0) {
          currentGroup.subItems.push({
            id: `${currentGroup.id}-item-1`,
            code: currentGroup.code,
            nome: currentGroup.nome,
            defaultUnit: currentGroup.defaultUnit || 'm2',
            hasSpecificUnit: currentGroup.hasSpecificUnit,
            rawUnitText: currentGroup.rawUnitText,
            suggestedPrice: currentGroup.suggestedPrice,
            descricaoSugestao: `Item principal: ${currentGroup.nome}`,
          });
        }
        groups.push(currentGroup);
      }

      const grpNum = groupMatch[1];
      const grpNome = groupMatch[2] || rawDesc;

      subIndexInGroup = 0;
      currentGroup = {
        id: `grp-${grpNum}`,
        code: `${grpNum}.`,
        nome: grpNome,
        descricao: `Opções e itens do grupo ${grpNome}`,
        defaultUnit: parsedUnitInfo.unit,
        hasSpecificUnit: parsedUnitInfo.hasSpecificUnit,
        rawUnitText: parsedUnitInfo.rawText,
        suggestedPrice: parsedPrice,
        subItems: [],
      };
      continue;
    }

    // Se é um sub-item numerado ou se é uma linha filha (ex: "ACM CORES")
    if (currentGroup) {
      subIndexInGroup++;
      let itemCode = '';
      let itemNome = '';

      if (subItemMatch) {
        itemCode = subItemMatch[1];
        itemNome = subItemMatch[2] || rawDesc;
      } else {
        itemCode = `${currentGroup.code.replace('.', '')}.${subIndexInGroup}`;
        itemNome = rawDesc;
      }

      currentGroup.subItems.push({
        id: `${currentGroup.id}-sub-${itemCode.replace(/\./g, '_')}-${subIndexInGroup}`,
        code: itemCode,
        nome: itemNome,
        defaultUnit: parsedUnitInfo.hasSpecificUnit ? parsedUnitInfo.unit : (currentGroup.defaultUnit || 'm2'),
        hasSpecificUnit: parsedUnitInfo.hasSpecificUnit,
        rawUnitText: parsedUnitInfo.rawText,
        suggestedPrice: parsedPrice !== undefined ? parsedPrice : currentGroup.suggestedPrice,
        descricaoSugestao: `${currentGroup.nome} - ${itemNome}`,
      });
    } else {
      // Caso a primeira linha do arquivo seja um item sem grupo explícito
      const grpId = 'grp-1';
      currentGroup = {
        id: grpId,
        code: '1.',
        nome: 'GERAL',
        subItems: [],
      };
      currentGroup.subItems.push({
        id: `${grpId}-sub-1`,
        code: '1.1',
        nome: rawDesc,
        defaultUnit: parsedUnitInfo.unit,
        hasSpecificUnit: parsedUnitInfo.hasSpecificUnit,
        rawUnitText: parsedUnitInfo.rawText,
        suggestedPrice: parsedPrice,
      });
    }
  }

  // Adiciona o último grupo processado
  if (currentGroup) {
    if (currentGroup.subItems.length === 0) {
      currentGroup.subItems.push({
        id: `${currentGroup.id}-item-1`,
        code: currentGroup.code,
        nome: currentGroup.nome,
        defaultUnit: currentGroup.defaultUnit || 'm2',
        hasSpecificUnit: currentGroup.hasSpecificUnit,
        rawUnitText: currentGroup.rawUnitText,
        suggestedPrice: currentGroup.suggestedPrice,
        descricaoSugestao: `Item principal: ${currentGroup.nome}`,
      });
    }
    groups.push(currentGroup);
  }

  return groups;
}

// Carrega o catálogo padrão importado do arquivo CSV /src/data/tabela_precos.csv
export const BUDGET_CATALOG_GROUPS: BudgetCatalogGroup[] = parseBudgetCsv(
  tabelaPrecosRaw || DEFAULT_TABELA_CSV
);
