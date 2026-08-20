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
  barNumber: number;
  profileName: string;
  initialLength: number;
  usedLength: number;
  remainingLength: number;
  pieces: PieceToCut[];
}

export const MAX_TRUCK_LENGTH = 4.30; // 4,30 metros de comprimento máximo no caminhão
export const MAX_TRUCK_WIDTH = 2.00;  // 2,00 metros de largura máxima no caminhão

export interface TransportLogisticsInfo {
  maxTruckLength: number;
  maxTruckWidth: number;
  fitsInSinglePiece: boolean;
  modulesHorizontalCount: number;
  modulesVerticalCount: number;
  totalModulesCount: number;
  moduleWidthM: number;
  moduleHeightM: number;
  statusText: string;
  jointDetailsText: string;
}

export function calculateTransportLogistics(largura: number, altura: number): TransportLogisticsInfo {
  // Check if it fits without rotation or with 90 deg rotation
  const fitsDirect = largura <= MAX_TRUCK_LENGTH && altura <= MAX_TRUCK_WIDTH;
  const fitsRotated = largura <= MAX_TRUCK_WIDTH && altura <= MAX_TRUCK_LENGTH;
  const fitsInSinglePiece = fitsDirect || fitsRotated;

  let modulesHorizontalCount = 1;
  let modulesVerticalCount = 1;

  if (!fitsInSinglePiece) {
    modulesHorizontalCount = Math.max(1, Math.ceil(largura / MAX_TRUCK_LENGTH));
    modulesVerticalCount = Math.max(1, Math.ceil(altura / MAX_TRUCK_WIDTH));
  }

  const totalModulesCount = modulesHorizontalCount * modulesVerticalCount;
  const moduleWidthM = Number((largura / modulesHorizontalCount).toFixed(2));
  const moduleHeightM = Number((altura / modulesVerticalCount).toFixed(2));

  let statusText = '';
  let jointDetailsText = '';

  if (fitsInSinglePiece) {
    statusText = `Estrutura 100% Transportável em Peça Única (Compatível com caminhão padrão de ${MAX_TRUCK_LENGTH.toFixed(2).replace('.', ',')} m × ${MAX_TRUCK_WIDTH.toFixed(2).replace('.', ',')} m).`;
    jointDetailsText = `A peça possui dimensões nominais de ${largura.toFixed(2).replace('.', ',')} m × ${altura.toFixed(2).replace('.', ',')} m, sendo transportada inteiriça sem necessidade de emendas modulares em campo.`;
  } else {
    statusText = `Estrutura com Divisão Modular de Transporte Necessária (${totalModulesCount} Módulo(s) de transporte de até ${moduleWidthM.toFixed(2).replace('.', ',')} m × ${moduleHeightM.toFixed(2).replace('.', ',')} m).`;
    jointDetailsText = `Devido ao gabarito do caminhão (${MAX_TRUCK_LENGTH.toFixed(2).replace('.', ',')} m de comprimento × ${MAX_TRUCK_WIDTH.toFixed(2).replace('.', ',')} m de largura), a estrutura é dividida na oficina em ${totalModulesCount} módulo(s) (${modulesHorizontalCount} horizontalmente × ${modulesVerticalCount} verticalmente) com flanges/chapas de união para fixação final na obra.`;
  }

  return {
    maxTruckLength: MAX_TRUCK_LENGTH,
    maxTruckWidth: MAX_TRUCK_WIDTH,
    fitsInSinglePiece,
    modulesHorizontalCount,
    modulesVerticalCount,
    totalModulesCount,
    moduleWidthM,
    moduleHeightM,
    statusText,
    jointDetailsText,
  };
}

/**
 * Optimized Cutting Stock Algorithm for Whole Pieces (Sem Emenda)
 * Packs all required integral pieces into the minimum number of 6.00m commercial bars.
 */
export function optimizeWholePiecesPlan(params: {
  pieces: PieceToCut[];
  profileName: string;
  startBarIndex?: number;
}): {
  totalBars: number;
  allocatedBars: AllocatedBar[];
} {
  const { pieces, profileName } = params;
  const startIdx = params.startBarIndex || 1;

  const wholeItems: PieceToCut[] = [];
  const allocatedBars: AllocatedBar[] = [];

  // If any single piece exceeds 6.0m, partition it by 6m segments
  for (const piece of pieces) {
    let remLen = piece.length;
    let segIndex = 1;
    while (remLen > 6.001) {
      const segLen = 6.0;
      const newBarNum = startIdx + allocatedBars.length;
      allocatedBars.push({
        barNumber: newBarNum,
        profileName,
        initialLength: 6.0,
        usedLength: 6.0,
        remainingLength: 0.0,
        pieces: [
          {
            type: piece.type,
            length: 6.0,
            description: `${piece.description} (Trecho ${segIndex} - 6,00 m)`,
          },
        ],
      });
      remLen = Number((remLen - 6.0).toFixed(3));
      segIndex++;
    }
    if (remLen > 0.001) {
      wholeItems.push({
        type: piece.type,
        length: remLen,
        description:
          segIndex > 1
            ? `${piece.description} (Trecho ${segIndex} - ${remLen.toFixed(2).replace('.', ',')} m)`
            : piece.description,
      });
    }
  }

  // Sort descending (Best-Fit Decreasing)
  wholeItems.sort((a, b) => b.length - a.length);

  // Pack items into 6.00m bars
  for (const piece of wholeItems) {
    let bestBarIndex = -1;
    let minLeftover = 999;

    for (let i = 0; i < allocatedBars.length; i++) {
      const bar = allocatedBars[i];
      if (bar.remainingLength >= piece.length - 0.001) {
        const leftover = bar.remainingLength - piece.length;
        if (leftover < minLeftover) {
          minLeftover = leftover;
          bestBarIndex = i;
        }
      }
    }

    if (bestBarIndex >= 0) {
      const targetBar = allocatedBars[bestBarIndex];
      targetBar.pieces.push(piece);
      targetBar.usedLength = Number((targetBar.usedLength + piece.length).toFixed(3));
      targetBar.remainingLength = Number((6.0 - targetBar.usedLength).toFixed(3));
    } else {
      const newBarNum = startIdx + allocatedBars.length;
      allocatedBars.push({
        barNumber: newBarNum,
        profileName,
        initialLength: 6.0,
        usedLength: piece.length,
        remainingLength: Number((6.0 - piece.length).toFixed(3)),
        pieces: [piece],
      });
    }
  }

  // Renumber bars sequentially from startIdx
  allocatedBars.forEach((bar, idx) => {
    bar.barNumber = startIdx + idx;
  });

  return {
    totalBars: allocatedBars.length,
    allocatedBars,
  };
}

export function buildElementsMapping(params: {
  isSameProfile: boolean;
  largura: number;
  vertCutLength: number;
  linhasHorizontais: number;
  colunasVerticais: number;
  allocatedBarsDetailed: AllocatedBar[];
}): {
  horizontalElements: StructuralElementMapping[];
  verticalElements: StructuralElementMapping[];
} {
  const {
    isSameProfile,
    largura,
    vertCutLength,
    linhasHorizontais,
    colunasVerticais,
    allocatedBarsDetailed,
  } = params;

  const horizontalElements: StructuralElementMapping[] = [];
  const verticalElements: StructuralElementMapping[] = [];

  // Map Horizontal Lines
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

    // Fallback if not specifically tagged
    if (segments.length === 0) {
      segments.push({
        barNumber: 1,
        length: largura,
        startM: 0,
        endM: largura,
        barLabel: 'Barra 01',
      });
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

  // Map Vertical Columns
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

    if (segments.length === 0) {
      segments.push({
        barNumber: 1,
        length: vertCutLength,
        startM: 0,
        endM: vertCutLength,
        barLabel: 'Barra 01',
      });
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

export interface DiagramSpecification {
  id: 'D1' | 'D2' | 'D3' | 'D4';
  number: number;
  title: string;
  shortTitle: string;
  topologyName: string;
  description: string;
  weldsDescription: string;
  totalBars: number;
  totalMetragemLinear: number;
  sobraTotalM: number;
  aproveitamentoPct: number;
  weldsCount: number;
  weldingTimeMinutes: number;
  weldingTimeFormatted: string;
  isWinner: boolean;
  winnerBadge?: string;
  winnerReason?: string;
  pieces: PieceToCut[];
  allocatedBars: AllocatedBar[];
  horizontalElements: StructuralElementMapping[];
  verticalElements: StructuralElementMapping[];
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
  totalBarrasOtimizado: number;
  sobraTotalM: number;
  aproveitamentoPct: number;
  extBarrasOtimizado: number;
  intBarrasOtimizado: number;
  weldsCountHorizTopology: number;
  weldsCountVertTopology: number;
  allocatedBarsDetailed: AllocatedBar[];
  horizontalElements: StructuralElementMapping[];
  verticalElements: StructuralElementMapping[];
  transportLogistics: TransportLogisticsInfo;
  diagrams: DiagramSpecification[];
  winnerDiagram: DiagramSpecification;
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

  // Calculate the 4 Structural Diagrams / Topologies
  const hEmendasPerLine = Math.max(0, Math.ceil(largura / 6.0) - 1);
  const vEmendasPerColH = Math.max(0, Math.ceil(vertCutLength / 6.0) - 1);
  const vEmendasPerColFull = Math.max(0, Math.ceil(altura / 6.0) - 1);

  // --- DIAGRAMA 1: Linhas Horizontais Contínuas (Solda Horizontal) ---
  const d1Pieces: PieceToCut[] = [
    ...Array(linhasHorizontais).fill(0).map((_, i) => ({
      type: 'Horizontal' as const,
      length: largura,
      description: `Linha Horiz. ${i + 1} (${largura.toFixed(2).replace('.', ',')} m)`,
    })),
    ...Array(colunasVerticais).fill(0).map((_, j) => ({
      type: 'Vertical' as const,
      length: vertCutLength,
      description: `Coluna Vert. ${j + 1} (${vertCutLength.toFixed(2).replace('.', ',')} m)`,
    })),
  ];
  const d1Opt = optimizeWholePiecesPlan({ pieces: d1Pieces, profileName: profileExt.name, startBarIndex: 1 });
  const d1Metragem = Number((linhasHorizontais * largura + colunasVerticais * vertCutLength).toFixed(2));
  const d1Comprado = d1Opt.totalBars * 6.0;
  const d1Sobra = Number(Math.max(0, d1Comprado - d1Metragem).toFixed(2));
  const d1Aproveitamento = Number(((d1Metragem / d1Comprado) * 100).toFixed(1));
  const d1Welds = (linhasHorizontais * colunasVerticais) + (linhasHorizontais * hEmendasPerLine) + (colunasVerticais * vEmendasPerColH);
  const d1TimeMin = Math.round(d1Welds * 2.5);

  // --- DIAGRAMA 2: Colunas Verticais Contínuas + Travessas Seccionadas (Solda Vertical) ---
  const numTravessasPorLinha = Math.max(1, colunasVerticais - 1);
  const totalTravessasD2 = linhasHorizontais * numTravessasPorLinha;
  const d2Pieces: PieceToCut[] = [
    ...Array(colunasVerticais).fill(0).map((_, j) => ({
      type: 'Vertical' as const,
      length: altura,
      description: `Coluna Vert. Inteiriça ${j + 1} (${altura.toFixed(2).replace('.', ',')} m)`,
    })),
    ...Array(totalTravessasD2).fill(0).map((_, k) => ({
      type: 'Horizontal' as const,
      length: vaoLivreHoriz,
      description: `Travessa Horiz. ${k + 1} (${vaoLivreHoriz.toFixed(2).replace('.', ',')} m)`,
    })),
  ];
  const d2Opt = optimizeWholePiecesPlan({ pieces: d2Pieces, profileName: profileExt.name, startBarIndex: 1 });
  const d2Metragem = Number((colunasVerticais * altura + totalTravessasD2 * vaoLivreHoriz).toFixed(2));
  const d2Comprado = d2Opt.totalBars * 6.0;
  const d2Sobra = Number(Math.max(0, d2Comprado - d2Metragem).toFixed(2));
  const d2Aproveitamento = Number(((d2Metragem / d2Comprado) * 100).toFixed(1));
  const d2Welds = (2 * totalTravessasD2) + (colunasVerticais * vEmendasPerColFull);
  const d2TimeMin = Math.round(d2Welds * 2.5);

  // --- DIAGRAMA 3: Estrutura Vertical (Bordas Passantes e Colunas no Vão Real) ---
  const d3Pieces: PieceToCut[] = [
    ...Array(linhasHorizontais).fill(0).map((_, i) => ({
      type: 'Horizontal' as const,
      length: largura,
      description: `Linha Borda/Interna ${i + 1} (${largura.toFixed(2).replace('.', ',')} m)`,
    })),
    ...Array(colunasVerticais).fill(0).map((_, j) => ({
      type: 'Vertical' as const,
      length: vertCutLength,
      description: `Coluna Montante ${j + 1} (${vertCutLength.toFixed(2).replace('.', ',')} m)`,
    })),
  ];
  const d3Opt = optimizeWholePiecesPlan({ pieces: d3Pieces, profileName: profileExt.name, startBarIndex: 1 });
  const d3Metragem = Number((linhasHorizontais * largura + colunasVerticais * vertCutLength).toFixed(2));
  const d3Comprado = d3Opt.totalBars * 6.0;
  const d3Sobra = Number(Math.max(0, d3Comprado - d3Metragem).toFixed(2));
  const d3Aproveitamento = Number(((d3Metragem / d3Comprado) * 100).toFixed(1));
  const d3Welds = (linhasHorizontais * colunasVerticais) + (linhasHorizontais * hEmendasPerLine) + (colunasVerticais * vEmendasPerColH);
  const d3TimeMin = Math.round(d3Welds * 2.5);

  // --- DIAGRAMA 4: Estrutura Vertical (Colunas Inteiriças Passantes na Altura Total) ---
  const horizCutLengthD4 = Number(Math.max(0.1, largura - 2 * profileExt.faceSizeM).toFixed(3));
  const d4Pieces: PieceToCut[] = [
    ...Array(colunasVerticais).fill(0).map((_, j) => ({
      type: 'Vertical' as const,
      length: altura,
      description: `Coluna Passante ${j + 1} (${altura.toFixed(2).replace('.', ',')} m)`,
    })),
    ...Array(linhasHorizontais).fill(0).map((_, i) => ({
      type: 'Horizontal' as const,
      length: horizCutLengthD4,
      description: `Linha Horiz. Encaixada ${i + 1} (${horizCutLengthD4.toFixed(2).replace('.', ',')} m)`,
    })),
  ];
  const d4Opt = optimizeWholePiecesPlan({ pieces: d4Pieces, profileName: profileExt.name, startBarIndex: 1 });
  const d4Metragem = Number((colunasVerticais * altura + linhasHorizontais * horizCutLengthD4).toFixed(2));
  const d4Comprado = d4Opt.totalBars * 6.0;
  const d4Sobra = Number(Math.max(0, d4Comprado - d4Metragem).toFixed(2));
  const d4Aproveitamento = Number(((d4Metragem / d4Comprado) * 100).toFixed(1));
  const d4Welds = (linhasHorizontais * colunasVerticais) + (colunasVerticais * vEmendasPerColFull);
  const d4TimeMin = Math.round(d4Welds * 2.5);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}` : `${m} min`;
  };

  const rawDiagrams: DiagramSpecification[] = [
    {
      id: 'D1',
      number: 1,
      title: 'Figura 1 — Estrutura Horizontal (Linhas Contínuas / Solda Horizontal)',
      shortTitle: 'Diag. 1: Linhas Contínuas',
      topologyName: 'Linhas Contínuas / Solda Horizontal',
      description: `${linhasHorizontais} linhas contínuas de ${largura.toFixed(2).replace('.', ',')} m • ${colunasVerticais} colunas cortadas com ${vertCutLength.toFixed(2).replace('.', ',')} m`,
      weldsDescription: `${d1Welds} nós de solda horizontal (${linhasHorizontais * colunasVerticais} nós + ${linhasHorizontais * hEmendasPerLine} emendas de topo)`,
      totalBars: d1Opt.totalBars,
      totalMetragemLinear: d1Metragem,
      sobraTotalM: d1Sobra,
      aproveitamentoPct: d1Aproveitamento,
      weldsCount: d1Welds,
      weldingTimeMinutes: d1TimeMin,
      weldingTimeFormatted: formatHours(d1TimeMin),
      isWinner: false,
      pieces: d1Pieces,
      allocatedBars: d1Opt.allocatedBars,
      horizontalElements: [],
      verticalElements: [],
    },
    {
      id: 'D2',
      number: 2,
      title: 'Figura 2 — Estrutura Horizontal (Colunas Contínuas / Solda Vertical)',
      shortTitle: 'Diag. 2: Travessas Seccionadas',
      topologyName: 'Colunas Contínuas / Solda Vertical',
      description: `${colunasVerticais} colunas inteiriças de ${altura.toFixed(2).replace('.', ',')} m • ${totalTravessasD2} travessas seccionadas de ${(vaoLivreHoriz * 100).toFixed(1).replace('.', ',')} cm`,
      weldsDescription: `${d2Welds} soldas verticais (${totalTravessasD2} travessas com 2 soldas de topo em cada extremidade)`,
      totalBars: d2Opt.totalBars,
      totalMetragemLinear: d2Metragem,
      sobraTotalM: d2Sobra,
      aproveitamentoPct: d2Aproveitamento,
      weldsCount: d2Welds,
      weldingTimeMinutes: d2TimeMin,
      weldingTimeFormatted: formatHours(d2TimeMin),
      isWinner: false,
      pieces: d2Pieces,
      allocatedBars: d2Opt.allocatedBars,
      horizontalElements: [],
      verticalElements: [],
    },
    {
      id: 'D3',
      number: 3,
      title: 'Figura 3 — Estrutura Vertical (Bordas Passantes / Vão Real)',
      shortTitle: 'Diag. 3: Bordas Passantes',
      topologyName: 'Bordas Passantes / Montantes Internos',
      description: `${linhasHorizontais} linhas de borda de ${largura.toFixed(2).replace('.', ',')} m • ${colunasVerticais} colunas no vão real de ${vertCutLength.toFixed(2).replace('.', ',')} m`,
      weldsDescription: `${d3Welds} nós de solda estrutural`,
      totalBars: d3Opt.totalBars,
      totalMetragemLinear: d3Metragem,
      sobraTotalM: d3Sobra,
      aproveitamentoPct: d3Aproveitamento,
      weldsCount: d3Welds,
      weldingTimeMinutes: d3TimeMin,
      weldingTimeFormatted: formatHours(d3TimeMin),
      isWinner: false,
      pieces: d3Pieces,
      allocatedBars: d3Opt.allocatedBars,
      horizontalElements: [],
      verticalElements: [],
    },
    {
      id: 'D4',
      number: 4,
      title: 'Figura 4 — Estrutura Vertical (Colunas Inteiriças Passantes)',
      shortTitle: 'Diag. 4: Colunas Inteiriças',
      topologyName: 'Colunas Inteiriças na Altura Total',
      description: `${colunasVerticais} colunas inteiriças de ${altura.toFixed(2).replace('.', ',')} m • ${linhasHorizontais} linhas horizontais encaixadas de ${horizCutLengthD4.toFixed(2).replace('.', ',')} m`,
      weldsDescription: `${d4Welds} nós de solda perimetral e interna`,
      totalBars: d4Opt.totalBars,
      totalMetragemLinear: d4Metragem,
      sobraTotalM: d4Sobra,
      aproveitamentoPct: d4Aproveitamento,
      weldsCount: d4Welds,
      weldingTimeMinutes: d4TimeMin,
      weldingTimeFormatted: formatHours(d4TimeMin),
      isWinner: false,
      pieces: d4Pieces,
      allocatedBars: d4Opt.allocatedBars,
      horizontalElements: [],
      verticalElements: [],
    },
  ];

  // Populate element mappings for all diagrams
  rawDiagrams.forEach(diag => {
    const mappings = buildElementsMapping({
      isSameProfile: true,
      largura,
      vertCutLength,
      linhasHorizontais,
      colunasVerticais,
      allocatedBarsDetailed: diag.allocatedBars,
    });
    diag.horizontalElements = mappings.horizontalElements;
    diag.verticalElements = mappings.verticalElements;
  });

  // Winner Decision Algorithm:
  // User explicitly instructed: "a prioridade tem que ser o minimo de solda possivel, e o que tiver menor valor de solda com o material proximo vai ser o modelo escolhido para fazer a tabela e o diagrama de montagem, esse cenario dos quatros seria o vitorioso"
  // Score: Welds (weight 1.0) + Bars * 0.8. Lowest score wins.
  let winnerIndex = 0;
  let minScore = Infinity;

  rawDiagrams.forEach((diag, idx) => {
    const score = diag.weldsCount * 1.0 + diag.totalBars * 0.8;
    if (score < minScore) {
      minScore = score;
      winnerIndex = idx;
    }
  });

  rawDiagrams[winnerIndex].isWinner = true;
  rawDiagrams[winnerIndex].winnerBadge = '★ MODELO VITORIOSO (RECOMENDADO PARA PRODUÇÃO)';
  rawDiagrams[winnerIndex].winnerReason = `Quantidade mínima de nós de solda (${rawDiagrams[winnerIndex].weldsCount} soldas) com consumo eficiente de material (${rawDiagrams[winnerIndex].totalBars} barras de 6,00 m).`;

  const winnerDiagram = rawDiagrams[winnerIndex];
  const diagrams = rawDiagrams;

  // Use Winner Diagram as the primary calculation basis
  const totalBarrasOtimizado = winnerDiagram.totalBars;
  const sobraTotalM = winnerDiagram.sobraTotalM;
  const aproveitamentoPct = winnerDiagram.aproveitamentoPct;
  const allocatedBarsDetailed = winnerDiagram.allocatedBars;
  const horizontalElements = winnerDiagram.horizontalElements;
  const verticalElements = winnerDiagram.verticalElements;
  const weldsCountHorizTopology = d1Welds;
  const weldsCountVertTopology = d2Welds;

  const transportLogistics = calculateTransportLogistics(largura, altura);

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
    totalBarrasOtimizado,
    sobraTotalM,
    aproveitamentoPct,
    extBarrasOtimizado: totalBarrasOtimizado,
    intBarrasOtimizado: 0,
    weldsCountHorizTopology,
    weldsCountVertTopology,
    allocatedBarsDetailed,
    horizontalElements,
    verticalElements,
    transportLogistics,
    diagrams,
    winnerDiagram,
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
    metragemIntHoriz,
    metragemIntVert,
    totalMetragemLinear,
    teoricoBarrasGeral,
    transportLogistics,
    diagrams,
    winnerDiagram,
  } = calc;

  const extFaceMm = (profileExt.faceSizeM * 1000).toFixed(0);
  const widthFormatted = largura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const d1 = diagrams[0];
  const d2 = diagrams[1];
  const d3 = diagrams[2];
  const d4 = diagrams[3];

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

## 3. Análise Comparativa dos 4 Modelos Estruturais e Critério de Decisão

### 3.1 Priorização Técnica: Mínimo de Solda e Eficiência Estrutural
Na fabricação de painéis em serralheria industrial, a quantidade de nós de solda e o aproveitamento de barras representam os critérios determinantes. Para cada um dos 4 esquemas construtivos (Diagramas 1 a 4), calculou-se a demanda exata de barras comerciais de 6,00 m, metragem linear, aproveitamento e pontos de solda:
- **Critério de Seleção:** Prioridade para o modelo que minimiza a quantidade de pontos de solda, mantendo um consumo de barras comercialmente eficiente e seguro.
- **Modelo Vitorioso Eleito:** **${winnerDiagram.title}** (${winnerDiagram.shortTitle}), totalizando **${winnerDiagram.totalBars} barras de 6,00 m** e **${winnerDiagram.weldsCount} pontos de solda**.

### 3.2 Gabarito de Transporte (Caminhão 4,30 m × 2,00 m)
- **Status de Transporte:** ${transportLogistics.statusText}
- **Orientações de Logística:** ${transportLogistics.jointDetailsText}

---

## 4. Comparativo dos 4 Diagramas
| Diagrama / Modelo Construtivo | Topologia Estrutural | Barras (6,00m) | Metragem Linear | Aproveitamento | Pontos de Solda | Classificação |
| :---------------------------- | :------------------: | :------------: | :-------------: | :------------: | :-------------: | :-----------: |
${diagrams.map(d => `| **${d.shortTitle}** | ${d.topologyName} | **${d.totalBars} barras** | ${d.totalMetragemLinear.toLocaleString('pt-BR')} m | ${d.aproveitamentoPct.toLocaleString('pt-BR')}% | **${d.weldsCount} soldas** | ${d.isWinner ? '**★ MODELO VITORIOSO**' : 'Alternativa'} |`).join('\n')}`;
}
