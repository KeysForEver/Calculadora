import React from 'react';
import { MetalonInput } from '../types';
import { calculateMetalonStructure } from '../utils/calculator';

interface TechnicalProjectDrawingProps {
  input: MetalonInput;
}

export const TechnicalProjectDrawing: React.FC<TechnicalProjectDrawingProps> = ({ input }) => {
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
    profileExt,
    linhasHorizontais,
    colunasVerticais,
    vaoLivreHoriz,
    vaoLivreVert,
    vertCutLength,
    horizontalElements,
    verticalElements,
    totalComEmendaComOpt,
  } = calc;

  const extFaceMm = Math.round(profileExt.faceSizeM * 1000);

  // Spacious SVG dimensions for clear visual blueprints
  const svgWidth = 640;
  const svgHeight = 175;

  const padLeft = 65;
  const padRight = 40;
  const padTop = 28;
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

  // Helper renderer for SVG Blueprint per scenario
  const renderBlueprintSVG = (scenario: 1 | 2 | 3) => {
    return (
      <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
        {/* Background Grid Pattern */}
        <defs>
          <pattern id={`grid-${scenario}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={svgWidth} height={svgHeight} fill={`url(#grid-${scenario})`} rx="8" />

        {/* Outer Frame */}
        <rect
          x={startX}
          y={startY}
          width={drawWidth}
          height={drawHeight}
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth="2.5"
          rx="2"
        />

        {/* Horizontal Lines */}
        {horizontalElements.map((elem, i) => {
          const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
          return (
            <g key={`h-line-${scenario}-${i}`}>
              {/* Left Label */}
              <text
                x={startX - 6}
                y={y + 3}
                fill="#334155"
                fontSize="8"
                fontWeight="bold"
                textAnchor="end"
              >
                L{elem.index}
              </text>

              {scenario === 3 ? (
                /* Scenario 3: Draw segments and splices with Bar Numbers */
                elem.segments.map((seg, sIdx) => {
                  const segX1 = startX + (seg.startM / largura) * drawWidth;
                  const segX2 = startX + (seg.endM / largura) * drawWidth;
                  const segMidX = (segX1 + segX2) / 2;
                  const segWidth = segX2 - segX1;

                  return (
                    <g key={`h-sc3-seg-${i}-${sIdx}`}>
                      <line
                        x1={segX1}
                        y1={y}
                        x2={segX2}
                        y2={y}
                        stroke="#2563eb"
                        strokeWidth={i === 0 || i === linhasHorizontais - 1 ? '2.5' : '1.8'}
                      />
                      {segWidth > 28 && (
                        <g>
                          <rect
                            x={segMidX - 13}
                            y={y - 7}
                            width="26"
                            height="10"
                            rx="2"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="0.8"
                          />
                          <text
                            x={segMidX}
                            y={y + 0.5}
                            fill="#1e293b"
                            fontSize="6.5"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            B{String(seg.barNumber).padStart(2, '0')}
                          </text>
                        </g>
                      )}
                      {/* Solder point */}
                      {sIdx < elem.segments.length - 1 && (
                        <g>
                          <circle cx={segX2} cy={y} r="3.5" fill="#dc2626" stroke="#ffffff" strokeWidth="1.2" />
                        </g>
                      )}
                    </g>
                  );
                })
              ) : (
                /* Scenario 1 & 2: Continuous line */
                <line
                  x1={startX}
                  y1={y}
                  x2={startX + drawWidth}
                  y2={y}
                  stroke="#2563eb"
                  strokeWidth={i === 0 || i === linhasHorizontais - 1 ? '2.5' : '1.8'}
                />
              )}
            </g>
          );
        })}

        {/* Vertical Columns */}
        {verticalElements.map((elem, j) => {
          const x = startX + (j * drawWidth) / (colunasVerticais - 1 || 1);
          const isStaggered = colunasVerticais > 14 && j % 2 === 1;

          return (
            <g key={`v-col-${scenario}-${j}`}>
              <line
                x1={x}
                y1={startY}
                x2={x}
                y2={startY + drawHeight}
                stroke="#d97706"
                strokeWidth={j === 0 || j === colunasVerticais - 1 ? '2.2' : '1.5'}
              />

              {/* Column Top Identifier */}
              <text
                x={x}
                y={startY - (isStaggered ? 12 : 5)}
                fill="#b45309"
                fontSize="6.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                {scenario === 3 ? `C${elem.index}: ${elem.barNumbersSummary}` : `C${elem.index}`}
              </text>
            </g>
          );
        })}

        {/* Top Cota Line - Width */}
        <line x1={startX} y1={startY - 18} x2={startX + drawWidth} y2={startY - 18} stroke="#475569" strokeWidth="1" />
        <line x1={startX} y1={startY - 22} x2={startX} y2={startY - 14} stroke="#475569" strokeWidth="1" />
        <line x1={startX + drawWidth} y1={startY - 22} x2={startX + drawWidth} y2={startY - 14} stroke="#475569" strokeWidth="1" />
        <text
          x={startX + drawWidth / 2}
          y={startY - 20}
          fill="#0f172a"
          fontSize="9.5"
          fontWeight="bold"
          textAnchor="middle"
        >
          Largura Total: {largura.toFixed(2)} m
        </text>

        {/* Left Cota Line - Height */}
        <line x1={startX - 18} y1={startY} x2={startX - 18} y2={startY + drawHeight} stroke="#475569" strokeWidth="1" />
        <line x1={startX - 22} y1={startY} x2={startX - 14} y2={startY} stroke="#475569" strokeWidth="1" />
        <line x1={startX - 22} y1={startY + drawHeight} x2={startX - 14} y2={startY + drawHeight} stroke="#475569" strokeWidth="1" />
        <text
          x={startX - 22}
          y={startY + drawHeight / 2}
          fill="#0f172a"
          fontSize="9.5"
          fontWeight="bold"
          textAnchor="middle"
          transform={`rotate(-90, ${startX - 22}, ${startY + drawHeight / 2})`}
        >
          Altura: {altura.toFixed(2)} m
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="border-b border-slate-200 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-[#707579]">6.</span>
            Esquemas de Montagem e Gabaritos por Cenário de Execução
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-300">
            3 Métodos de Montagem
          </span>
        </div>
      </div>

      {/* Grid containing the 3 Scenario Assembly Diagrams */}
      <div className="space-y-4">
        {/* Scenario 1 Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cenário 1: Sem Emenda e Sem Otimização (Compra Direta por Peça)
              </h4>
            </div>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
              Peças Isoladas
            </span>
          </div>
          <div className="flex justify-center items-center bg-white rounded-lg p-2.5 border border-slate-200 shadow-inner overflow-x-auto">
            {renderBlueprintSVG(1)}
          </div>
        </div>

        {/* Scenario 2 Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cenário 2: Sem Emenda com Otimização de Plano de Corte (Peças Inteiras)
              </h4>
            </div>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Aproveitamento de Sobras
            </span>
          </div>
          <div className="flex justify-center items-center bg-white rounded-lg p-2.5 border border-slate-200 shadow-inner overflow-x-auto">
            {renderBlueprintSVG(2)}
          </div>
        </div>

        {/* Scenario 3 Card */}
        <div className="bg-slate-50 border-2 border-emerald-500/40 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cenário 3: Com Emenda e Otimização Total (Reflete a Tabela 7 de Produção)
              </h4>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Barras B01 a B{String(totalComEmendaComOpt).padStart(2, '0')}
            </span>
          </div>
          <div className="flex justify-center items-center bg-white rounded-lg p-2.5 border border-slate-200 shadow-inner overflow-x-auto">
            {renderBlueprintSVG(3)}
          </div>
        </div>
      </div>

      {/* Technical Measurements Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-xs">
        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-900"></span>
          Resumo de Medidas de Corte e Vãos Livres de Montagem:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Corte Horizontais:</span>
            <strong className="text-slate-900">{largura.toFixed(2)} m</strong> ({linhasHorizontais}x)
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Corte Verticais (-{2 * extFaceMm}mm):</span>
            <strong className="text-slate-900">{vertCutLength.toFixed(3)} m</strong> ({colunasVerticais}x)
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Vão Livre Horizontal:</span>
            <strong className="text-slate-900">~{(vaoLivreHoriz * 100).toFixed(1)} cm</strong>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Vão Livre Vertical:</span>
            <strong className="text-slate-900">~{(vaoLivreVert * 100).toFixed(1)} cm</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
