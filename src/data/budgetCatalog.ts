import { BudgetCatalogGroup, BudgetCatalogSubItem, BudgetUnit } from '../types/budget';
import tabelaPrecosRaw from './tabela_precos.csv?raw';

/**
 * CSV padrão embutido para contingência caso o arquivo seja corrompido.
 */
export const DEFAULT_TABELA_CSV = `CODIGO;DESCRICAO;UNIDADE;VALOR;MINIMO;MAXIMO
1;Impressão Digital E 3D;M2;0;1,00;
1.1;Impressão 3D;M2;0;1,00;
1.2;Impressão Digital Em Vinil Leitoso;M2;R$ 140,01;1,00;
1.3;Impressão Digital Em Vinil Leitoso Com Laminação;M2;R$ 195,00;1,00;
1.4;Impressão Digital Em Vinil Jateado;M2;R$ 169,88;1,00;
1.5;Impressão Digital Em Vinil Transparente Calçado De Branco;M2;R$ 164,98;1,00;
1.6;Impressão Digital Com Recorte;M2;R$ 169,99;1,00;
1.7;Impressão Digital Em Vinil Transparente Calçado Com Recorte;M2;R$ 194,96;1,00;
1.8;Impressões Digitais Utilizando Vinil Premium;M2;0;1,00;
2;Vinil E Recorte Eletrônico;;0;;
2.1;Vinil Calandrado Recorte;M2;R$ 160,02;1,00;
2.2;Vinil Calandrado Premium Recorte;M2;R$ 190,00;1,00;
2.3;Vinil Calandrado Importado Recorte;M2;R$ 337,14;1,00;
2.4;Vinil Calandrado Refletivo Recorte;M2;R$ 235,64;1,00;
2.5;Vinil Fotoluminescente Recorte;M2;R$ 1.123,81;0,50;
3;Pintura;M2;R$ 225,02;1,00;
3.1;Pintura;M2;R$ 225,02;1,00;
4;ACM;M2;R$ 253,76;2,50;
4.1;ACM Cores Padrão;M2;R$ 253,76;5,00;
4.2;ACM Cores Especiais;M2;R$ 290,02;5,00;
5;Iluminação LED;;0;;
5.1;LED Fita;ML;R$ 50,75;1,00;
5.2;Módulo LED;M2;R$ 362,52;;
5.3;LED / Soldagem / Fiação;M2;R$ 65,25;;
6;Corte, Usinagem E Matérias-Primas;;;;
6.1;Gabarito De Instalação;M2;R$ 29,00;0,80;
6.2;Corte Router;MINUTO;R$ 217,51;;
6.3;Router ACM;MINUTO;R$ 2,39;;
6.4;Router MDF;MINUTO;R$ 2,39;;
6.5;Acrílico 3mm Padrão;;R$ 543,78;;
6.6;Laser Acrílico;MINUTO;R$ 2,39;;
6.7;Corte Laser Aço;MINUTO;R$ 6,31;;
6.8;Laser Aço;MINUTO;R$ 3,15;;
7;Elétrica, Fixação E Acessórios;;R$ 362,52;0,33;
7.1;Lâmpada Tubular / Fiação;;R$ 362,52;0,33;
7.2;Fita VHB Para Placas E Letreiros;M2;R$ 39,88;;
7.3;Fonte 5A;ML;R$ 108,39;;4,00
7.4;Fonte 10A;ML;R$ 217,15;;8,00
7.5;Fonte 30A;ML;R$ 325,91;;20,00
7.6;Fonte 50A;ML;R$ 471,28;;30,00
7.7;KIT Prolongador (04 Por Kit - 1 Kit Por Placa);PLACA;R$ 36,25;;
7.8;Vidro Temperado 8mm;M2;R$ 797,54;;
7.9;Canaleta De LED;ML;0;;
7.10;Interruptor LD;PLACA;R$ 43,50;;
8;Fachadas Em ACM E Lona;;0;;
8.1;Placa Fachada De ACM Adesivada;;0;;
8.2;Placa Fachada De ACM Com Letra Caixa Em Aço Sem Iluminação;;0;;
8.3;Placa Fachada De ACM Com Letra Caixa Em Aço Com Iluminação;;0;;
8.4;Placa Fachada De ACM Com Letra Caixa Em PVC Sem Iluminação;;0;;
8.5;Placa Fachada De ACM Com Letra Caixa Em PVC Com Iluminação;;0;;
8.6;Placa Fachada De ACM Com Letra Caixa Em Acrílico Com Iluminação;;0;;
8.7;Placa Fachada De ACM Com Letra Caixa Em Acrílico Sem Iluminação;;0;;
8.8;Placa Fachada Lona Front;;0;;
8.9;Placa Fachada Lona Back;;0;;
9;Placas De Sinalização;;0;;
9.1;Placa De Sinalização PVC Adesivado;;0;;
9.2;Placa De Sinalização Acrílico Adesivado;;0;;
9.3;Placa De Sinalização Aço Adesivado;;0;;
9.4;Placa De Sinalização PVC Pintada Com Vinil Recortado;;0;;
9.5;Placa De Sinalização PVC Pintada Com Acrílico Recortado;;0;;
9.6;Placa De Sinalização Acrílico Pintado Com Recorte;;0;;
9.7;Placa De Sinalização Acrílico Pintado Com Acrílico Recortado;;0;;
9.8;Placa De Sinalização Aço Pintado Com Vinil Recortado;;0;;
9.9;Placa De Sinalização Aço Pintado Com Acrílico Recortado;;0;;
9.10;Placa De Sinalização Acrílico Cristal Com Vinil Calçado;;0;;
9.11;Placa De Sinalização Acrílico Cristal Calçado E Recorte;;0;;
9.12;Placa De Sinalização Acrílico Cristal Calçado E Acrílico Recortado;;0;;
9.13;Placa De Sinalização PSAI Com Adesivo;;0;;
9.14;Placa De Sinalização PSAI Com Adesivo E Acrílico Recortado;;0;;
9.15;Placa De Sinalização Vidro Com Adesivo Impresso Calçado;;0;;
9.16;Placa De Sinalização Vidro Com Adesivo Impresso Calçado E Acrílico Recortado;;0;;
9.17;Placa De Sinalização Inox Pintado Com Recorte;;0;;
9.18;Placa De Sinalização Inox Pintado Com Acrílico Recortado;;0;;
9.19;Placa De Sinalização ACM Pintado Com Recorte;;0;;
9.20;Placa De Sinalização ACM Pintado Com Acrílico Recortado;;0;;
9.21;Placa De Sinalização Em ACM Com Vinil Impresso;;0;;
9.22;Placa De Sinalização Em ACM Com Vinil Recortado;;0;;
9.23;Placa De Sinalização Em ACM Com Acrílico Recortado;;0;;
10;Letreiros E Letra Caixa;;0;;
10.1;Letreiro Em Aço Galvanizado Sem Iluminação;;0;;
10.2;Letreiro Em Aço Galvanizado Com Iluminação;;0;;
10.3;Letreiro Em Aço Inox Sem Iluminação;;0;;
10.4;Letreiro Em Aço Inox Com Iluminação;;0;;
10.5;Letreiro Em PVC Expandido Sem Iluminação;;0;;
10.6;Letreiro Em PVC Expandido Com Iluminação;;0;;
10.7;Letreiro Em Acrílico Pintado;;0;;
11;Adesivos, Lonas E Banners;;0;;
11.1;Adesivo Impresso;;0;;
11.2;Adesivo Recorte;;0;;
11.3;Adesivo Impresso Com Recorte;;0;;
11.4;Adesivo Impresso Com Calço;;0;;
11.5;Gravação Laser;;0;;
11.6;Lona Impressa Simples;;0;;
11.7;Lona Impressa Com Acabamento;;0;;
11.8;Banner;;0;;`;

/**
 * Converte string de preço (ex: "R$ 140,01", "140.01", "0", "R$ -") para number ou undefined
 */
export function parseCsvPrice(valStr: string): number | undefined {
  if (!valStr) return undefined;
  const clean = valStr.replace(/R\$/i, '').trim();
  if (!clean || clean === '-' || clean === 'sob consulta') return undefined;

  // Se for "0"
  if (clean === '0' || clean === '0,00' || clean === '0.00') return 0;

  // Trata formato brasileiro (1.123,81 -> 1123.81)
  if (clean.includes(',')) {
    const standardized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(standardized);
    return isNaN(parsed) || parsed < 0 ? undefined : parsed;
  }

  const parsed = parseFloat(clean);
  return isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

/**
 * Converte valor limite (mínimo ou máximo).
 * Zero ou vazio é considerado livre (retorna undefined).
 */
export function parseCsvLimit(limitStr: string): number | undefined {
  if (!limitStr) return undefined;
  const clean = limitStr.replace(/R\$/i, '').trim().replace(',', '.');
  if (!clean) return undefined;
  const val = parseFloat(clean);
  if (isNaN(val) || val <= 0) {
    return undefined; // 0 ou vazio = livre
  }
  return val;
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
  if (upper.includes('MINUTO') || upper.includes('MIN')) {
    return { unit: 'minuto', hasSpecificUnit: true, rawText: 'minuto' };
  }
  if (upper.includes('PLACA')) {
    return { unit: 'placa', hasSpecificUnit: true, rawText: 'placa' };
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

  // Verifica formato do cabeçalho
  let hasCodigoCol = false;
  let startIndex = 0;

  if (lines.length > 0) {
    const firstLine = lines[0].toUpperCase();
    if (firstLine.startsWith('CODIGO') || firstLine.startsWith('CÓDIGO')) {
      hasCodigoCol = true;
      startIndex = 1;
    } else if (firstLine.startsWith('DESCRICAO') || firstLine.startsWith('DESCRIÇÃO')) {
      hasCodigoCol = false;
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const delimiter = line.includes(';') ? ';' : ',';
    const parts = line.split(delimiter).map((p) => p.trim());

    let rawCode = '';
    let rawDesc = '';
    let rawUnit = '';
    let rawPrice = '';
    let rawMin = '';
    let rawMax = '';

    if (hasCodigoCol) {
      rawCode = parts[0] || '';
      rawDesc = parts[1] || '';
      rawUnit = parts[2] || '';
      rawPrice = parts[3] || '';
      rawMin = parts[4] || '';
      rawMax = parts[5] || '';
    } else {
      rawDesc = parts[0] || '';
      rawUnit = parts[1] || '';
      rawPrice = parts[2] || '';
      rawMin = parts[3] || '';
      rawMax = parts[4] || '';
    }

    if (!rawDesc && !rawCode) continue;

    const parsedPrice = parseCsvPrice(rawPrice);
    const parsedUnitInfo = parseCsvUnit(rawUnit);
    const parsedMinimo = parseCsvLimit(rawMin);
    const parsedMaximo = parseCsvLimit(rawMax);

    // Determina se é subitem ou grupo principal
    let isSubItem = false;
    let isGroup = false;
    let grpNum = '';
    let itemCode = '';
    let itemName = rawDesc;

    if (hasCodigoCol && rawCode) {
      if (rawCode.includes('.')) {
        isSubItem = true;
        itemCode = rawCode;
      } else {
        isGroup = true;
        grpNum = rawCode;
      }
    } else {
      // Formato antigo sem coluna CODIGO explícita
      const subItemMatch = rawDesc.match(/^(\d+\.\d+)\.?\s*(.*)$/);
      const groupMatch = !subItemMatch ? rawDesc.match(/^(\d+)\.\s*(.*)$/) : null;

      if (subItemMatch) {
        isSubItem = true;
        itemCode = subItemMatch[1];
        itemName = subItemMatch[2] || rawDesc;
      } else if (groupMatch) {
        isGroup = true;
        grpNum = groupMatch[1];
        itemName = groupMatch[2] || rawDesc;
      }
    }

    if (isGroup) {
      // Salva grupo anterior
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
            minimo: currentGroup.minimo,
            maximo: currentGroup.maximo,
            descricaoSugestao: `Item principal: ${currentGroup.nome}`,
          });
        }
        groups.push(currentGroup);
      }

      subIndexInGroup = 0;
      currentGroup = {
        id: `grp-${grpNum}`,
        code: `${grpNum}.`,
        nome: itemName,
        descricao: `Opções e itens do grupo ${itemName}`,
        defaultUnit: parsedUnitInfo.unit,
        hasSpecificUnit: parsedUnitInfo.hasSpecificUnit,
        rawUnitText: parsedUnitInfo.rawText,
        suggestedPrice: parsedPrice,
        minimo: parsedMinimo,
        maximo: parsedMaximo,
        subItems: [],
      };
      continue;
    }

    // Se é um sub-item
    if (currentGroup) {
      subIndexInGroup++;
      const finalCode = itemCode || `${currentGroup.code.replace('.', '')}.${subIndexInGroup}`;

      currentGroup.subItems.push({
        id: `${currentGroup.id}-sub-${finalCode.replace(/\./g, '_')}-${subIndexInGroup}`,
        code: finalCode,
        nome: itemName,
        defaultUnit: parsedUnitInfo.hasSpecificUnit ? parsedUnitInfo.unit : (currentGroup.defaultUnit || 'm2'),
        hasSpecificUnit: parsedUnitInfo.hasSpecificUnit,
        rawUnitText: parsedUnitInfo.rawText,
        suggestedPrice: parsedPrice !== undefined ? parsedPrice : currentGroup.suggestedPrice,
        minimo: parsedMinimo !== undefined ? parsedMinimo : currentGroup.minimo,
        maximo: parsedMaximo !== undefined ? parsedMaximo : currentGroup.maximo,
        descricaoSugestao: `${currentGroup.nome} - ${itemName}`,
      });
    } else {
      // Caso a primeira linha seja um item sem grupo explícito
      const fallbackGrpId = 'grp-1';
      currentGroup = {
        id: fallbackGrpId,
        code: '1.',
        nome: 'GERAL',
        subItems: [],
      };
      currentGroup.subItems.push({
        id: `${fallbackGrpId}-sub-1`,
        code: itemCode || '1.1',
        nome: itemName,
        defaultUnit: parsedUnitInfo.unit,
        hasSpecificUnit: parsedUnitInfo.hasSpecificUnit,
        rawUnitText: parsedUnitInfo.rawText,
        suggestedPrice: parsedPrice,
        minimo: parsedMinimo,
        maximo: parsedMaximo,
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
        minimo: currentGroup.minimo,
        maximo: currentGroup.maximo,
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
