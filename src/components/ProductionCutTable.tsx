import React from 'react';
import { MetalonInput } from '../types';
import {
  calculateMetalonStructure,
  UniquePieceItem,
  calculateProductionTablePagesCount,
} from '../utils/calculator';
import { ReportHeader, ReportFooter } from './ReportViewer';

export interface ProductionCutTableProps {
  input: MetalonInput;
  dateStr?: string;
  source?: 'gemini' | 'calculator';
  startPageNum?: number;
  totalPages?: number;
}

interface TablePageChunk {
  pageIndex: number;
  totalChunks: number;
  isFirst: boolean;
  isLast: boolean;
  pieces: UniquePieceItem[];
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

  const uniquePieces = calcResult.uniquePiecesSummary;

  const totalPiecesCount = React.useMemo(() => {
    return uniquePieces.reduce((sum, item) => sum + item.quantity, 0);
  }, [uniquePieces]);

  const totalPiecesMetragem = React.useMemo(() => {
    return uniquePieces.reduce((sum, item) => sum + item.totalLength, 0);
  }, [uniquePieces]);

  // Consumo de Fita VHB (9 mm de largura com rolos de 33 m) e Primer (0,6 ml por metro de fita)
  const totalFitaVhbMetros = totalPiecesMetragem;
  const rolosFitaVhb = Math.ceil(totalFitaVhbMetros / 33);
  const totalPrimerMl = totalFitaVhbMetros * 0.6;

  const rowsPerPage = 18;
  const chunks: TablePageChunk[] = React.useMemo(() => {
    const result: TablePageChunk[] = [];
    const totalChunks = calculateProductionTablePagesCount(uniquePieces.length);

    for (let p = 0; p < totalChunks; p++) {
      const sliceStart = p * rowsPerPage;
      const sliceEnd = sliceStart + rowsPerPage;
      result.push({
        pageIndex: p,
        totalChunks,
        isFirst: p === 0,
        isLast: p === totalChunks - 1,
        pieces: uniquePieces.slice(sliceStart, sliceEnd),
      });
    }

    return result;
  }, [uniquePieces]);

  return (
    <>
      {chunks.map((chunk, cIdx) => {
        const currentPageNumber = startPageNum + cIdx;

        return (
          <div
            key={`chunk-page-${cIdx}`}
            id={`production-table-page-${cIdx + 1}`}
            className="pdf-page latex-document font-serif bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
            style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
          >
            {/* Top Container */}
            <div className="flex-1 flex flex-col justify-start">
              {/* Header */}
              <ReportHeader dateStr={dateStr} source={source} />

              <div className="space-y-4 my-1 flex-1 font-serif">
                {/* Main Section Header */}
                <div className="border-b border-slate-700 pb-1 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                    <span>7.</span>
                    Tabela Resumida de Corte de Peças para a Produção
                    {chunk.totalChunks > 1 && (
                      <span className="text-xs font-normal text-slate-600 font-serif">
                        (Folha {chunk.pageIndex + 1} de {chunk.totalChunks})
                      </span>
                    )}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-700 font-serif">
                    {totalPiecesCount} Peças • {calcResult.totalBarrasOtimizado} Barras de 6,00 m
                  </span>
                </div>

                {/* Subtitle description */}
                <div className="text-xs text-slate-700 font-serif leading-relaxed">
                  Lista consolidada e agrupada por comprimento exclusivo de corte para guia direta do operador de corte na serralheria:
                </div>

                {/* TABLE OF PIECES */}
                <div className="overflow-x-auto">
                  <table className="booktabs-table w-full text-left text-xs font-serif">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">Item</th>
                        <th className="w-16 text-center font-bold text-slate-900">Qtd</th>
                        <th className="w-36 text-left font-bold text-slate-900">Comprimento de Corte</th>
                        <th className="text-left">Descrição da Peça / Identificação no Gabarito</th>
                        <th className="w-36 text-left">Perfil Metalon</th>
                        <th className="w-28 text-right">Metragem Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.pieces.map((item) => (
                        <tr key={item.id}>
                          <td className="text-center font-mono text-[11px] text-slate-700">
                            {item.itemNumber}
                          </td>
                          <td className="text-center font-bold text-slate-950 text-[12px] bg-slate-50/50">
                            {item.quantity}×
                          </td>
                          <td className="text-left font-bold text-slate-900 font-mono text-[11px]">
                            {item.lengthFormatted}
                            <span className="text-[10px] text-slate-500 font-normal ml-1">
                              ({item.lengthCmFormatted})
                            </span>
                          </td>
                          <td className="text-slate-800">
                            <div className="font-medium text-slate-900">{item.description}</div>
                            <div className="text-[10px] text-slate-600 italic leading-tight">
                              {item.elementsSummary}
                            </div>
                          </td>
                          <td className="text-slate-800 text-[11px]">
                            {item.profileName}
                          </td>
                          <td className="text-right font-medium text-slate-900 font-mono text-[11px]">
                            {item.totalLengthFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {chunk.isLast && (
                      <tfoot>
                        {/* Linha 1: Soma da Metragem Efetiva de Corte */}
                        <tr className="border-t border-slate-700 font-bold text-slate-900 text-[11px]">
                          <td colSpan={2} className="text-center bg-slate-50 py-2 font-bold">
                            {totalPiecesCount} PEÇAS
                          </td>
                          <td colSpan={3} className="text-right uppercase tracking-wider py-2">
                            SOMA DA METRAGEM EFETIVA DE CORTE:
                          </td>
                          <td className="text-right font-bold py-2 font-mono">
                            {totalPiecesMetragem.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            m
                          </td>
                        </tr>

                        {/* Linha 2: Total de Fita VHB de 9 mm de largura (Rolos de 33 m) */}
                        <tr className="border-t border-slate-300 font-medium text-slate-900 text-[11px] bg-slate-50/50">
                          <td colSpan={2} className="text-center text-slate-700 font-bold py-1.5">
                            FITA VHB
                          </td>
                          <td colSpan={3} className="text-right uppercase tracking-wider py-1.5 text-slate-800">
                            TOTAL DE FITA VHB 9 mm (ROLOS DE 33 m × 9 mm):
                          </td>
                          <td className="text-right font-bold py-1.5 font-mono text-slate-900">
                            {rolosFitaVhb} {rolosFitaVhb === 1 ? 'rolo' : 'rolos'}
                            <span className="text-[10px] text-slate-600 font-normal ml-1 block">
                              ({totalFitaVhbMetros.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              m)
                            </span>
                          </td>
                        </tr>

                        {/* Linha 3: Total de Primer (0,6 ml por metro de fita) */}
                        <tr className="border-t border-slate-300 font-medium text-slate-900 text-[11px] bg-slate-50/50">
                          <td colSpan={2} className="text-center text-slate-700 font-bold py-1.5">
                            PRIMER
                          </td>
                          <td colSpan={3} className="text-right uppercase tracking-wider py-1.5 text-slate-800">
                            TOTAL DE PRIMER ESTIMADO (0,6 ml / METRO DE FITA):
                          </td>
                          <td className="text-right font-bold py-1.5 font-mono text-slate-900">
                            {totalPrimerMl.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}{' '}
                            ml
                            {totalPrimerMl >= 1000 && (
                              <span className="text-[10px] text-slate-500 font-normal ml-1 block">
                                ({(totalPrimerMl / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L)
                              </span>
                            )}
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
