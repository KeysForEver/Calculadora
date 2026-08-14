import React from 'react';
import { MetalonInput } from '../types';

export interface ProductionCutTableProps {
  input: MetalonInput;
  dateStr?: string;
  source?: 'gemini' | 'calculator';
}

interface PieceToCut {
  type: 'Horizontal' | 'Vertical';
  length: number;
  description: string;
}

export interface AllocatedBar {
  barNumber: number;
  profileName: string;
  initialLength: number;
  usedLength: number;
  remainingLength: number;
  pieces: PieceToCut[];
}

function parseProfileName(perfilStr: string): string {
  if (!perfilStr) return '30 x 30 mm';
  return perfilStr;
}

function parseFaceSizeM(perfilStr: string): number {
  if (!perfilStr) return 0.03;
  const match = perfilStr.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    return parseFloat(match[1]) / 1000 || 0.03;
  }
  return 0.03;
}

function allocatePieces(pieces: PieceToCut[], profileName: string, startBarNum: number) {
  let full6mBarsCount = 0;
  const subPieces: PieceToCut[] = [];
  const fullBarsList: AllocatedBar[] = [];
  let currentBar = startBarNum;

  for (const piece of pieces) {
    const fullBars = Math.floor(piece.length / 6.0);
    const remLength = Number((piece.length - fullBars * 6.0).toFixed(3));

    for (let f = 0; f < fullBars; f++) {
      full6mBarsCount++;
      fullBarsList.push({
        barNumber: currentBar++,
        profileName,
        initialLength: 6.0,
        usedLength: 6.0,
        remainingLength: 0,
        pieces: [
          {
            type: piece.type,
            length: 6.0,
            description: `${piece.description} (Trecho 6,00 m)`,
          },
        ],
      });
    }

    if (remLength > 0) {
      subPieces.push({
        type: piece.type,
        length: remLength,
        description: piece.description,
      });
    }
  }

  // Sort sub-6m pieces descending by length
  subPieces.sort((a, b) => b.length - a.length);

  const allocatedBars: AllocatedBar[] = [];

  for (const piece of subPieces) {
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
        barNumber: currentBar++,
        profileName,
        initialLength: 6.0,
        usedLength: piece.length,
        remainingLength: Number((6.0 - piece.length).toFixed(3)),
        pieces: [piece],
      });
    }
  }

  return {
    bars: [...fullBarsList, ...allocatedBars],
    nextBarNum: currentBar,
  };
}

interface TablePageChunk {
  pageIndex: number;
  totalChunks: number;
  isFirst: boolean;
  isLast: boolean;
  bars: AllocatedBar[];
  showKPIs: boolean;
  showGuidance: boolean;
}

export const ProductionCutTable: React.FC<ProductionCutTableProps> = ({ input, dateStr, source }) => {
  const { largura, altura, perfilExterno, perfilInterno, perfil, vaoMaximo, vaoMaxHoriz, vaoMaxVert } = input;

  const extProfile = parseProfileName(perfilExterno || perfil || '30 x 30 mm');
  const intProfile = parseProfileName(perfilInterno || perfilExterno || perfil || '30 x 30 mm');

  const isSameProfile = extProfile.toLowerCase().replace(/\s+/g, '') === intProfile.toLowerCase().replace(/\s+/g, '');

  const extFaceM = parseFaceSizeM(extProfile);
  const intFaceM = parseFaceSizeM(intProfile);

  const vaoHorizCm = vaoMaxHoriz || vaoMaximo || 80;
  const vaoVertCm = vaoMaxVert || vaoMaximo || 80;

  const vaoHorizM = vaoHorizCm / 100;
  const vaoVertM = vaoVertCm / 100;

  // Calculate grid
  const vaosVerticais = Math.ceil((altura - extFaceM) / (vaoVertM + intFaceM)) || Math.ceil(altura / vaoVertM) || 1;
  const linhasHorizontais = vaosVerticais + 1;

  const vaosHorizontais = Math.ceil((largura - extFaceM) / (vaoHorizM + intFaceM)) || Math.ceil(largura / vaoHorizM) || 1;
  const colunasVerticais = vaosHorizontais + 1;

  const vertCutM = Number(Math.max(0.1, altura - 2 * extFaceM).toFixed(3));

  let allBars: AllocatedBar[] = [];

  if (isSameProfile) {
    const pieces: PieceToCut[] = [
      ...Array(linhasHorizontais).fill(0).map((_, i) => ({
        type: 'Horizontal' as const,
        length: largura,
        description: `Linha Horiz. ${i + 1}`,
      })),
      ...Array(colunasVerticais).fill(0).map((_, i) => ({
        type: 'Vertical' as const,
        length: vertCutM,
        description: `Coluna Vert. ${i + 1}`,
      })),
    ];

    const result = allocatePieces(pieces, extProfile, 1);
    allBars = result.bars;
  } else {
    const horizExtCount = Math.min(2, linhasHorizontais);
    const horizIntCount = Math.max(0, linhasHorizontais - 2);

    const vertExtCount = Math.min(2, colunasVerticais);
    const vertIntCount = Math.max(0, colunasVerticais - 2);

    const piecesExt: PieceToCut[] = [
      ...Array(horizExtCount).fill(0).map((_, i) => ({
        type: 'Horizontal' as const,
        length: largura,
        description: `Horiz. Borda ${i + 1}`,
      })),
      ...Array(vertExtCount).fill(0).map((_, i) => ({
        type: 'Vertical' as const,
        length: vertCutM,
        description: `Vert. Borda ${i + 1}`,
      })),
    ];

    const piecesInt: PieceToCut[] = [
      ...Array(horizIntCount).fill(0).map((_, i) => ({
        type: 'Horizontal' as const,
        length: largura,
        description: `Horiz. Interna ${i + 1}`,
      })),
      ...Array(vertIntCount).fill(0).map((_, i) => ({
        type: 'Vertical' as const,
        length: vertCutM,
        description: `Vert. Interna ${i + 1}`,
      })),
    ];

    const resExt = allocatePieces(piecesExt, `${extProfile} (Externo)`, 1);
    const resInt = allocatePieces(piecesInt, `${intProfile} (Interno)`, resExt.nextBarNum);

    allBars = [...resExt.bars, ...resInt.bars];
  }

  // Divide bars into clean pages (approx 12-14 bars per page without cards/boxes)
  const rowsPerPage = 12;
  const chunks: TablePageChunk[] = React.useMemo(() => {
    const result: TablePageChunk[] = [];
    const totalPages = Math.ceil(allBars.length / rowsPerPage) || 1;

    for (let p = 0; p < totalPages; p++) {
      const start = p * rowsPerPage;
      const end = start + rowsPerPage;
      result.push({
        pageIndex: p,
        totalChunks: totalPages,
        isFirst: p === 0,
        isLast: p === totalPages - 1,
        bars: allBars.slice(start, end),
        showKPIs: false,
        showGuidance: false,
      });
    }

    return result;
  }, [allBars]);

  return (
    <>
      {chunks.map((chunk, cIdx) => (
        <div
          key={`chunk-page-${cIdx}`}
          className="pdf-page bg-white pt-8 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
          style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
        >
          <div>
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-end justify-between">
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">
                  SKYMÍDIA
                </h1>
                {source === 'gemini' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white tracking-wide uppercase">
                    ✦ IA Gemini
                  </span>
                )}
              </div>
              {dateStr && (
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                    {dateStr}
                  </span>
                  {source === 'gemini' && (
                    <span className="sm:hidden inline-block text-[10px] font-bold text-slate-700">
                      ✦ IA Gemini
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 my-2">
              {/* Section Title */}
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-[#707579]">7.</span>
                  Tabela de Corte de Barras para a Produção
                  {chunk.totalChunks > 1 && (
                    <span className="text-sm font-normal text-slate-500">
                      (Página {chunk.pageIndex + 1} de {chunk.totalChunks})
                    </span>
                  )}
                </h3>
              </div>

              {/* Main Table for Production - Clean Table matching Section 4 */}
              <div className="overflow-x-auto my-2">
                <table className="w-full text-left text-sm border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold">
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 w-24">N° Barra</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 w-44">Perfil Metalon</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">Peças a Cortar / Gabarito</th>
                      <th className="py-2.5 px-3 text-right border-r border-slate-300 w-28">Uso Total</th>
                      <th className="py-2.5 px-3 text-right w-32">Sobra Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {chunk.bars.map((bar) => {
                      const pecasTexto = bar.pieces
                        .map((p) => `1x ${p.description} (${p.length.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m)`)
                        .join(' + ');

                      const usoFormatado = `${bar.usedLength.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
                      const sobraFormatada = bar.remainingLength > 0.001
                        ? `${bar.remainingLength.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
                        : '0,00 m';

                      return (
                        <tr key={`bar-${bar.barNumber}`} className="border-b border-slate-200">
                          <td className="py-2.5 px-3 text-center font-medium text-slate-900 border-r border-slate-300">
                            Barra {String(bar.barNumber).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-900 border-r border-slate-300">
                            {bar.profileName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 border-r border-slate-300">
                            {pecasTexto}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-900 border-r border-slate-300">
                            {usoFormatado}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-900">
                            {sobraFormatada}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-600 flex flex-col items-center justify-center gap-1.5 text-center">
            <a
              href="https://skymidiabh.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#707579] hover:text-slate-900 hover:underline font-medium"
            >
              https://skymidiabh.com.br/
            </a>
            <a
              href="https://www.instagram.com/skymidiabh/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#707579] hover:text-slate-900 hover:underline font-medium"
            >
              https://www.instagram.com/skymidiabh/
            </a>
          </div>
        </div>
      ))}
    </>
  );
};
