import React from 'react';
import { MetalonInput } from '../types';
import { calculateMetalonStructure, PieceToCut } from '../utils/calculator';

export interface ProductionCutTableProps {
  input: MetalonInput;
  dateStr?: string;
  source?: 'gemini' | 'calculator';
  startPageNum?: number;
  totalPages?: number;
}

export interface AllocatedBar {
  barNumber: number;
  profileName: string;
  initialLength: number;
  usedLength: number;
  remainingLength: number;
  pieces: PieceToCut[];
}

interface TablePageChunk {
  pageIndex: number;
  totalChunks: number;
  isFirst: boolean;
  isLast: boolean;
  bars: AllocatedBar[];
}

export const ProductionCutTable: React.FC<ProductionCutTableProps> = ({
  input,
  dateStr,
  startPageNum = 5,
  totalPages = 8,
}) => {
  const calcResult = React.useMemo(() => {
    return calculateMetalonStructure({
      largura: input.largura,
      altura: input.altura,
      perfilExterno: input.perfilExterno,
      perfilInterno: input.perfilInterno,
      perfil: input.perfil,
      vaoMaxHoriz: input.vaoMaxHoriz,
      vaoMaxVert: input.vaoMaxVert,
      vaoMaximo: input.vaoMaximo,
      faceExternoMm: input.faceExternoMm,
      profundidadeExternoMm: input.profundidadeExternoMm,
      faceInternoMm: input.faceInternoMm,
      profundidadeInternoMm: input.profundidadeInternoMm,
    });
  }, [
    input.largura,
    input.altura,
    input.perfilExterno,
    input.perfilInterno,
    input.perfil,
    input.vaoMaxHoriz,
    input.vaoMaxVert,
    input.vaoMaximo,
    input.faceExternoMm,
    input.profundidadeExternoMm,
    input.faceInternoMm,
    input.profundidadeInternoMm,
  ]);

  const allBars = calcResult.allocatedBarsDetailed;

  // Divide bars into clean pages (approx 12 bars per page to fit A4 perfectly)
  const rowsPerPage = 12;
  const chunks: TablePageChunk[] = React.useMemo(() => {
    const result: TablePageChunk[] = [];
    const totalChunks = Math.ceil(allBars.length / rowsPerPage) || 1;

    for (let p = 0; p < totalChunks; p++) {
      const start = p * rowsPerPage;
      const end = start + rowsPerPage;
      result.push({
        pageIndex: p,
        totalChunks,
        isFirst: p === 0,
        isLast: p === totalChunks - 1,
        bars: allBars.slice(start, end),
      });
    }

    return result;
  }, [allBars]);

  const totalUsoGeral = React.useMemo(() => {
    return allBars.reduce((sum, bar) => sum + bar.usedLength, 0);
  }, [allBars]);

  const totalSobraGeral = React.useMemo(() => {
    return allBars.reduce((sum, bar) => sum + bar.remainingLength, 0);
  }, [allBars]);

  return (
    <>
      {chunks.map((chunk, cIdx) => {
        const currentPageNumber = startPageNum + cIdx;

        return (
          <div
            key={`chunk-page-${cIdx}`}
            className="pdf-page bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
            style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
          >
            {/* Top Container */}
            <div className="flex-1 flex flex-col justify-start">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-2.5 mb-5 flex items-end justify-between w-full">
                <div className="flex items-baseline gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins tracking-tight">
                    SKYMÍDIA
                  </h1>
                </div>
                {dateStr && (
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                      {dateStr}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 my-1 flex-1">
                {/* Section Title */}
                <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-[#707579]">7.</span>
                    Tabela de Corte de Barras para a Produção
                    {chunk.totalChunks > 1 && (
                      <span className="text-xs font-normal text-slate-500">
                        (Tabela {chunk.pageIndex + 1} de {chunk.totalChunks})
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    Barras {chunk.bars[0]?.barNumber} a {chunk.bars[chunk.bars.length - 1]?.barNumber} de {allBars.length}
                  </span>
                </div>

                {/* Main Table for Production - Clean Table matching Section 4 */}
                <div className="overflow-x-auto my-1">
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold">
                        <th className="py-2 px-2.5 text-center border-r border-slate-300 w-20">N° Barra</th>
                        <th className="py-2 px-2.5 border-r border-slate-300 w-36">Perfil Metalon</th>
                        <th className="py-2 px-2.5 border-r border-slate-300">Peças a Cortar / Gabarito</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300 w-24">Uso Total</th>
                        <th className="py-2 px-2.5 text-right w-24">Sobra Restante</th>
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
                            <td className="py-2 px-2.5 text-center font-medium text-slate-900 border-r border-slate-300">
                              Barra {String(bar.barNumber).padStart(2, '0')}
                            </td>
                            <td className="py-2 px-2.5 text-slate-900 border-r border-slate-300">
                              {bar.profileName}
                            </td>
                            <td className="py-2 px-2.5 text-slate-800 border-r border-slate-300">
                              {pecasTexto}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-slate-900 border-r border-slate-300">
                              {usoFormatado}
                            </td>
                            <td className="py-2 px-2.5 text-right text-slate-900">
                              {sobraFormatada}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {chunk.isLast && (
                      <tfoot className="border-t-2 border-slate-400">
                        <tr className="bg-slate-100 font-bold text-slate-900">
                          <td colSpan={3} className="py-2 px-2.5 text-right border-r border-slate-300 uppercase tracking-wider text-[10px]">
                            TOTAL GERAL ({allBars.length} {allBars.length === 1 ? 'Barra' : 'Barras'} de 6,00 m = {(allBars.length * 6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m):
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900 border-r border-slate-300">
                            {totalUsoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                            {totalSobraGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* Footer with fixed page numbers */}
            <div className="mt-auto pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <a
                  href="https://skymidiabh.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#707579] hover:text-slate-900 hover:underline font-medium text-[11px]"
                >
                  https://skymidiabh.com.br/
                </a>
                <span className="text-slate-300">•</span>
                <a
                  href="https://www.instagram.com/skymidiabh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#707579] hover:text-slate-900 hover:underline font-medium text-[11px]"
                >
                  https://www.instagram.com/skymidiabh/
                </a>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Página {currentPageNumber} de {totalPages}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};
