import React from 'react';
import { MetalonInput } from '../types';
import { calculateMetalonStructure } from '../utils/calculator';

interface VisualizerProps {
  input: MetalonInput;
}

export const StructureVisualizer: React.FC<VisualizerProps> = ({ input }) => {
  const calc = React.useMemo(() => {
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
  }, [input]);

  const {
    largura,
    altura,
    linhasHorizontais,
    colunasVerticais,
    vaosVerticais,
    vaosHorizontais,
    vaoLivreVert,
    vaoLivreHoriz,
    horizontalElements,
    verticalElements,
  } = calc;

  // Spacing in cm for stats
  const espacamentoHorizCm = ((largura / vaosHorizontais) * 100).toFixed(1);
  const espacamentoVertCm = ((altura / vaosVerticais) * 100).toFixed(1);

  // SVG dimensions
  const svgWidth = 620;
  const svgHeight = 190;

  const padLeft = 85;
  const padRight = 35;
  const padTop = 32;
  const padBottom = 24;

  const availWidth = svgWidth - padLeft - padRight;
  const availHeight = svgHeight - padTop - padBottom;

  const aspectRatio = largura / Math.max(0.1, altura);
  let drawWidth = availWidth;
  let drawHeight = drawWidth / aspectRatio;

  if (drawHeight > availHeight) {
    drawHeight = availHeight;
    drawWidth = drawHeight * aspectRatio;
  }

  const startX = padLeft + (availWidth - drawWidth) / 2;
  const startY = padTop + (availHeight - drawHeight) / 2;

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="text-[#707579]">5.</span>
          Esquemas Estruturais Individuais com Numeração de Barras
        </h3>
        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">
          Barras B01 a B{String(calc.totalComEmendaComOpt).padStart(2, '0')} (Tabela 7)
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {/* 5.1 Desenho da Estrutura Horizontal */}
        <div className="bg-slate-50 text-slate-800 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                5.1 Estrutura Horizontal (Barras Numeradas da Tabela 7)
              </h4>
              <span className="text-[11px] font-medium text-slate-600">
                {linhasHorizontais} linhas • {largura.toFixed(2)} m de largura
              </span>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-3 border border-slate-200 shadow-inner overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                {/* Outer Frame Bounding Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  rx="2"
                />

                {/* Horizontal Lines with Segmented Bars & Splices */}
                {horizontalElements.map((elem, i) => {
                  const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
                  return (
                    <g key={`h-group-${i}`}>
                      {/* Left Badge with Line Label and Bar IDs */}
                      <text
                        x={startX - 8}
                        y={y + 3.5}
                        fill="#1e293b"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        L{elem.index}: {elem.barNumbersSummary}
                      </text>

                      {/* Segments across this horizontal line */}
                      {elem.segments.map((seg, sIdx) => {
                        const segX1 = startX + (seg.startM / largura) * drawWidth;
                        const segX2 = startX + (seg.endM / largura) * drawWidth;
                        const segMidX = (segX1 + segX2) / 2;
                        const segWidth = segX2 - segX1;
                        const isEvenSeg = sIdx % 2 === 0;

                        return (
                          <g key={`h-seg-${i}-${sIdx}`}>
                            {/* Segment Line */}
                            <line
                              x1={segX1}
                              y1={y}
                              x2={segX2}
                              y2={y}
                              stroke={isEvenSeg ? '#2563eb' : '#4f46e5'}
                              strokeWidth={i === 0 || i === linhasHorizontais - 1 ? '3' : '2'}
                            />

                            {/* Bar Number Tag on Segment if space permits */}
                            {segWidth > 32 && (
                              <g>
                                <rect
                                  x={segMidX - 16}
                                  y={y - 8}
                                  width="32"
                                  height="10"
                                  rx="2"
                                  fill="#ffffff"
                                  stroke={isEvenSeg ? '#2563eb' : '#4f46e5'}
                                  strokeWidth="0.8"
                                />
                                <text
                                  x={segMidX}
                                  y={y - 0.5}
                                  fill="#1e293b"
                                  fontSize="7"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  B{String(seg.barNumber).padStart(2, '0')}
                                </text>
                              </g>
                            )}

                            {/* Solder/Splice marker at connection between segments */}
                            {sIdx < elem.segments.length - 1 && (
                              <g>
                                <circle
                                  cx={segX2}
                                  y={y}
                                  r="3"
                                  fill="#ef4444"
                                  stroke="#ffffff"
                                  strokeWidth="1"
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Dimension Label Top */}
                <text
                  x={startX + drawWidth / 2}
                  y={Math.max(14, startY - 10)}
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Largura Total: {largura.toFixed(2)} m
                </text>

                {/* Dimension Label Right */}
                <text
                  x={startX + drawWidth + 14}
                  y={startY + drawHeight / 2}
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 14}, ${startY + drawHeight / 2})`}
                >
                  Altura: {altura.toFixed(2)} m
                </text>
              </svg>
            </div>
          </div>

          {/* Detailed Breakdown of Horizontal Line Bars */}
          <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span>📋</span> Composição de Barras por Linha Horizontal (Gabarito da Tabela 7):
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
              {horizontalElements.map((elem) => (
                <div
                  key={`h-legend-${elem.id}`}
                  className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200/80"
                >
                  <span className="font-semibold text-slate-800">
                    {elem.label} <span className="text-[10px] text-slate-500 font-normal">({elem.subLabel})</span>:
                  </span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                    {elem.barNumbersFull}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5.2 Desenho da Estrutura Vertical */}
        <div className="bg-slate-50 text-slate-800 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                5.2 Estrutura Vertical (Barras Numeradas da Tabela 7)
              </h4>
              <span className="text-[11px] font-medium text-amber-700 font-semibold">
                {colunasVerticais} colunas • {calc.vertCutLength.toFixed(2)} m cada
              </span>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-3 border border-slate-200 shadow-inner overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                {/* Outer Frame Bounding Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  rx="2"
                />

                {/* Vertical Columns with Column Number and Bar Number */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / (colunasVerticais - 1 || 1);
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  const isStaggered = colunasVerticais > 14 && j % 2 === 1;

                  return (
                    <g key={`v-group-${j}`}>
                      {/* Column Line */}
                      <line
                        x1={x}
                        y1={startY}
                        x2={x}
                        y2={startY + drawHeight}
                        stroke={isOuter ? '#b45309' : '#d97706'}
                        strokeWidth={isOuter ? '2.5' : '1.8'}
                      />

                      {/* Top Column Identifier Tag */}
                      <g>
                        <rect
                          x={x - 11}
                          y={startY - (isStaggered ? 20 : 12)}
                          width="22"
                          height="9"
                          rx="2"
                          fill={isOuter ? '#fef3c7' : '#ffffff'}
                          stroke="#d97706"
                          strokeWidth="0.8"
                        />
                        <text
                          x={x}
                          y={startY - (isStaggered ? 13 : 5)}
                          fill="#92400e"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          C{elem.index}
                        </text>
                      </g>

                      {/* Bottom Bar Number Tag (B19, B20...) */}
                      <g>
                        <rect
                          x={x - 11}
                          y={startY + drawHeight + (isStaggered ? 12 : 3)}
                          width="22"
                          height="9"
                          rx="2"
                          fill="#ffffff"
                          stroke="#b45309"
                          strokeWidth="0.8"
                        />
                        <text
                          x={x}
                          y={startY + drawHeight + (isStaggered ? 19 : 10)}
                          fill="#78350f"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {elem.barNumbersSummary}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Dimension Label Top */}
                <text
                  x={startX + drawWidth / 2}
                  y={Math.max(12, startY - 22)}
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Largura: {largura.toFixed(2)} m ({colunasVerticais} Colunas)
                </text>

                {/* Dimension Label Right */}
                <text
                  x={startX + drawWidth + 14}
                  y={startY + drawHeight / 2}
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 14}, ${startY + drawHeight / 2})`}
                >
                  Corte: {calc.vertCutLength.toFixed(2)} m
                </text>
              </svg>
            </div>
          </div>

          {/* Detailed Summary of Vertical Columns */}
          <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span>📋</span> Composição de Barras por Coluna Vertical (Gabarito da Tabela 7):
            </h5>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700">
              {verticalElements.map((elem) => (
                <div
                  key={`v-legend-${elem.id}`}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-50/60 rounded border border-amber-200/80 text-[10px]"
                >
                  <span className="font-bold text-amber-900">C{String(elem.index).padStart(2, '0')}:</span>
                  <span className="font-mono font-semibold text-amber-800">{elem.barNumbersSummary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
