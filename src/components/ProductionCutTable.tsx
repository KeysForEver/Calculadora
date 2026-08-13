import React from 'react';
import { MetalonInput } from '../types';

interface ProductionCutTableProps {
  input: MetalonInput;
}

interface PieceToCut {
  type: 'Horizontal' | 'Vertical';
  length: number;
  description: string;
}

interface AllocatedBar {
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

export const ProductionCutTable: React.FC<ProductionCutTableProps> = ({ input }) => {
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

  // Calculate totals & welding stats
  const totalBarsCount = allBars.length;
  const totalAvailableMeterage = totalBarsCount * 6.0;
  const totalUsedMeterage = allBars.reduce((acc, bar) => acc + bar.usedLength, 0);
  const totalRemainingMeterage = allBars.reduce((acc, bar) => acc + bar.remainingLength, 0);
  const globalEfficiency = totalAvailableMeterage > 0 ? (totalUsedMeterage / totalAvailableMeterage) * 100 : 0;

  // Calculate base long piece welds (>6m)
  const horizSplicesPerPiece = Math.floor(largura / 6.0);
  const vertSplicesPerPiece = Math.floor(vertCutM / 6.0);
  const totalWelds = (linhasHorizontais * horizSplicesPerPiece) + (colunasVerticais * vertSplicesPerPiece);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="border-b border-slate-200 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-[#707579]">7.</span>
            Tabela de Corte de Barras para a Produção
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-md">
            Chão de Fábrica
          </span>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
          <span className="text-slate-500 font-medium block text-[11px]">Total de Barras (6m):</span>
          <strong className="text-slate-900 text-base font-extrabold">{totalBarsCount} barras</strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
          <span className="text-slate-500 font-medium block text-[11px]">Metragem Utilizada:</span>
          <strong className="text-blue-700 text-base font-extrabold">{totalUsedMeterage.toFixed(2)} m</strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
          <span className="text-slate-500 font-medium block text-[11px]">Sobra Total (Retalhos):</span>
          <strong className="text-amber-700 text-base font-extrabold">{totalRemainingMeterage.toFixed(2)} m</strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
          <span className="text-slate-500 font-medium block text-[11px]">Pontos de Solda / Emendas:</span>
          <strong className="text-purple-700 text-base font-extrabold">{totalWelds} solda(s)</strong>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
          <span className="text-slate-500 font-medium block text-[11px]">Aproveitamento Global:</span>
          <strong className="text-emerald-700 text-base font-extrabold">{globalEfficiency.toFixed(1)}%</strong>
        </div>
      </div>

      {/* Main Table for Production */}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3 w-24">N° Barra</th>
              <th className="py-2.5 px-3 w-36">Perfil Metalon</th>
              <th className="py-2.5 px-3">Peças a Cortar / Gabarito</th>
              <th className="py-2.5 px-3 w-28 text-right">Uso Total</th>
              <th className="py-2.5 px-3 w-32 text-right">Sobra Restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {allBars.map((bar) => {
              const hasRemaining = bar.remainingLength > 0.005;
              return (
                <tr key={`bar-${bar.barNumber}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center justify-center font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                      Barra {String(bar.barNumber).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800">
                    {bar.profileName}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {bar.pieces.map((piece, pIdx) => (
                        <span
                          key={`p-${bar.barNumber}-${pIdx}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${
                            piece.type === 'Horizontal'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <strong>{piece.description}:</strong> {piece.length.toFixed(2)} m
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {bar.usedLength.toFixed(2)} m
                  </td>
                  <td className="py-2 px-3 text-right">
                    {hasRemaining ? (
                      <span className="inline-block font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                        {bar.remainingLength.toFixed(2)} m
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium text-[11px]">
                        0,00 m (Sem sobra)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Production Guidance & Cost Logic Box */}
      <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed font-medium space-y-2">
        <div className="font-bold text-blue-900 flex items-center gap-1.5">
          <span>⚡</span>
          <span>Critério de Otimização de Custo e Soldagem:</span>
        </div>
        <p className="text-[11px] text-blue-900 leading-normal">
          <strong>1. Prioridade Absoluta:</strong> Menor número total de barras de 6m compradas no projeto (redução direta do custo de matéria-prima).<br />
          <strong>2. Prioridade Secundária:</strong> Menor número de pontos de solda / emendas adicionais. Se o <em>Cenário 2 (Sem Emenda)</em> resultar na mesma quantidade de barras que o <em>Cenário 3 (Com Emenda)</em>, o Cenário 2 é preferido por eliminar a mão de obra de soldagem.
        </p>

        <div className="font-bold text-blue-900 pt-1 flex items-center gap-1.5 border-t border-blue-200">
          <span>🛠️</span>
          <span>Instruções para Chão de Fábrica e Corte:</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-900">
          <li>
            Identifique cada barra de 6m com giz ou etiqueta correspondente ao número da barra (ex: <strong>B-01</strong>, <strong>B-02</strong>) antes de efetuar os cortes.
          </li>
          <li>
            Considere a espessura do disco de corte (aproximadamente 2 mm a 3 mm por corte) ao traçar as medidas na barra.
          </li>
          <li>
            Guarde e identifique os retalhos de sobra para aproveitamento conforme a indicação do plano de corte.
          </li>
        </ul>
      </div>
    </div>
  );
};
