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

  const allocatedBarsDetailed: AllocatedBar[] = [];
  let totalBarrasOtimizado = 0;
  let extBarrasOtimizado = 0;
  let intBarrasOtimizado = 0;

  if (isSameProfile) {
    const allPieces: PieceToCut[] = [
      ...Array(linhasHorizontais)
        .fill(0)
        .map((_, i) => ({
          type: 'Horizontal' as const,
          length: largura,
          description: `1x Linha Horiz. ${i + 1} (${largura.toFixed(2).replace('.', ',')} m)`,
        })),
      ...Array(colunasVerticais)
        .fill(0)
        .map((_, j) => ({
          type: 'Vertical' as const,
          length: vertCutLength,
          description: `1x Coluna Vert. ${j + 1} (${vertCutLength.toFixed(2).replace('.', ',')} m)`,
        })),
    ];

    const optResult = optimizeWholePiecesPlan({
      pieces: allPieces,
      profileName: profileExt.name,
      startBarIndex: 1,
    });

    totalBarrasOtimizado = optResult.totalBars;
    allocatedBarsDetailed.push(...optResult.allocatedBars);
  } else {
    const extPieces: PieceToCut[] = [
      ...Array(horizExtCount)
        .fill(0)
        .map((_, i) => ({
          type: 'Horizontal' as const,
          length: largura,
          description: `1x Horiz. Borda ${i + 1} (${largura.toFixed(2).replace('.', ',')} m)`,
        })),
      ...Array(vertExtCount)
        .fill(0)
        .map((_, j) => ({
          type: 'Vertical' as const,
          length: vertCutLength,
          description: `1x Vert. Borda ${j + 1} (${vertCutLength.toFixed(2).replace('.', ',')} m)`,
        })),
    ];

    const intPieces: PieceToCut[] = [
      ...Array(horizIntCount)
        .fill(0)
        .map((_, i) => ({
          type: 'Horizontal' as const,
          length: largura,
          description: `1x Horiz. Interna ${i + 1} (${largura.toFixed(2).replace('.', ',')} m)`,
        })),
      ...Array(vertIntCount)
        .fill(0)
        .map((_, j) => ({
          type: 'Vertical' as const,
          length: vertCutLength,
          description: `1x Vert. Interna ${j + 1} (${vertCutLength.toFixed(2).replace('.', ',')} m)`,
        })),
    ];

    const optExt = optimizeWholePiecesPlan({
      pieces: extPieces,
      profileName: `${profileExt.name} (Borda)`,
      startBarIndex: 1,
    });
    extBarrasOtimizado = optExt.totalBars;

    const optInt = optimizeWholePiecesPlan({
      pieces: intPieces,
      profileName: `${profileInt.name} (Interno)`,
      startBarIndex: optExt.totalBars + 1,
    });
    intBarrasOtimizado = optInt.totalBars;

    totalBarrasOtimizado = extBarrasOtimizado + intBarrasOtimizado;
    allocatedBarsDetailed.push(...optExt.allocatedBars, ...optInt.allocatedBars);
  }

  // Calculate total waste & efficiency
  const totalCompradoM = totalBarrasOtimizado * 6.0;
  const sobraTotalM = Number(Math.max(0, totalCompradoM - totalMetragemLinear).toFixed(2));
  const aproveitamentoPct = Number(((totalMetragemLinear / totalCompradoM) * 100).toFixed(1));

  // Welds count for both topologies:
  // 1. Horizontal continuous topology (colunas apoiadas sob/sobre linhas contínuas)
  const weldsCountHorizTopology = colunasVerticais * linhasHorizontais;
  // 2. Vertical continuous topology (travessas encaixadas lateralmente entre colunas)
  const weldsCountVertTopology = linhasHorizontais * colunasVerticais;

  const { horizontalElements, verticalElements } = buildElementsMapping({
    isSameProfile,
    largura,
    vertCutLength,
    linhasHorizontais,
    colunasVerticais,
    allocatedBarsDetailed,
  });

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
    extBarrasOtimizado,
    intBarrasOtimizado,
    weldsCountHorizTopology,
    weldsCountVertTopology,
    allocatedBarsDetailed,
    horizontalElements,
    verticalElements,
    transportLogistics,
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
    totalBarrasOtimizado,
    sobraTotalM,
    aproveitamentoPct,
    extBarrasOtimizado,
    intBarrasOtimizado,
    weldsCountHorizTopology,
    weldsCountVertTopology,
    transportLogistics,
  } = calc;

  const extFaceMm = (profileExt.faceSizeM * 1000).toFixed(0);
  const widthFormatted = largura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

## 3. Plano de Corte Otimizado e Logística de Transporte

### 3.1 Otimização de Corte de Peças Inteiras (Sem Emenda)
- **Metragem Linear Total:** **${totalMetragemLinear.toLocaleString('pt-BR')} m** (Consumo Teórico: ${teoricoBarrasGeral} barras de 6,00 m).
- **Lote Comercial Necessário:** **${totalBarrasOtimizado} barra(s) de 6,00 m** (${(totalBarrasOtimizado * 6.0).toLocaleString('pt-BR')} m comprados).
- **Aproveitamento de Material:** **${aproveitamentoPct.toLocaleString('pt-BR')}%** (Sobra total de pontas/retalhos: ${sobraTotalM.toLocaleString('pt-BR')} m).
- **Estratégia de Corte:** Todas as peças horizontais (${widthFormatted} m) e colunas verticais (${vertCutLength.toLocaleString('pt-BR')} m) são cortadas em peças integrais (sem emendas intermediárias), preservando a rigidez estrutural e agilizando a serralheria.

### 3.2 Gabarito de Transporte (Caminhão 4,30 m × 2,00 m)
- **Status de Transporte:** ${transportLogistics.statusText}
- **Orientações de Logística:** ${transportLogistics.jointDetailsText}

---

## 4. Resumo Técnico de Consumo e Dimensionamento

${
  isSameProfile
    ? `| Item de Especificação | Valor Calculado |
| :------------------- | :-------------: |
| **Total de Barras Comerciais (6,00 m)** | **${totalBarrasOtimizado} barras** |
| **Metragem Linear Total** | **${totalMetragemLinear.toLocaleString('pt-BR')} m** |
| **Aproveitamento de Aço** | **${aproveitamentoPct.toLocaleString('pt-BR')}%** |
| **Pontos de Solda (Topologia Linhas Contínuas)** | **${weldsCountHorizTopology} soldas** |
| **Pontos de Solda (Topologia Colunas Contínuas)** | **${weldsCountVertTopology} soldas** |
| **Gabarito de Transporte (Caminhão 4,30m × 2,00m)** | **${transportLogistics.totalModulesCount === 1 ? 'Peça Única (Direta)' : `${transportLogistics.totalModulesCount} Módulos Transportáveis`}** |`
    : `| Item de Especificação | Perfil Externo (${profileExt.name}) | Perfil Interno (${profileInt.name}) | Total Geral |
| :------------------- | :---------------------------------: | :---------------------------------: | :---------: |
| **Barras Comerciais (6,00 m)** | ${extBarrasOtimizado} barra(s) | ${intBarrasOtimizado} barra(s) | **${totalBarrasOtimizado} barras** |
| **Metragem Linear** | ${metragemExtTotal.toLocaleString('pt-BR')} m | ${metragemIntTotal.toLocaleString('pt-BR')} m | **${totalMetragemLinear.toLocaleString('pt-BR')} m** |
| **Aproveitamento Médio** | — | — | **${aproveitamentoPct.toLocaleString('pt-BR')}%** |
| **Logística de Transporte** | — | — | **${transportLogistics.totalModulesCount === 1 ? 'Peça Única' : `${transportLogistics.totalModulesCount} Módulos`}** |`
}`;
}
