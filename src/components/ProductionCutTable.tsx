import React from 'react';
import { MetalonInput } from '../types';
import { calculateMetalonStructure, PieceToCut, TABLE_ROWS_PER_PAGE } from '../utils/calculator';
import { ReportHeader, ReportFooter } from './ReportViewer';

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
  source,
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

  // Divide bars into clean full pages (24 bars per page fills the A4 page height)
  const rowsPerPage = TABLE_ROWS_PER_PAGE;
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
  }, [allBars, rowsPerPage]);

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
            className="pdf-page latex-document font-serif bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
            style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
          >
            {/* Top Container */}
            <div className="flex-1 flex flex-col justify-start">
              {/* LaTeX Header */}
              <ReportHeader dateStr={dateStr} source={source} />

              <div className="space-y-2 my-1 flex-1 font-serif">
                {/* Section Title */}
                <div className="border-b border-slate-700 pb-1 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                    <span>7.</span>
                    Tabela de Corte de Barras para a Produção
                    {chunk.totalChunks > 1 && (
                      <span className="text-xs font-normal text-slate-600 font-serif">
                        (Folha {chunk.pageIndex + 1} de {chunk.totalChunks})
                      </span>
                    )}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-700 font-serif">
                    Barras {chunk.bars[0]?.barNumber} a {chunk.bars[chunk.bars.length - 1]?.barNumber} de {allBars.length}
                  </span>
                </div>

                {/* Main Table for Production - LaTeX Booktabs Design */}
                <div className="overflow-x-auto my-1">
                  <table className="booktabs-table w-full text-left text-xs font-serif">
                    <thead>
                      <tr>
                        <th className="w-20 text-center">N° Barra</th>
                        <th className="w-36 text-left">Perfil Metalon</th>
                        <th className="text-left">Peças a Cortar / Gabarito</th>
                        <th className="w-24 text-right">Uso Total</th>
                        <th className="w-24 text-right">Sobra Restante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.bars.map((bar) => {
                        const pecasTexto = bar.pieces
                          .map((p) => `1× ${p.description} (${p.length.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m)`)
                          .join(' + ');

                        const usoFormatado = `${bar.usedLength.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
                        const sobraFormatada = bar.remainingLength > 0.001
                          ? `${bar.remainingLength.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
                          : '0,00 m';

                        return (
                          <tr key={`bar-${bar.barNumber}`}>
                            <td className="text-center font-medium text-slate-900 font-mono text-[11px]">
                              Barra {String(bar.barNumber).padStart(2, '0')}
                            </td>
                            <td className="text-slate-900 font-serif">
                              {bar.profileName}
                            </td>
                            <td className="text-slate-800 font-serif">
                              {pecasTexto}
                            </td>
                            <td className="text-right font-medium text-slate-900 font-serif">
                              {usoFormatado}
                            </td>
                            <td className="text-right text-slate-700 font-serif">
                              {sobraFormatada}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {chunk.isLast && (
                      <tfoot>
                        <tr className="border-t border-slate-700 font-bold text-slate-900 font-serif">
                          <td colSpan={3} className="text-right uppercase tracking-wider text-[11px] font-serif pt-2 pb-2">
                            TOTAL GERAL ({allBars.length} {allBars.length === 1 ? 'Barra' : 'Barras'} de 6,00 m = {(allBars.length * 6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m):
                          </td>
                          <td className="text-right font-bold text-slate-900 font-serif pt-2 pb-2">
                            {totalUsoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m
                          </td>
                          <td className="text-right font-bold text-slate-900 font-serif pt-2 pb-2">
                            {totalSobraGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* LaTeX Footer */}
            <ReportFooter pageNum={currentPageNumber} totalPages={totalPages} />
          </div>
        );
      })}
    </>
  );
};
