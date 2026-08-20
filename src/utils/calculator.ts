export interface ProfileInfo {
  name: string;
  widthM: number;        // width in meters (e.g. 0.05m)
  heightM: number;       // height in meters (e.g. 0.03m)
  faceSizeM: number;     // face in front plane in meters
  depthSizeM: number;    // depth in perpendicular plane in meters
  isSquare: boolean;
  linearWeightKgM: number; // estimated weight per meter in kg/m
  positionDesc: string;
}

export function extractProfileDimensions(perfilStr: string): {
  dim1: number;
  dim2: number;
  isSquare: boolean;
  isValid: boolean;
} {
  if (!perfilStr) return { dim1: 30, dim2: 30, isSquare: true, isValid: false };
  const matches = perfilStr.match(/\d+/g);
  if (!matches || matches.length === 0) {
    return { dim1: 30, dim2: 30, isSquare: true, isValid: false };
  }
  if (matches.length === 1) {
    const d = parseInt(matches[0], 10);
    return { dim1: d, dim2: d, isSquare: true, isValid: d > 0 };
  }
  const d1 = parseInt(matches[0], 10);
  const d2 = parseInt(matches[1], 10);
  return {
    dim1: d1,
    dim2: d2,
    isSquare: d1 === d2,
    isValid: d1 > 0 && d2 > 0,
  };
}

export function parseProfileInfo(
  perfilStr: string,
  faceEscolhidaMm?: number,
  profundidadeEscolhidaMm?: number
): ProfileInfo {
  const dims = extractProfileDimensions(perfilStr);
  const wMm = dims.dim1;
  const hMm = dims.dim2;
  const isSquare = dims.isSquare;

  let chosenFaceMm = faceEscolhidaMm;
  let chosenDepthMm = profundidadeEscolhidaMm;

  if (isSquare) {
    chosenFaceMm = wMm;
    chosenDepthMm = hMm;
  } else if (!chosenFaceMm) {
    // Default to first dimension if not explicitly set
    chosenFaceMm = wMm;
    chosenDepthMm = hMm;
  } else if (!chosenDepthMm) {
    chosenDepthMm = chosenFaceMm === wMm ? hMm : wMm;
  }

  const faceSizeM = chosenFaceMm / 1000;
  const depthSizeM = chosenDepthMm / 1000;
  const perimeterMm = 2 * (wMm + hMm);
  const linearWeightKgM = Number((perimeterMm * 0.0105).toFixed(2));

  const positionDesc = isSquare
    ? `Perfil Quadrado (${wMm} × ${hMm} mm)`
    : `Face ${chosenFaceMm} mm (Frente) × ${chosenDepthMm} mm (Profundidade)`;

  return {
    name: perfilStr,
    widthM: wMm / 1000,
    heightM: hMm / 1000,
    faceSizeM,
    depthSizeM,
    isSquare,
    linearWeightKgM: Math.max(linearWeightKgM, 0.5),
    positionDesc,
  };
}

export interface PieceToCut {
  type: 'Horizontal' | 'Vertical';
  length: number;
  description: string;
}

export interface BarSegmentMapping {
  barNumber: number;
  length: number;
  startM: number;
  endM: number;
  barLabel: string;
}

export interface StructuralElementMapping {
  id: string;
  type: 'Horizontal' | 'Vertical';
  index: number;
  label: string;
  subLabel: string;
  totalLength: number;
  segments: BarSegmentMapping[];
  allBarNumbers: number[];
  barNumbersSummary: string;
  barNumbersFull: string;
}

export interface AllocatedBar {
  id: number;
  remainingLength: number;
  usedLength: number;
  pieces: PieceToCut[];
}

export function optimizeWholePiecesPlan(inputPieces: PieceToCut[]) {
  const wholeItems: PieceToCut[] = [];
  let longBarsCount = 0;

  for (const piece of inputPieces) {
    if (piece.length > 6.0) {
      longBarsCount += Math.ceil(piece.length / 6.0);
    } else {
      wholeItems.push(piece);
    }
  }

  wholeItems.sort((a, b) => b.length - a.length);

  const allocatedBars: AllocatedBar[] = [];

  for (const piece of wholeItems) {
    let placed = false;
    for (const bar of allocatedBars) {
      if (bar.remainingLength >= piece.length - 0.001) {
        bar.pieces.push(piece);
        bar.usedLength = Number((bar.usedLength + piece.length).toFixed(3));
        bar.remainingLength = Number((6.0 - bar.usedLength).toFixed(3));
        placed = true;
        break;
      }
    }
    if (!placed) {
      allocatedBars.push({
        id: allocatedBars.length + 1,
        remainingLength: Number((6.0 - piece.length).toFixed(3)),
        usedLength: piece.length,
        pieces: [piece],
      });
    }
  }

  return {
    totalBars: longBarsCount + allocatedBars.length,
    allocatedBars,
  };
}

export interface SplicedStructuralPlanResult {
  totalBars: number;
  totalWelds: number;
  allocatedBars: {
    barNumber: number;
    profileName: string;
    initialLength: number;
    usedLength: number;
    remainingLength: number;
    pieces: PieceToCut[];
  }[];
}

/**
 * Intelligent Structural Cutting & Splicing Engine for Metalon (Scenario 3 - Definitivo)
 * Prioritizes cutting whole vertical columns to preserve load-bearing strength,
 * and systematically recombines all resulting offcuts to construct horizontal lines.
 */
export function optimizeStructuralPlanWithSplicing(params: {
  profileName: string;
  horizontalCount: number;
  horizontalLength: number;
  verticalCount: number;
  verticalLength: number;
  startBarIndex?: number;
}): SplicedStructuralPlanResult {
  const { profileName, horizontalCount, horizontalLength, verticalCount, verticalLength } = params;
  const startIdx = params.startBarIndex || 1;

  interface InternalBar {
    barNumber: number;
    profileName: string;
    initialLength: number;
    usedLength: number;
    remainingLength: number;
    pieces: PieceToCut[];
  }

  const bars: InternalBar[] = [];

  // Step 1: Allocate vertical columns (whole cuts where possible)
  if (verticalLength <= 6.0 && verticalCount > 0) {
    for (let j = 1; j <= verticalCount; j++) {
      let placed = false;
      for (const bar of bars) {
        if (bar.remainingLength >= verticalLength - 0.001) {
          bar.pieces.push({
            type: 'Vertical',
            length: verticalLength,
            description: `1x Coluna Vert. ${j} (${verticalLength.toFixed(2).replace('.', ',')} m)`,
          });
          bar.usedLength = Number((bar.usedLength + verticalLength).toFixed(3));
          bar.remainingLength = Number((6.0 - bar.usedLength).toFixed(3));
          placed = true;
          break;
        }
      }
      if (!placed) {
        const newBarNum = startIdx + bars.length;
        bars.push({
          barNumber: newBarNum,
          profileName,
          initialLength: 6.0,
          usedLength: verticalLength,
          remainingLength: Number((6.0 - verticalLength).toFixed(3)),
          pieces: [
            {
              type: 'Vertical',
              length: verticalLength,
              description: `1x Coluna Vert. ${j} (${verticalLength.toFixed(2).replace('.', ',')} m)`,
            },
          ],
        });
      }
    }
  } else if (verticalLength > 6.0 && verticalCount > 0) {
    // For very tall structures (>6m), vertical columns also require splicing
    for (let j = 1; j <= verticalCount; j++) {
      let vertRem = verticalLength;
      while (vertRem > 0.001) {
        const cut = Number(Math.min(6.0, vertRem).toFixed(3));
        const newBarNum = startIdx + bars.length;
        bars.push({
          barNumber: newBarNum,
          profileName,
          initialLength: 6.0,
          usedLength: cut,
          remainingLength: Number((6.0 - cut).toFixed(3)),
          pieces: [
            {
              type: 'Vertical',
              length: cut,
              description: `1x Coluna Vert. ${j} (Trecho ${cut.toFixed(2).replace('.', ',')} m)`,
            },
          ],
        });
        vertRem = Number((vertRem - cut).toFixed(3));
      }
    }
  }

  // Step 2: Allocate horizontal lines using full 6m bars + offcuts from existing bars
  for (let i = 1; i <= horizontalCount; i++) {
    let needed = horizontalLength;

    // Use full 6m bars for 6m segments if project demand warrants it
    while (needed >= 6.0) {
      const newBarNum = startIdx + bars.length;
      bars.push({
        barNumber: newBarNum,
        profileName,
        initialLength: 6.0,
        usedLength: 6.0,
        remainingLength: 0.0,
        pieces: [
          {
            type: 'Horizontal',
            length: 6.0,
            description: `1x Linha Horiz. ${i} (Trecho Inteiro 6,00 m)`,
          },
        ],
      });
      needed = Number((needed - 6.0).toFixed(3));
    }

    // Fulfill remaining length by reusing offcuts from existing bars first
    while (needed > 0.001) {
      // Find largest available offcut in existing bars (>= 5cm)
      const availableOffcutBars = bars
        .filter((b) => b.remainingLength >= 0.049)
        .sort((a, b) => b.remainingLength - a.remainingLength);

      if (availableOffcutBars.length > 0) {
        const targetBar = availableOffcutBars[0];
        const cutLen = Number(Math.min(targetBar.remainingLength, needed).toFixed(3));
        targetBar.pieces.push({
          type: 'Horizontal',
          length: cutLen,
          description: `1x Linha Horiz. ${i} (Trecho Emenda ${cutLen.toFixed(2).replace('.', ',')} m)`,
        });
        targetBar.usedLength = Number((targetBar.usedLength + cutLen).toFixed(3));
        targetBar.remainingLength = Number((6.0 - targetBar.usedLength).toFixed(3));
        needed = Number((needed - cutLen).toFixed(3));
      } else {
        // No offcuts available, open a new 6m bar
        const newBarNum = startIdx + bars.length;
        const cutLen = Number(Math.min(6.0, needed).toFixed(3));
        bars.push({
          barNumber: newBarNum,
          profileName,
          initialLength: 6.0,
          usedLength: cutLen,
          remainingLength: Number((6.0 - cutLen).toFixed(3)),
          pieces: [
            {
              type: 'Horizontal',
              length: cutLen,
              description:
                cutLen >= 5.999
                  ? `1x Linha Horiz. ${i} (Trecho Inteiro 6,00 m)`
                  : `1x Linha Horiz. ${i} (Trecho Emenda ${cutLen.toFixed(2).replace('.', ',')} m)`,
            },
          ],
        });
        needed = Number((needed - cutLen).toFixed(3));
      }
    }
  }

  // Sort bars sequentially by barNumber
  bars.sort((a, b) => a.barNumber - b.barNumber);

  // Calculate total splice welds in Scenario 3
  let totalSpliceWelds = 0;
  for (let i = 1; i <= horizontalCount; i++) {
    let segmentCount = 0;
    for (const b of bars) {
      for (const p of b.pieces) {
        if (p.type === 'Horizontal' && p.description.includes(`Linha Horiz. ${i}`)) {
          segmentCount++;
        }
      }
    }
    if (segmentCount > 1) {
      totalSpliceWelds += segmentCount - 1;
    }
  }

  for (let j = 1; j <= verticalCount; j++) {
    let segmentCount = 0;
    for (const b of bars) {
      for (const p of b.pieces) {
        if (p.type === 'Vertical' && p.description.includes(`Coluna Vert. ${j}`)) {
          segmentCount++;
        }
      }
    }
    if (segmentCount > 1) {
      totalSpliceWelds += segmentCount - 1;
    }
  }

  return {
    totalBars: bars.length,
    totalWelds: totalSpliceWelds,
    allocatedBars: bars,
  };
}

export interface CalculationResult {
  largura: number;
  altura: number;
  profileExt: ProfileInfo;
  profileInt: ProfileInfo;
  isSameProfile: boolean;
  vaoHorizM: number;
  vaoVertM: number;
  vaoMaxHorizCm: number;
  vaoMaxVertCm: number;
  vaosVerticais: number;
  linhasHorizontais: number;
  vaoLivreVert: number;
  vaosHorizontais: number;
  colunasVerticais: number;
  vaoLivreHoriz: number;
  vertCutLength: number;
  horizExtCount: number;
  horizIntCount: number;
  vertExtCount: number;
  vertIntCount: number;
  metragemExtHoriz: number;
  metragemExtVert: number;
  metragemExtTotal: number;
  metragemIntHoriz: number;
  metragemIntVert: number;
  metragemIntTotal: number;
  totalMetragemLinear: number;
  teoricoBarrasGeral: string;
  totalSemEmendaSemOpt: number;
  totalSemEmendaComOpt: number;
  totalComEmendaComOpt: number;
  extScenario1: number;
  extScenario2: number;
  extScenario3: number;
  intScenario1: number;
  intScenario2: number;
  intScenario3: number;
  weldsCountScenario1: number;
  weldsCountScenario2: number;
  weldsCountScenario3: number;
  barsSavedScenario3: number;
  allocatedBarsDetailed: {
    barNumber: number;
    profileName: string;
    initialLength: number;
    usedLength: number;
    remainingLength: number;
    pieces: PieceToCut[];
  }[];
  horizontalElements: StructuralElementMapping[];
  verticalElements: StructuralElementMapping[];
}

function buildElementsMapping(params: {
  isSameProfile: boolean;
  largura: number;
  vertCutLength: number;
  linhasHorizontais: number;
  colunasVerticais: number;
  allocatedBarsDetailed: {
    barNumber: number;
    profileName: string;
    initialLength: number;
    usedLength: number;
    remainingLength: number;
    pieces: PieceToCut[];
  }[];
}): {
  horizontalElements: StructuralElementMapping[];
  verticalElements: StructuralElementMapping[];
} {
  const { isSameProfile, largura, vertCutLength, linhasHorizontais, colunasVerticais, allocatedBarsDetailed } = params;

  const horizontalElements: StructuralElementMapping[] = [];
  const verticalElements: StructuralElementMapping[] = [];

  // 1. Horizontal Elements (Lines)
  for (let i = 1; i <= linhasHorizontais; i++) {
    const isTop = i === 1;
    const isBottom = i === linhasHorizontais;
    const subLabel = isTop ? 'Borda Superior' : isBottom ? 'Borda Inferior' : 'Travessa Interna';

    const targetDescs = isSameProfile
      ? [`Linha Horiz. ${i}`, `Linha Horiz ${i}`, `Linha ${i}`]
      : (isTop
          ? ['Horiz. Borda 1', 'Linha Horiz. 1']
          : (isBottom
              ? ['Horiz. Borda 2', `Linha Horiz. ${linhasHorizontais}`]
              : [`Horiz. Interna ${i - 1}`, `Linha Horiz. ${i}`]));

    const segments: BarSegmentMapping[] = [];
    let currentOffset = 0;

    for (const bar of allocatedBarsDetailed) {
      for (const p of bar.pieces) {
        const matches = targetDescs.some(d => p.description.includes(d));
        if (matches) {
          const pieceLen = p.length;
          segments.push({
            barNumber: bar.barNumber,
            length: pieceLen,
            startM: Number(currentOffset.toFixed(3)),
            endM: Number((currentOffset + pieceLen).toFixed(3)),
            barLabel: `Barra ${String(bar.barNumber).padStart(2, '0')}`,
          });
          currentOffset += pieceLen;
        }
      }
    }

    segments.sort((a, b) => a.startM - b.startM);

    const allBarNumbers = Array.from(new Set(segments.map(s => s.barNumber)));
    const barNumbersSummary = allBarNumbers.map(n => `B${String(n).padStart(2, '0')}`).join(', ');
    const barNumbersFull = allBarNumbers.map(n => `Barra ${String(n).padStart(2, '0')}`).join(allBarNumbers.length > 2 ? ', ' : ' e ');

    horizontalElements.push({
      id: `h-line-${i}`,
      type: 'Horizontal',
      index: i,
      label: `Linha ${i}`,
      subLabel,
      totalLength: largura,
      segments,
      allBarNumbers,
      barNumbersSummary: barNumbersSummary || `B01`,
      barNumbersFull: barNumbersFull || `Barra 01`,
    });
  }

  // 2. Vertical Elements (Columns)
  for (let j = 1; j <= colunasVerticais; j++) {
    const isLeft = j === 1;
    const isRight = j === colunasVerticais;
    const subLabel = isLeft ? 'Borda Esquerda' : isRight ? 'Borda Direita' : 'Montante Interno';

    const targetDescs = isSameProfile
      ? [`Coluna Vert. ${j}`, `Coluna Vert ${j}`, `Coluna ${j}`]
      : (isLeft
          ? ['Vert. Borda 1', 'Coluna Vert. 1']
          : (isRight
              ? ['Vert. Borda 2', `Coluna Vert. ${colunasVerticais}`]
              : [`Vert. Interna ${j - 1}`, `Coluna Vert. ${j}`]));

    const segments: BarSegmentMapping[] = [];
    let currentOffset = 0;

    for (const bar of allocatedBarsDetailed) {
      for (const p of bar.pieces) {
        const matches = targetDescs.some(d => p.description.includes(d));
        if (matches) {
          const pieceLen = p.length;
          segments.push({
            barNumber: bar.barNumber,
            length: pieceLen,
            startM: Number(currentOffset.toFixed(3)),
            endM: Number((currentOffset + pieceLen).toFixed(3)),
            barLabel: `Barra ${String(bar.barNumber).padStart(2, '0')}`,
          });
          currentOffset += pieceLen;
        }
      }
    }

    segments.sort((a, b) => a.startM - b.startM);

    const allBarNumbers = Array.from(new Set(segments.map(s => s.barNumber)));
    const barNumbersSummary = allBarNumbers.map(n => `B${String(n).padStart(2, '0')}`).join(', ');
    const barNumbersFull = allBarNumbers.map(n => `Barra ${String(n).padStart(2, '0')}`).join(allBarNumbers.length > 2 ? ', ' : ' e ');

    verticalElements.push({
      id: `v-col-${j}`,
      type: 'Vertical',
      index: j,
      label: `Coluna ${j}`,
      subLabel,
      totalLength: vertCutLength,
      segments,
      allBarNumbers,
      barNumbersSummary: barNumbersSummary || `B01`,
      barNumbersFull: barNumbersFull || `Barra 01`,
    });
  }

  return { horizontalElements, verticalElements };
}

export function calculateMetalonStructure(params: {
  largura: number;
  altura: number;
  perfilExterno?: string;
  perfilInterno?: string;
  perfil?: string;
  vaoMaxHoriz?: number;
  vaoMaxVert?: number;
  vaoMaximo?: number;
  faceExternoMm?: number;
  profundidadeExternoMm?: number;
  faceInternoMm?: number;
  profundidadeInternoMm?: number;
}): CalculationResult {
  const {
    largura,
    altura,
    perfilExterno,
    perfilInterno,
    perfil,
    vaoMaxHoriz,
    vaoMaxVert,
    vaoMaximo,
    faceExternoMm,
    profundidadeExternoMm,
    faceInternoMm,
    profundidadeInternoMm,
  } = params;

  const extStr = perfilExterno || perfil || '30 x 30 mm';
  const intStr = perfilInterno || perfilExterno || perfil || '30 x 30 mm';

  const profileExt = parseProfileInfo(extStr, faceExternoMm, profundidadeExternoMm);
  const profileInt = parseProfileInfo(intStr, faceInternoMm, profundidadeInternoMm);

  const isSameProfile =
    profileExt.name.toLowerCase().replace(/\s+/g, '') === profileInt.name.toLowerCase().replace(/\s+/g, '') &&
    profileExt.faceSizeM === profileInt.faceSizeM;

  const vaoMaxHorizCm = vaoMaxHoriz || vaoMaximo || 80;
  const vaoMaxVertCm = vaoMaxVert || vaoMaximo || 80;
  const vaoHorizM = vaoMaxHorizCm / 100;
  const vaoVertM = vaoMaxVertCm / 100;

  // Vertical cut length = altura - 2 * profileExt.faceSizeM
  const vertCutLength = Number(Math.max(0.1, altura - 2 * profileExt.faceSizeM).toFixed(3));

  // Spans & lines calculation
  const vaosVerticais =
    Math.ceil((altura - profileExt.faceSizeM) / (vaoVertM + profileInt.faceSizeM)) || Math.ceil(altura / vaoVertM) || 1;
  const linhasHorizontais = vaosVerticais + 1;
  const vaoLivreVert = Number(
    ((altura - 2 * profileExt.faceSizeM - Math.max(0, linhasHorizontais - 2) * profileInt.faceSizeM) / vaosVerticais).toFixed(3)
  );

  const vaosHorizontais =
    Math.ceil((largura - profileExt.faceSizeM) / (vaoHorizM + profileInt.faceSizeM)) || Math.ceil(largura / vaoHorizM) || 1;
  const colunasVerticais = vaosHorizontais + 1;
  const vaoLivreHoriz = Number(
    ((largura - 2 * profileExt.faceSizeM - Math.max(0, colunasVerticais - 2) * profileInt.faceSizeM) / vaosHorizontais).toFixed(3)
  );

  // Quantities
  const horizExtCount = Math.min(2, linhasHorizontais);
  const horizIntCount = Math.max(0, linhasHorizontais - 2);

  const vertExtCount = Math.min(2, colunasVerticais);
  const vertIntCount = Math.max(0, colunasVerticais - 2);

  // Linear metrage
  const metragemExtHoriz = Number((horizExtCount * largura).toFixed(2));
  const metragemExtVert = Number((vertExtCount * vertCutLength).toFixed(2));
  const metragemExtTotal = Number((metragemExtHoriz + metragemExtVert).toFixed(2));

  const metragemIntHoriz = Number((horizIntCount * largura).toFixed(2));
  const metragemIntVert = Number((vertIntCount * vertCutLength).toFixed(2));
  const metragemIntTotal = Number((metragemIntHoriz + metragemIntVert).toFixed(2));

  const totalMetragemLinear = Number((metragemExtTotal + metragemIntTotal).toFixed(2));
  const teoricoBarrasGeral = (totalMetragemLinear / 6.0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let totalSemEmendaSemOpt = 0;
  let totalSemEmendaComOpt = 0;
  let totalComEmendaComOpt = 0;
  let weldsCountScenario3 = 0;

  let extScenario1 = 0, extScenario2 = 0, extScenario3 = 0;
  let intScenario1 = 0, intScenario2 = 0, intScenario3 = 0;

  const allocatedBarsDetailed: {
    barNumber: number;
    profileName: string;
    initialLength: number;
    usedLength: number;
    remainingLength: number;
    pieces: PieceToCut[];
  }[] = [];

  let currentBarIndex = 1;

  if (isSameProfile) {
    // Scenario 1: Sem Emenda & Sem Otimização (Referência Comparativa - Alto Desperdício)
    totalSemEmendaSemOpt =
      linhasHorizontais * Math.ceil(largura / 6.0) + colunasVerticais * Math.ceil(vertCutLength / 6.0);

    // Scenario 2: Sem Emenda & Com Otimização de Peças Inteiras (Referência Comparativa - Sem Reaproveitamento de Sobras)
    const piecesPerBarVert = Math.max(1, Math.floor(6.0 / vertCutLength));
    totalSemEmendaComOpt =
      linhasHorizontais * Math.ceil(largura / 6.0) + Math.ceil(colunasVerticais / piecesPerBarVert);

    // Scenario 3: Com Emenda e Otimização Total (DEFINITIVO / OFICIAL DE PRODUÇÃO - Economia Máxima)
    const optSpliceResult = optimizeStructuralPlanWithSplicing({
      profileName: profileExt.name,
      horizontalCount: linhasHorizontais,
      horizontalLength: largura,
      verticalCount: colunasVerticais,
      verticalLength: vertCutLength,
      startBarIndex: 1,
    });

    totalComEmendaComOpt = optSpliceResult.totalBars;
    allocatedBarsDetailed.push(...optSpliceResult.allocatedBars);
    weldsCountScenario3 = optSpliceResult.totalWelds;
  } else {
    // External profile scenarios
    extScenario1 = horizExtCount * Math.ceil(largura / 6.0) + vertExtCount * Math.ceil(vertCutLength / 6.0);
    const extPiecesPerBar = Math.max(1, Math.floor(6.0 / vertCutLength));
    extScenario2 = horizExtCount * Math.ceil(largura / 6.0) + Math.ceil(vertExtCount / extPiecesPerBar);
    const optExtResult = optimizeStructuralPlanWithSplicing({
      profileName: `${profileExt.name} (Borda)`,
      horizontalCount: horizExtCount,
      horizontalLength: largura,
      verticalCount: vertExtCount,
      verticalLength: vertCutLength,
      startBarIndex: 1,
    });
    extScenario3 = optExtResult.totalBars;

    // Internal profile scenarios
    intScenario1 = horizIntCount * Math.ceil(largura / 6.0) + vertIntCount * Math.ceil(vertCutLength / 6.0);
    const intPiecesPerBar = Math.max(1, Math.floor(6.0 / vertCutLength));
    intScenario2 = horizIntCount * Math.ceil(largura / 6.0) + Math.ceil(vertIntCount / intPiecesPerBar);
    const optIntResult = optimizeStructuralPlanWithSplicing({
      profileName: `${profileInt.name} (Interno)`,
      horizontalCount: horizIntCount,
      horizontalLength: largura,
      verticalCount: vertIntCount,
      verticalLength: vertCutLength,
      startBarIndex: optExtResult.totalBars + 1,
    });
    intScenario3 = optIntResult.totalBars;

    totalSemEmendaSemOpt = extScenario1 + intScenario1;
    totalSemEmendaComOpt = extScenario2 + intScenario2;
    totalComEmendaComOpt = extScenario3 + intScenario3;

    allocatedBarsDetailed.push(...optExtResult.allocatedBars, ...optIntResult.allocatedBars);
    weldsCountScenario3 = optExtResult.totalWelds + optIntResult.totalWelds;
  }

  // Welds & Splices calculations for Scenarios 1 & 2
  const horizSplicesPerPiece = Math.floor(largura / 6.0);
  const vertSplicesPerPiece = Math.floor(vertCutLength / 6.0);
  const baseLongPieceWelds = linhasHorizontais * horizSplicesPerPiece + colunasVerticais * vertSplicesPerPiece;

  const weldsCountScenario1 = baseLongPieceWelds;
  const weldsCountScenario2 = baseLongPieceWelds;

  const barsSavedScenario3 = Math.max(0, totalSemEmendaComOpt - totalComEmendaComOpt);

  const { horizontalElements, verticalElements } = buildElementsMapping({
    isSameProfile,
    largura,
    vertCutLength,
    linhasHorizontais,
    colunasVerticais,
    allocatedBarsDetailed,
  });

  return {
    largura,
    altura,
    profileExt,
    profileInt,
    isSameProfile,
    vaoHorizM,
    vaoVertM,
    vaoMaxHorizCm,
    vaoMaxVertCm,
    vaosVerticais,
    linhasHorizontais,
    vaoLivreVert,
    vaosHorizontais,
    colunasVerticais,
    vaoLivreHoriz,
    vertCutLength,
    horizExtCount,
    horizIntCount,
    vertExtCount,
    vertIntCount,
    metragemExtHoriz,
    metragemExtVert,
    metragemExtTotal,
    metragemIntHoriz,
    metragemIntVert,
    metragemIntTotal,
    totalMetragemLinear,
    teoricoBarrasGeral,
    totalSemEmendaSemOpt,
    totalSemEmendaComOpt,
    totalComEmendaComOpt,
    extScenario1,
    extScenario2,
    extScenario3,
    intScenario1,
    intScenario2,
    intScenario3,
    weldsCountScenario1,
    weldsCountScenario2,
    weldsCountScenario3,
    barsSavedScenario3,
    allocatedBarsDetailed,
    horizontalElements,
    verticalElements,
  };
}

export function getPortugueseDate(): string {
  const date = new Date();
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export const TABLE_ROWS_PER_PAGE = 24;

export function generateReportMarkdown(
  largura: number,
  altura: number,
  perfilExtStr: string,
  perfilIntStr: string,
  vaoMaxHorizCm: number = 80,
  vaoMaxVertCm: number = 80,
  faceExtMm?: number,
  profExtMm?: number,
  faceIntMm?: number,
  profIntMm?: number
): string {
  const calc = calculateMetalonStructure({
    largura,
    altura,
    perfilExterno: perfilExtStr,
    perfilInterno: perfilIntStr,
    vaoMaxHoriz: vaoMaxHorizCm,
    vaoMaxVert: vaoMaxVertCm,
    faceExternoMm: faceExtMm,
    profundidadeExternoMm: profExtMm,
    faceInternoMm: faceIntMm,
    profundidadeInternoMm: profIntMm,
  });

  const {
    profileExt,
    profileInt,
    isSameProfile,
    linhasHorizontais,
    vaosVerticais,
    vaoLivreVert,
    colunasVerticais,
    vaosHorizontais,
    vaoLivreHoriz,
    vertCutLength,
    horizExtCount,
    horizIntCount,
    vertExtCount,
    vertIntCount,
    metragemExtHoriz,
    metragemExtVert,
    metragemExtTotal,
    metragemIntHoriz,
    metragemIntVert,
    metragemIntTotal,
    totalMetragemLinear,
    teoricoBarrasGeral,
    totalSemEmendaSemOpt,
    totalSemEmendaComOpt,
    totalComEmendaComOpt,
    extScenario1,
    extScenario2,
    extScenario3,
    intScenario1,
    intScenario2,
    intScenario3,
    weldsCountScenario1,
    weldsCountScenario2,
    weldsCountScenario3,
  } = calc;

  const extFaceMm = (profileExt.faceSizeM * 1000).toFixed(0);
  const widthFormatted = largura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let planoDeCorteTexto = '';

  if (isSameProfile) {
    planoDeCorteTexto = `### Memória de Cálculo e Lógica de Otimização (Cenário Otimizado Definitivo)

- **Demanda Linear e Consumo Teórico:**
  - **Metragem Linear Total:** ${totalMetragemLinear.toLocaleString('pt-BR')} m (${linhasHorizontais} linhas horizontais de ${widthFormatted} m + ${colunasVerticais} colunas verticais de ${vertCutLength.toLocaleString('pt-BR')} m).
  - **Consumo Teórico Mínimo:** ${teoricoBarrasGeral} barras comerciais de 6,00 m (${(totalComEmendaComOpt * 6.0).toLocaleString('pt-BR')} m de material disponível no lote de **${totalComEmendaComOpt} barras**).

- **Estratégia de Engenharia de Corte e Reaproveitamento de Sobras:**
  - As ${colunasVerticais} colunas verticais (${vertCutLength.toLocaleString('pt-BR')} m) são cortadas em peças integrais preservando 100% da resistência mecânica aos esforços verticais.
  - O estoque de retalhos gerado pelo corte das colunas é reaproveitado na confecção das ${linhasHorizontais} linhas horizontais (${widthFormatted} m), eliminando o desperdício de pontas e reduzindo a compra total para exatamente **${totalComEmendaComOpt} barras de 6,00 m**.
  - O plano de corte peça a peça está detalhado na **Tabela de Corte de Barras para a Produção (Seção 7)**.

- **Definição de Cenários (Comparativo vs. Definitivo):**
  - **Cenários 1 e 2 (Apenas Referências Comparativas):** Representam métodos de corte sem reaproveitamento integral de sobras (${totalSemEmendaComOpt} barras), gerando sobras ociosas.
  - **Cenário 3 (Definitivo / Oficial de Produção):** Otimização completa com reaproveitamento de retalhos (**${totalComEmendaComOpt} barras de 6,00 m**), proporcionando economia máxima de material.`;
  } else {
    const teoricoExt = (metragemExtTotal / 6.0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const teoricoInt = (metragemIntTotal / 6.0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    planoDeCorteTexto = `### Memória de Cálculo e Lógica de Otimização (Cenário Otimizado Definitivo)

- **Demanda Linear por Perfil:**
  - **Perfil Externo (${profileExt.name}):** ${metragemExtTotal.toLocaleString('pt-BR')} m (${horizExtCount} linhas de ${widthFormatted} m + ${vertExtCount} colunas de ${vertCutLength.toLocaleString('pt-BR')} m) -> Consumo: **${extScenario3} barras de 6m** (Teórico: ${teoricoExt}).
  - **Perfil Interno (${profileInt.name}):** ${metragemIntTotal.toLocaleString('pt-BR')} m (${horizIntCount} linhas de ${widthFormatted} m + ${vertIntCount} colunas de ${vertCutLength.toLocaleString('pt-BR')} m) -> Consumo: **${intScenario3} barras de 6m** (Teórico: ${teoricoInt}).

- **Estratégia de Engenharia de Corte e Reaproveitamento:**
  - Cortes segregados por bitola de perfil para garantir conformidade dimensional.
  - As sobras das colunas são recombinadas nas travessas do respectivo perfil, totalizando exatamente **${totalComEmendaComOpt} barras de 6,00 m**.

- **Definição de Cenários (Comparativo vs. Definitivo):**
  - **Cenários 1 e 2:** Referências comparativas de compra com descarte de retalhos (${totalSemEmendaComOpt} barras).
  - **Cenário 3 (Definitivo / Oficial de Produção):** Otimização total com reaproveitamento de sobras (**${totalComEmendaComOpt} barras**).`;
  }

  return `## 1. Estrutura Horizontal
* Linhas Horizontais Totais: **${linhasHorizontais} linhas** (${vaosVerticais} vãos de **${vaoLivreVert.toLocaleString('pt-BR')} m** de vão livre)
* Linhas de Borda Externa (${profileExt.name}): **${horizExtCount} linhas** de **${widthFormatted} m** = **${metragemExtHoriz.toLocaleString('pt-BR')} m**
${horizIntCount > 0 ? `* Linhas Internas (${profileInt.name}): **${horizIntCount} linhas** de **${widthFormatted} m** = **${metragemIntHoriz.toLocaleString('pt-BR')} m**\n` : ''}
---

## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
* Colunas Verticais Totais: **${colunasVerticais} colunas** (${vaosHorizontais} vãos de **${vaoLivreHoriz.toLocaleString('pt-BR')} m** de vão livre)
* **Comprimento real de corte por coluna:** **${vertCutLength.toLocaleString('pt-BR')} m** (com desconto de 2× ${extFaceMm} mm dos perfis de contorno)
* Colunas de Borda Externa (${profileExt.name}): **${vertExtCount} colunas** = **${metragemExtVert.toLocaleString('pt-BR')} m**
${vertIntCount > 0 ? `* Colunas Internas (${profileInt.name}): **${vertIntCount} colunas** = **${metragemIntVert.toLocaleString('pt-BR')} m**\n` : ''}
---

## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
${planoDeCorteTexto}

---

## 4. Resultado e Quadro Comparativo de Consumo

${
  isSameProfile
    ? `| Cenário / Método de Corte | Pontos de Solda / Emendas | Total de Barras (6m) |
| :------------------------ | :-----------------------: | :------------------: |
| **Cenário 1: "Sem Emenda e Sem Otimização" (Comparativo)** | ${weldsCountScenario1} solda(s) | **${totalSemEmendaSemOpt} barras** |
| **Cenário 2: "Sem Emenda com Otimização de Corte" (Comparativo)** | ${weldsCountScenario2} solda(s) | **${totalSemEmendaComOpt} barras** |
| **Cenário 3: "Com Emenda e Otimização Total" (DEFINITIVO - Produção)** | ${weldsCountScenario3} solda(s) | **${totalComEmendaComOpt} barras** |`
    : `| Cenário / Método de Corte | Perfil Externo (${profileExt.name}) | Perfil Interno (${profileInt.name}) | Total de Barras (6m) |
| :------------------------ | :---------------------------------: | :---------------------------------: | :------------------: |
| **Cenário 1: "Sem Emenda e Sem Otimização" (Comparativo)** | ${extScenario1} barra(s) | ${intScenario1} barra(s) | **${totalSemEmendaSemOpt} barras** |
| **Cenário 2: "Sem Emenda com Otimização de Corte" (Comparativo)** | ${extScenario2} barra(s) | ${intScenario2} barra(s) | **${totalSemEmendaComOpt} barras** |
| **Cenário 3: "Com Emenda e Otimização Total" (DEFINITIVO - Produção)** | ${extScenario3} barra(s) | ${intScenario3} barra(s) | **${totalComEmendaComOpt} barras** |`
}`;
}
