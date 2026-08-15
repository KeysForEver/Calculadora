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
    horizontalElements,
    verticalElements,
    vaoLivreHoriz,
    vaoLivreVert,
    vertCutLength,
  } = calc;

  // Optimized SVG dimensions fitting A4 width perfectly (720px)
  const svgWidth = 720;
  const svgHeight = 160;

  const padLeft = 85;
  const padRight = 55;
  const padTop = 32;
  const padBottom = 32;

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
    <div className="space-y-4">
      {/* Section Title */}
      <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="text-[#707579]">5.</span>
          Esquemas Estruturais Individuais com Numeração de Barras
        </h3>
        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
          Barras B01 a B{String(calc.totalComEmendaComOpt).padStart(2, '0')} (Tabela 7)
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        {/* 5.1 Desenho da Estrutura Horizontal */}
        <div className="bg-slate-50/80 text-slate-800 rounded-xl p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              5.1 Estrutura Horizontal (Emendas e Barras da Tabela 7)
            </h4>
            <span className="text-[10px] font-medium text-slate-600">
              {linhasHorizontais} linhas • {largura.toFixed(2)} m cada • Vão livre vertical: ~{(vaoLivreVert * 100).toFixed(1)} cm
            </span>
          </div>

          <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
            <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
              {/* Outer Frame Bounding Box */}
              <rect
                x={startX}
                y={startY}
                width={drawWidth}
                height={drawHeight}
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                rx="2"
              />

              {/* Horizontal Lines with Segmented Bars & Splices */}
              {horizontalElements.map((elem, i) => {
                const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
                const isBorder = i === 0 || i === linhasHorizontais - 1;

                return (
                  <g key={`h-group-${i}`}>
                    {/* Left Line Label with Bar Number Summary */}
                    <g>
                      <rect
                        x={startX - 78}
                        y={y - 7}
                        width="72"
                        height="14"
                        rx="3"
                        fill={isBorder ? '#eff6ff' : '#f8fafc'}
                        stroke={isBorder ? '#3b82f6' : '#94a3b8'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={startX - 42}
                        y={y + 3}
                        fill={isBorder ? '#1d4ed8' : '#334155'}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        L{elem.index}: {elem.barNumbersSummary}
                      </text>
                    </g>

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
                            strokeWidth={isBorder ? '3' : '2'}
                            strokeLinecap="round"
                          />

                          {/* Bar Number Tag on Segment */}
                          {segWidth > 26 && (
                            <g>
                              <rect
                                x={segMidX - 16}
                                y={y - 8}
                                width="32"
                                height="11"
                                rx="2.5"
                                fill="#ffffff"
                                stroke={isEvenSeg ? '#2563eb' : '#4f46e5'}
                                strokeWidth="0.9"
                              />
                              <text
                                x={segMidX}
                                y={y - 0.2}
                                fill="#0f172a"
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
                                r="3.5"
                                fill="#ef4444"
                                stroke="#ffffff"
                                strokeWidth="1.2"
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
                fill="#334155"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                Largura Total: {largura.toFixed(2)} m ({linhasHorizontais} Linhas Horizontais)
              </text>

              {/* Dimension Label Right */}
              <text
                x={startX + drawWidth + 18}
                y={startY + drawHeight / 2}
                fill="#334155"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(90, ${startX + drawWidth + 18}, ${startY + drawHeight / 2})`}
              >
                Altura: {altura.toFixed(2)} m
              </text>
            </svg>
          </div>
        </div>

        {/* 5.2 Desenho da Estrutura Vertical */}
        <div className="bg-slate-50/80 text-slate-800 rounded-xl p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              5.2 Estrutura Vertical (Colunas e Numeração de Barras)
            </h4>
            <span className="text-[10px] font-semibold text-amber-800">
              {colunasVerticais} colunas • {vertCutLength.toFixed(2)} m cada • Vão livre horizontal: ~{(vaoLivreHoriz * 100).toFixed(1)} cm
            </span>
          </div>

          <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
            <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
              {/* Outer Frame Bounding Box */}
              <rect
                x={startX}
                y={startY}
                width={drawWidth}
                height={drawHeight}
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                rx="2"
              />

              {/* Vertical Columns with Column Number and Bar Number */}
              {verticalElements.map((elem, j) => {
                const x = startX + (j * drawWidth) / (colunasVerticais - 1 || 1);
                const isOuter = j === 0 || j === colunasVerticais - 1;
                // Smart 2-tier staggering to prevent ANY label overlap when many columns exist
                const isStaggered = colunasVerticais > 12 && j % 2 === 1;

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
                      strokeLinecap="round"
                    />

                    {/* Top Column Identifier Tag (C1, C2...) */}
                    <g>
                      <rect
                        x={x - 10}
                        y={startY - (isStaggered ? 21 : 12)}
                        width="20"
                        height="9.5"
                        rx="2"
                        fill={isOuter ? '#fef3c7' : '#ffffff'}
                        stroke="#d97706"
                        strokeWidth="0.7"
                      />
                      <text
                        x={x}
                        y={startY - (isStaggered ? 14 : 5)}
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
                        x={x - 10}
                        y={startY + drawHeight + (isStaggered ? 12 : 3)}
                        width="20"
                        height="9.5"
                        rx="2"
                        fill="#ffffff"
                        stroke="#b45309"
                        strokeWidth="0.7"
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
                y={Math.max(12, startY - 23)}
                fill="#334155"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                Largura Total: {largura.toFixed(2)} m ({colunasVerticais} Colunas Verticais)
              </text>

              {/* Dimension Label Right */}
              <text
                x={startX + drawWidth + 18}
                y={startY + drawHeight / 2}
                fill="#334155"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(90, ${startX + drawWidth + 18}, ${startY + drawHeight / 2})`}
              >
                Corte: {calc.vertCutLength.toFixed(2)} m
              </text>
            </svg>
          </div>

          {/* Column reference note */}
          <div className="mt-2 text-[10px] text-slate-600 bg-white p-1.5 rounded border border-slate-200 flex items-center justify-between">
            <span>
              <strong>Colunas C1 a C{colunasVerticais}:</strong> {colunasVerticais} peças de corte com <strong>{vertCutLength.toFixed(2)} m</strong> cada.
            </span>
            <span>
              <strong>Barras de Produção:</strong> {verticalElements[0]?.barNumbersSummary} a {verticalElements[verticalElements.length - 1]?.barNumbersSummary} (Tabela 7)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
