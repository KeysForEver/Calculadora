import {
  MdfSheetPreset,
  MdfSheetConfig,
  MdfPanelCoveringInput,
  MdfPanelCoveringResult,
  MdfPanelPiece,
  MdfPieceItem,
  MdfPlacedPiece,
  MdfFreeRect,
  MdfOptimizedSheet,
  MdfCuttingPlanResult,
  MdfFitaBorda,
} from '../types/mdf';

export const MDF_SHEET_PRESETS: MdfSheetPreset[] = [
  {
    id: 'padrao-brasil',
    nome: 'Padrão Brasil (Duratex / Arauco / Eucatex) — 2.750 × 1.830 mm',
    larguraMm: 2750,
    alturaMm: 1830,
    espessurasPadrao: [3, 6, 9, 15, 18, 25],
  },
  {
    id: 'padrao-2500',
    nome: 'Padrão 2.500 × 1.830 mm',
    larguraMm: 2500,
    alturaMm: 1830,
    espessurasPadrao: [6, 15, 18],
  },
  {
    id: 'padrao-2440',
    nome: 'Padrão Compensado / Naval — 2.440 × 1.220 mm',
    larguraMm: 2440,
    alturaMm: 1220,
    espessurasPadrao: [6, 10, 15, 18],
  },
];

export const DEFAULT_SHEET_CONFIG: MdfSheetConfig = {
  larguraMm: 2750,
  alturaMm: 1850,
  espessuraMm: 15,
  refiloMm: 10,
  kerfMm: 3,
};

/**
 * Calcula a metragem de fita de borda para uma peça
 */
export function calculatePieceFitaBordaM(
  comprimentoMm: number,
  larguraMm: number,
  tipo: MdfFitaBorda
): number {
  const cM = comprimentoMm / 1000;
  const lM = larguraMm / 1000;

  switch (tipo) {
    case '1C':
      return cM;
    case '2C':
      return 2 * cM;
    case '1L':
      return lM;
    case '2L':
      return 2 * lM;
    case '4L':
      return 2 * (cM + lM);
    case 'nenhuma':
    default:
      return 0;
  }
}

// =========================================================================
// MODO 1: REVESTIMENTO DE PAINEL / FACHADA
// =========================================================================

export function calculatePanelCovering(input: MdfPanelCoveringInput): MdfPanelCoveringResult {
  const { larguraPainelM, alturaPainelM, orientacaoChapa, juntaDilatacaoMm, sheetConfig } = input;

  const painelLarguraMm = Math.round(larguraPainelM * 1000);
  const painelAlturaMm = Math.round(alturaPainelM * 1000);

  // Dimensões úteis da chapa após o refilo
  const chapaBrutaW = sheetConfig.larguraMm;
  const chapaBrutaH = sheetConfig.alturaMm;
  const chapaUtilW = Math.max(100, chapaBrutaW - 2 * sheetConfig.refiloMm);
  const chapaUtilH = Math.max(100, chapaBrutaH - 2 * sheetConfig.refiloMm);

  // Dimensões do módulo de revestimento dependendo da orientação
  const moduloW = orientacaoChapa === 'horizontal' ? chapaUtilW : chapaUtilH;
  const moduloH = orientacaoChapa === 'horizontal' ? chapaUtilH : chapaUtilW;

  const junta = Math.max(0, juntaDilatacaoMm);

  // Calcular número de colunas e linhas
  const colunasCount = Math.ceil(painelLarguraMm / (moduloW + junta));
  const linhasCount = Math.ceil(painelAlturaMm / (moduloH + junta));

  const dimensoesColunasMm: number[] = [];
  let remLargura = painelLarguraMm;
  for (let c = 0; c < colunasCount; c++) {
    const isLastCol = c === colunasCount - 1;
    if (isLastCol) {
      dimensoesColunasMm.push(Math.max(1, remLargura));
    } else {
      dimensoesColunasMm.push(moduloW);
      remLargura -= moduloW + junta;
    }
  }

  const dimensoesLinhasMm: number[] = [];
  let remAltura = painelAlturaMm;
  for (let r = 0; r < linhasCount; r++) {
    const isLastRow = r === linhasCount - 1;
    if (isLastRow) {
      dimensoesLinhasMm.push(Math.max(1, remAltura));
    } else {
      dimensoesLinhasMm.push(moduloH);
      remAltura -= moduloH + junta;
    }
  }

  const piecesGrid: MdfPanelPiece[] = [];
  let chapasInteirasCount = 0;
  let recortesCount = 0;
  const recortesParaCortar: { w: number; h: number }[] = [];

  let currentY = 0;
  for (let r = 0; r < linhasCount; r++) {
    const h = dimensoesLinhasMm[r];
    let currentX = 0;
    for (let c = 0; c < colunasCount; c++) {
      const w = dimensoesColunasMm[c];
      const isFull = Math.abs(w - moduloW) <= 2 && Math.abs(h - moduloH) <= 2;

      if (isFull) {
        chapasInteirasCount++;
      } else {
        recortesCount++;
        recortesParaCortar.push({ w, h });
      }

      piecesGrid.push({
        id: `mdf-p-${r}-${c}`,
        col: c,
        row: r,
        xMm: currentX,
        yMm: currentY,
        larguraMm: w,
        alturaMm: h,
        isFullSheet: isFull,
      });

      currentX += w + junta;
    }
    currentY += h + junta;
  }

  // Otimização de recortes: agrupar recortes em chapas adicionais
  // Converter os recortes em peças para o motor de guilhotina
  let chapasParaRecortes = 0;
  if (recortesParaCortar.length > 0) {
    const piecesInput: MdfPieceItem[] = recortesParaCortar.map((rec, idx) => ({
      id: `recorte-${idx}`,
      descricao: `Recorte ${rec.w}×${rec.h}mm`,
      comprimentoMm: Math.max(rec.w, rec.h),
      larguraMm: Math.min(rec.w, rec.h),
      quantidade: 1,
      fitaBorda: 'nenhuma',
      respeitarVeio: false, // permite girar para caber melhor na chapa
    }));

    const plan = optimizeCuttingPlan(piecesInput, sheetConfig);
    chapasParaRecortes = plan.totalChapas;
  }

  const totalChapasComprar = chapasInteirasCount + chapasParaRecortes;

  const areaTotalPainelM2 = (painelLarguraMm * painelAlturaMm) / 1_000_000;
  const areaChapaBrutaM2 = (chapaBrutaW * chapaBrutaH) / 1_000_000;
  const areaChapaUtilM2 = (chapaUtilW * chapaUtilH) / 1_000_000;
  const areaTotalCompradaM2 = totalChapasComprar * areaChapaBrutaM2;

  const aproveitamentoPercent =
    areaTotalCompradaM2 > 0 ? Math.min(100, (areaTotalPainelM2 / areaTotalCompradaM2) * 100) : 0;
  const areaSobraM2 = Math.max(0, areaTotalCompradaM2 - areaTotalPainelM2);

  // Fitas de acabamento
  const fitaPerimetroM = 2 * (larguraPainelM + alturaPainelM);
  const fitaJuntasM =
    (colunasCount - 1) * alturaPainelM + (linhasCount - 1) * larguraPainelM;

  return {
    areaTotalPainelM2,
    areaChapaBrutaM2,
    areaChapaUtilM2,
    chapasInteirasCount,
    recortesCount,
    totalChapasComprar,
    aproveitamentoPercent,
    areaSobraM2,
    fitaPerimetroM,
    fitaJuntasM,
    piecesGrid,
    colunasCount,
    linhasCount,
    dimensoesColunasMm,
    dimensoesLinhasMm,
  };
}

// =========================================================================
// MODO 2: LISTA DE PEÇAS & PLANO DE CORTE OTIMIZADO (2D BIN PACKING)
// =========================================================================

interface FlattenedPiece {
  id: string;
  originalId: string;
  descricao: string;
  w: number; // comprimento em mm
  h: number; // largura em mm
  fitaBorda: MdfFitaBorda;
  respeitarVeio: boolean;
  area: number;
}

/**
 * Motor de corte 2D Guilhotinado com tolerância para serra (Kerf) e refilo de borda
 */
export function optimizeCuttingPlan(
  pieces: MdfPieceItem[],
  sheetConfig: MdfSheetConfig
): MdfCuttingPlanResult {
  const chapaBrutaW = sheetConfig.larguraMm;
  const chapaBrutaH = sheetConfig.alturaMm;
  const refilo = Math.max(0, sheetConfig.refiloMm);
  const kerf = Math.max(0, sheetConfig.kerfMm);

  const larguraUtilMm = chapaBrutaW - 2 * refilo;
  const alturaUtilMm = chapaBrutaH - 2 * refilo;

  // Flattened list of individual pieces
  const flatPieces: FlattenedPiece[] = [];
  let fitaBordaTotalMetros = 0;
  let areaPecasTotalM2 = 0;

  pieces
    .filter((p) => p.comprimentoMm > 0 && p.larguraMm > 0 && p.quantidade > 0)
    .forEach((p) => {
      const w = p.comprimentoMm;
      const h = p.larguraMm;
      const pieceFita = calculatePieceFitaBordaM(w, h, p.fitaBorda) * p.quantidade;
      fitaBordaTotalMetros += pieceFita;

      const areaM2 = (w * h) / 1_000_000;
      areaPecasTotalM2 += areaM2 * p.quantidade;

      for (let q = 0; q < p.quantidade; q++) {
        flatPieces.push({
          id: `${p.id}-${q + 1}`,
          originalId: p.id,
          descricao: p.descricao || `Peça ${p.id}`,
          w,
          h,
          fitaBorda: p.fitaBorda,
          respeitarVeio: p.respeitarVeio,
          area: w * h,
        });
      }
    });

  // Filtra peças que não cabem nem na chapa inteira
  const oversizedPieces: { piece: MdfPieceItem; remaining: number }[] = [];
  const validPieces: FlattenedPiece[] = [];

  flatPieces.forEach((item) => {
    const fitsNormal = item.w <= larguraUtilMm && item.h <= alturaUtilMm;
    const fitsRotated = !item.respeitarVeio && item.h <= larguraUtilMm && item.w <= alturaUtilMm;

    if (!fitsNormal && !fitsRotated) {
      const orig = pieces.find((p) => p.id === item.originalId);
      if (orig) {
        const existing = oversizedPieces.find((op) => op.piece.id === orig.id);
        if (existing) {
          existing.remaining++;
        } else {
          oversizedPieces.push({ piece: orig, remaining: 1 });
        }
      }
    } else {
      validPieces.push(item);
    }
  });

  // Ordenação decrescente: peças maiores primeiro (Best Fit Decreasing)
  validPieces.sort((a, b) => {
    // 1º critério: maior dimensão
    const maxA = Math.max(a.w, a.h);
    const maxB = Math.max(b.w, b.h);
    if (maxB !== maxA) return maxB - maxA;
    // 2º critério: maior área
    return b.area - a.area;
  });

  const sheets: MdfOptimizedSheet[] = [];
  const unplaced: FlattenedPiece[] = [...validPieces];

  let sheetIndex = 1;

  while (unplaced.length > 0 && sheetIndex <= 50) {
    // Lista de retângulos livres da chapa atual
    let freeRects: MdfFreeRect[] = [
      {
        xMm: 0,
        yMm: 0,
        larguraMm: larguraUtilMm,
        alturaMm: alturaUtilMm,
      },
    ];

    const placedPieces: MdfPlacedPiece[] = [];
    let areaUsadaSheetMm2 = 0;

    // Tentar alocar o máximo de peças nesta chapa
    let pieceIdx = 0;
    while (pieceIdx < unplaced.length) {
      const p = unplaced[pieceIdx];

      let bestScore = Infinity;
      let bestRectIdx = -1;
      let bestRotated = false;
      let bestPlacementW = 0;
      let bestPlacementH = 0;

      // Testar em todos os espaços livres
      for (let rIdx = 0; rIdx < freeRects.length; rIdx++) {
        const rect = freeRects[rIdx];

        // Opção 1: Sem rotação
        if (p.w <= rect.larguraMm && p.h <= rect.alturaMm) {
          const leftoverShort = Math.min(rect.larguraMm - p.w, rect.alturaMm - p.h);
          const score = leftoverShort;
          if (score < bestScore) {
            bestScore = score;
            bestRectIdx = rIdx;
            bestRotated = false;
            bestPlacementW = p.w;
            bestPlacementH = p.h;
          }
        }

        // Opção 2: Com rotação de 90° (se o veio permitir)
        if (!p.respeitarVeio && p.h <= rect.larguraMm && p.w <= rect.alturaMm) {
          const leftoverShort = Math.min(rect.larguraMm - p.h, rect.alturaMm - p.w);
          const score = leftoverShort;
          if (score < bestScore) {
            bestScore = score;
            bestRectIdx = rIdx;
            bestRotated = true;
            bestPlacementW = p.h;
            bestPlacementH = p.w;
          }
        }
      }

      // Se encontrou um espaço adequado
      if (bestRectIdx !== -1) {
        const rect = freeRects[bestRectIdx];
        const pieceW = bestPlacementW;
        const pieceH = bestPlacementH;

        // Registrar peça posicionada
        placedPieces.push({
          pieceId: p.id,
          descricao: p.descricao,
          xMm: rect.xMm,
          yMm: rect.yMm,
          comprimentoMm: pieceW,
          larguraMm: pieceH,
          rotated: bestRotated,
          fitaBorda: p.fitaBorda,
        });

        areaUsadaSheetMm2 += p.area;

        // Guilhotina: dividir o espaço restante considerando o disco de corte (kerf)
        freeRects.splice(bestRectIdx, 1);

        const remW = rect.larguraMm - pieceW - kerf;
        const remH = rect.alturaMm - pieceH - kerf;

        // Decidir o corte de guilhotina (corte horizontal ou vertical baseado no menor desperdício)
        if (remW > 15 && remH > 15) {
          if (pieceW >= pieceH) {
            // Split horizontal primeiro
            freeRects.push({
              xMm: rect.xMm + pieceW + kerf,
              yMm: rect.yMm,
              larguraMm: remW,
              alturaMm: pieceH,
            });
            freeRects.push({
              xMm: rect.xMm,
              yMm: rect.yMm + pieceH + kerf,
              larguraMm: rect.larguraMm,
              alturaMm: remH,
            });
          } else {
            // Split vertical primeiro
            freeRects.push({
              xMm: rect.xMm,
              yMm: rect.yMm + pieceH + kerf,
              larguraMm: pieceW,
              alturaMm: remH,
            });
            freeRects.push({
              xMm: rect.xMm + pieceW + kerf,
              yMm: rect.yMm,
              larguraMm: remW,
              alturaMm: rect.alturaMm,
            });
          }
        } else if (remW > 15) {
          freeRects.push({
            xMm: rect.xMm + pieceW + kerf,
            yMm: rect.yMm,
            larguraMm: remW,
            alturaMm: rect.alturaMm,
          });
        } else if (remH > 15) {
          freeRects.push({
            xMm: rect.xMm,
            yMm: rect.yMm + pieceH + kerf,
            larguraMm: rect.larguraMm,
            alturaMm: remH,
          });
        }

        // Limpar retângulos muito pequenos (menos de 20mm)
        freeRects = freeRects.filter((fr) => fr.larguraMm >= 25 && fr.alturaMm >= 25);

        // Remover peça da fila de pendentes
        unplaced.splice(pieceIdx, 1);
      } else {
        // Tentar próxima peça
        pieceIdx++;
      }
    }

    // Encerrar chapa
    const areaUtilSheetM2 = (larguraUtilMm * alturaUtilMm) / 1_000_000;
    const areaUsadaM2 = areaUsadaSheetMm2 / 1_000_000;
    const aproveitamentoPercent =
      areaUtilSheetM2 > 0 ? Math.min(100, (areaUsadaM2 / areaUtilSheetM2) * 100) : 0;
    const areaSobraM2 = Math.max(0, areaUtilSheetM2 - areaUsadaM2);

    sheets.push({
      sheetIndex,
      larguraUtilMm,
      alturaUtilMm,
      placedPieces,
      freeRects,
      areaUsadaM2,
      aproveitamentoPercent,
      areaSobraM2,
    });

    sheetIndex++;
  }

  const totalChapas = sheets.length;
  const areaChapasCompradasM2 = totalChapas * ((chapaBrutaW * chapaBrutaH) / 1_000_000);
  const aproveitamentoGeralPercent =
    areaChapasCompradasM2 > 0
      ? Math.min(100, (areaPecasTotalM2 / areaChapasCompradasM2) * 100)
      : 0;
  const areaPerdaTotalM2 = Math.max(0, areaChapasCompradasM2 - areaPecasTotalM2);

  // Remaining unplaced
  unplaced.forEach((item) => {
    const orig = pieces.find((p) => p.id === item.originalId);
    if (orig) {
      const existing = oversizedPieces.find((op) => op.piece.id === orig.id);
      if (existing) {
        existing.remaining++;
      } else {
        oversizedPieces.push({ piece: orig, remaining: 1 });
      }
    }
  });

  return {
    sheets,
    totalChapas,
    totalPecasCortadas: validPieces.length - unplaced.length,
    areaPecasTotalM2,
    areaChapasCompradasM2,
    aproveitamentoGeralPercent,
    areaPerdaTotalM2,
    fitaBordaTotalMetros,
    unplacedPieces: oversizedPieces,
  };
}
