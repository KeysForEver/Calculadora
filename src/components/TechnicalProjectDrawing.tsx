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
    totalSemEmendaSemOpt,
    totalSemEmendaComOpt,
    weldsCountScenario3,
  } = calc;

  const extFaceMm = Math.round(profileExt.faceSizeM * 1000);

  // Large, high-precision Master Blueprint dimensions
  const svgWidth = 720;
  const svgHeight = 230;

  const padLeft = 75;
  const padRight = 50;
  const padTop = 32;
  const padBottom = 28;

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
    <div className="space-y-3.5">
      {/* Section Header */}
      <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="text-[#707579]">6.</span>
          Gabarito Técnico de Montagem e Solda da Estrutura
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
          Gabarito Oficial de Produção (Barras B01 a B{String(totalComEmendaComOpt).padStart(2, '0')})
        </span>
      </div>

      {/* Main Master Technical Blueprint Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Planta Técnica de Montagem com Posicionamento de Emendas e Soldas
            </h4>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
            {weldsCountScenario3} Pontos de Solda / Emendas
          </span>
        </div>

        <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
            {/* Background Blueprint Grid */}
            <defs>
              <pattern id="master-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f8fafc" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#master-grid)" rx="6" />

            {/* Outer Structural Perimeter Frame */}
            <rect
              x={startX}
              y={startY}
              width={drawWidth}
              height={drawHeight}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="2.5"
              rx="2"
            />

            {/* Horizontal Grid Lines with Segments & Solder Points */}
            {horizontalElements.map((elem, i) => {
              const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
              const isBorder = i === 0 || i === linhasHorizontais - 1;

              return (
                <g key={`master-h-${i}`}>
                  {/* Left Line Label */}
                  <text
                    x={startX - 8}
                    y={y + 3}
                    fill={isBorder ? '#1e3a8a' : '#334155'}
                    fontSize="7.5"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    L{elem.index}
                  </text>

                  {/* Line Segments */}
                  {elem.segments.map((seg, sIdx) => {
                    const segX1 = startX + (seg.startM / largura) * drawWidth;
                    const segX2 = startX + (seg.endM / largura) * drawWidth;
                    const segMidX = (segX1 + segX2) / 2;
                    const segWidth = segX2 - segX1;

                    return (
                      <g key={`master-h-seg-${i}-${sIdx}`}>
                        <line
                          x1={segX1}
                          y1={y}
                          x2={segX2}
                          y2={y}
                          stroke="#2563eb"
                          strokeWidth={isBorder ? '2.5' : '1.8'}
                        />

                        {/* Bar Tag Badge on Segment */}
                        {segWidth > 26 && (
                          <g>
                            <rect
                              x={segMidX - 14}
                              y={y - 7}
                              width="28"
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

                        {/* Solder Point Crosshair/Dot */}
                        {sIdx < elem.segments.length - 1 && (
                          <g>
                            <circle
                              cx={segX2}
                              cy={y}
                              r="3.5"
                              fill="#dc2626"
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

            {/* Vertical Columns */}
            {verticalElements.map((elem, j) => {
              const x = startX + (j * drawWidth) / (colunasVerticais - 1 || 1);
              const isOuter = j === 0 || j === colunasVerticais - 1;
              const isStaggered = colunasVerticais > 12 && j % 2 === 1;

              return (
                <g key={`master-v-${j}`}>
                  <line
                    x1={x}
                    y1={startY}
                    x2={x}
                    y2={startY + drawHeight}
                    stroke={isOuter ? '#92400e' : '#d97706'}
                    strokeWidth={isOuter ? '2.2' : '1.4'}
                  />

                  {/* Column Identifier Top */}
                  <text
                    x={x}
                    y={startY - (isStaggered ? 13 : 5)}
                    fill="#92400e"
                    fontSize="6"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    C{elem.index}
                  </text>
                </g>
              );
            })}

            {/* Top Cota Line - Width */}
            <line x1={startX} y1={startY - 18} x2={startX + drawWidth} y2={startY - 18} stroke="#334155" strokeWidth="1" />
            <line x1={startX} y1={startY - 21} x2={startX} y2={startY - 15} stroke="#334155" strokeWidth="1" />
            <line x1={startX + drawWidth} y1={startY - 21} x2={startX + drawWidth} y2={startY - 15} stroke="#334155" strokeWidth="1" />
            <text
              x={startX + drawWidth / 2}
              y={startY - 20}
              fill="#0f172a"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              Largura Total: {largura.toFixed(2)} m ({colunasVerticais} Colunas)
            </text>

            {/* Left Cota Line - Height */}
            <line x1={startX - 18} y1={startY} x2={startX - 18} y2={startY + drawHeight} stroke="#334155" strokeWidth="1" />
            <line x1={startX - 21} y1={startY} x2={startX - 15} y2={startY} stroke="#334155" strokeWidth="1" />
            <line x1={startX - 21} y1={startY + drawHeight} x2={startX - 15} y2={startY + drawHeight} stroke="#334155" strokeWidth="1" />
            <text
              x={startX - 22}
              y={startY + drawHeight / 2}
              fill="#0f172a"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              transform={`rotate(-90, ${startX - 22}, ${startY + drawHeight / 2})`}
            >
              Altura: {altura.toFixed(2)} m
            </text>

            {/* Right Cota Line - Column Cut */}
            <line x1={startX + drawWidth + 16} y1={startY} x2={startX + drawWidth + 16} y2={startY + drawHeight} stroke="#d97706" strokeWidth="1" strokeDasharray="2 2" />
            <text
              x={startX + drawWidth + 26}
              y={startY + drawHeight / 2}
              fill="#92400e"
              fontSize="8.5"
              fontWeight="bold"
              textAnchor="middle"
              transform={`rotate(90, ${startX + drawWidth + 26}, ${startY + drawHeight / 2})`}
            >
              Corte Colunas: {vertCutLength.toFixed(2)} m
            </text>
          </svg>
        </div>
      </div>

      {/* Assembly Instructions in 4 Steps */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-slate-900"></span>
          Roteiro Prático de Montagem na Oficina:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          <div className="bg-white p-2 rounded border border-slate-200">
            <strong className="text-blue-900 block mb-0.5">1. Quadro Externo:</strong>
            Montar e esquadrejar os perfis perimetrais de {largura.toFixed(2)} m e {altura.toFixed(2)} m conferindo diagonais.
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <strong className="text-blue-900 block mb-0.5">2. Emendas Horizontais:</strong>
            Soldar os trechos de 6,00 m e pontas de fechamento (Barras B01 a B18 e B46 a B48) nas posições indicadas pelos pontos vermelhos.
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <strong className="text-amber-900 block mb-0.5">3. Colunas Verticais:</strong>
            Cortar as {colunasVerticais} colunas com {vertCutLength.toFixed(2)} m (Barras B19 a B45) e soldar entre as barras horizontais.
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <strong className="text-emerald-900 block mb-0.5">4. Conferência dos Vãos:</strong>
            Verificar os vãos livres de ~{(vaoLivreHoriz * 100).toFixed(1)} cm (H) × ~{(vaoLivreVert * 100).toFixed(1)} cm (V) antes da solda final.
          </div>
        </div>
      </div>

      {/* Technical Measurements Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Corte Horizontais:</span>
            <strong className="text-slate-900">{largura.toFixed(2)} m</strong> ({linhasHorizontais}x)
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Corte Verticais (-{2 * extFaceMm}mm):</span>
            <strong className="text-slate-900">{vertCutLength.toFixed(3)} m</strong> ({colunasVerticais}x)
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Vão Livre Horizontal:</span>
            <strong className="text-slate-900">~{(vaoLivreHoriz * 100).toFixed(1)} cm</strong>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Vão Livre Vertical:</span>
            <strong className="text-slate-900">~{(vaoLivreVert * 100).toFixed(1)} cm</strong>
          </div>
        </div>
      </div>

      {/* Scenario Comparison Footer Banner */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-700">
        <span><strong>Cenário 1 (Sem Otimização):</strong> {totalSemEmendaSemOpt} barras</span>
        <span><strong>Cenário 2 (Peças Inteiras):</strong> {totalSemEmendaComOpt} barras</span>
        <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
          Cenário 3 (Produção com Emenda): {totalComEmendaComOpt} barras (Economia Máxima)
        </span>
      </div>
    </div>
  );
};
