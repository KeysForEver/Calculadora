import React, { useMemo } from 'react';
import { MetalonInput } from '../types';
import { calculateMetalonStructure } from '../utils/calculator';

interface TechnicalProjectDrawingProps {
  input: MetalonInput;
}

export const TechnicalProjectDrawing: React.FC<TechnicalProjectDrawingProps> = ({ input }) => {
  const calc = useMemo(() => {
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
    profileInt,
    linhasHorizontais,
    colunasVerticais,
    vaoLivreHoriz,
    vaoLivreVert,
    transportLogistics,
    winnerDiagram,
  } = calc;

  const extFaceMm = Math.round(profileExt.faceSizeM * 1000);
  const intFaceMm = Math.round(profileInt.faceSizeM * 1000);

  // Geometric calculations
  const diagonalM = Math.sqrt(largura * largura + altura * altura);
  const diagonalMm = Math.round(diagonalM * 1000);

  // Transportation modules calculations
  const { modulesHorizontalCount, modulesVerticalCount, totalModulesCount } = transportLogistics;
  const isModularTransport = totalModulesCount > 1;

  // Module dimensions
  const modWidthM = largura / modulesHorizontalCount;

  // Dimensions for high-resolution canvas with vertical expansion for maximum readability
  const svgWidth = 1000;
  const ratio = largura / Math.max(0.1, altura);

  // Canvas height calculation giving ample vertical space to occupy the full page cleanly
  let svgHeight = 580;
  if (ratio > 2.8) {
    svgHeight = 520;
  } else if (ratio > 1.6) {
    svgHeight = 580;
  } else if (ratio > 1.0) {
    svgHeight = 660;
  } else {
    svgHeight = 760;
  }

  // Generous, non-colliding margins
  const padLeft = 56;
  const padRight = 130; // Ample room for both vertical clear spans and total height badge
  const padTop = isModularTransport ? 92 : 74; // Room for total width banner, module brackets and span dimensions
  const padBottom = 82; // Room for progressive tape measure scale and staggered markers

  const availWidth = svgWidth - padLeft - padRight;
  const availHeight = svgHeight - padTop - padBottom;

  let drawWidth = availWidth;
  let drawHeight = drawWidth / ratio;

  if (drawHeight > availHeight) {
    drawHeight = availHeight;
    drawWidth = drawHeight * ratio;
  }

  const startX = padLeft + (availWidth - drawWidth) / 2;
  const startY = padTop + (availHeight - drawHeight) / 2;

  // Staggering parameters for dense columns
  const numHorizBays = Math.max(1, colunasVerticais - 1);
  const numVertBays = Math.max(1, linhasHorizontais - 1);
  const isDenseHoriz = colunasVerticais > 5;
  const isSuperDenseHoriz = colunasVerticais > 9;
  const isDenseVert = linhasHorizontais > 5;

  // Coordinate arrays for columns and rows
  const colPositions = useMemo(() => {
    const arr: number[] = [];
    for (let j = 0; j < colunasVerticais; j++) {
      arr.push(startX + (j * drawWidth) / numHorizBays);
    }
    return arr;
  }, [startX, drawWidth, colunasVerticais, numHorizBays]);

  const rowPositions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < linhasHorizontais; i++) {
      arr.push(startY + (i * drawHeight) / numVertBays);
    }
    return arr;
  }, [startY, drawHeight, linhasHorizontais, numVertBays]);

  return (
    <div className="space-y-2 font-serif">
      {/* Section Header */}
      <div className="border-b border-slate-700 pb-1.5 flex flex-wrap items-center justify-between gap-2 font-serif">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <span>6.</span>
            Gabarito Técnico Geral de Montagem e Logística de Transporte
          </h3>
          <p className="text-[11px] text-slate-600 font-serif mt-0.5">
            Planta de Montagem em Serralheria com Cotas Reais, Eixos na Trena, Divisões de Transporte e Esquadro.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-serif text-slate-700">
          <span className="flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
            {winnerDiagram.weldsCount} Nós de Solda
          </span>
          <span className="font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            Diagonal D = {diagonalM.toFixed(3).replace('.', ',')} m ({diagonalMm} mm)
          </span>
          {isModularTransport ? (
            <span className="font-semibold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
              {totalModulesCount} Módulos de Transporte
            </span>
          ) : (
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Peça Única Transportável
            </span>
          )}
        </div>
      </div>

      {/* Master Technical Blueprint Card */}
      <div className="bg-white border border-slate-300 rounded-lg p-2.5 shadow-xs">
        {/* Master SVG Drawing Viewport */}
        <div className="w-full bg-slate-50/40 rounded-lg border border-slate-200 p-2 flex justify-center items-center overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible max-w-[1000px]"
            style={{ minHeight: '440px' }}
          >
            <defs>
              <pattern id="master-grid-sec6" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Blueprint Background Canvas */}
            <rect width={svgWidth} height={svgHeight} fill="url(#master-grid-sec6)" rx="8" />

            {/* ========================================================================= */}
            {/* TRANSPORTATION MODULES BACKGROUND TINTS & HIGHLIGHTS                      */}
            {/* ========================================================================= */}
            {isModularTransport && (
              <g id="transport-modules-shading">
                {Array.from({ length: modulesHorizontalCount }).map((_, mColIdx) => {
                  const mLeft = startX + (mColIdx * drawWidth) / modulesHorizontalCount;
                  const mWidth = drawWidth / modulesHorizontalCount;
                  const colors = [
                    'rgba(59, 130, 246, 0.05)',
                    'rgba(16, 185, 129, 0.05)',
                    'rgba(245, 158, 11, 0.05)',
                    'rgba(139, 92, 246, 0.05)',
                  ];
                  const bg = colors[mColIdx % colors.length];

                  return (
                    <g key={`mod-shading-${mColIdx}`}>
                      <rect
                        x={mLeft}
                        y={startY}
                        width={mWidth}
                        height={drawHeight}
                        fill={bg}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* ========================================================================= */}
            {/* CROSS CORNER DIAGONALS (ESQUADRO)                                         */}
            {/* ========================================================================= */}
            <g id="diagonal-check">
              <line
                x1={startX}
                y1={startY}
                x2={startX + drawWidth}
                y2={startY + drawHeight}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <line
                x1={startX}
                y1={startY + drawHeight}
                x2={startX + drawWidth}
                y2={startY}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              {/* Diagonal Dimension Badge in Center */}
              <rect
                x={startX + drawWidth / 2 - 138}
                y={startY + drawHeight / 2 - 12}
                width="276"
                height="24"
                rx="4"
                fill="#ffffff"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <text
                x={startX + drawWidth / 2}
                y={startY + drawHeight / 2 + 4.5}
                fill="#0f172a"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                Esquadro D = {diagonalM.toFixed(3).replace('.', ',')} m ({diagonalMm} mm) | D1 = D2
              </text>
            </g>

            {/* 90° Square Angle Corner Markers */}
            {[
              { x: startX, y: startY, dx: 14, dy: 14 },
              { x: startX + drawWidth, y: startY, dx: -14, dy: 14 },
              { x: startX, y: startY + drawHeight, dx: 14, dy: -14 },
              { x: startX + drawWidth, y: startY + drawHeight, dx: -14, dy: -14 },
            ].map((c, idx) => (
              <g key={`square-corner-${idx}`}>
                <polyline
                  points={`${c.x + c.dx},${c.y} ${c.x + c.dx},${c.y + c.dy} ${c.x},${c.y + c.dy}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.4"
                />
                <circle cx={c.x + c.dx / 2} cy={c.y + c.dy / 2} r="1.5" fill="#334155" />
              </g>
            ))}

            {/* Outer Metalon Frame Rectangle */}
            <rect
              x={startX}
              y={startY}
              width={drawWidth}
              height={drawHeight}
              fill="#ffffff"
              fillOpacity="0.8"
              stroke="#0f172a"
              strokeWidth="3.5"
              rx="2"
            />

            {/* Horizontal Metalon Grid Beams */}
            {rowPositions.map((y, i) => {
              const isBorder = i === 0 || i === rowPositions.length - 1;
              return (
                <g key={`master-row-${i}`}>
                  <line
                    x1={startX}
                    y1={y}
                    x2={startX + drawWidth}
                    y2={y}
                    stroke={isBorder ? '#1e40af' : '#2563eb'}
                    strokeWidth={isBorder ? '3' : '2'}
                  />
                </g>
              );
            })}

            {/* Vertical Metalon Grid Columns */}
            {colPositions.map((x, j) => {
              const isOuter = j === 0 || j === colPositions.length - 1;
              return (
                <g key={`master-col-${j}`}>
                  <line
                    x1={x}
                    y1={startY}
                    x2={x}
                    y2={startY + drawHeight}
                    stroke={isOuter ? '#b45309' : '#d97706'}
                    strokeWidth={isOuter ? '3' : '1.8'}
                  />
                </g>
              );
            })}

            {/* Red Solder Weld Nodes at All Intersections */}
            {rowPositions.map((y, i) => {
              return colPositions.map((x, j) => {
                const isCorner =
                  (i === 0 || i === rowPositions.length - 1) &&
                  (j === 0 || j === colPositions.length - 1);
                return (
                  <g key={`weld-node-${i}-${j}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isCorner ? '4.2' : '3.2'}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              });
            })}

            {/* Profile Specification Badges on the Beams */}
            <g id="profile-annotations">
              {/* External Perimeter Profile Note */}
              <rect
                x={startX + 12}
                y={startY + 10}
                width="156"
                height="18"
                rx="3"
                fill="#ffffff"
                fillOpacity="0.95"
                stroke="#1e3a8a"
                strokeWidth="1"
              />
              <text
                x={startX + 90}
                y={startY + 22.5}
                fill="#1e3a8a"
                fontSize="8.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                Quadro Ext: {profileExt.name} ({extFaceMm}×{extFaceMm}mm)
              </text>

              {/* Internal Beam Profile Note */}
              {rowPositions.length > 2 && (
                <g>
                  <rect
                    x={startX + drawWidth - 168}
                    y={rowPositions[1] + 10}
                    width="156"
                    height="18"
                    rx="3"
                    fill="#ffffff"
                    fillOpacity="0.95"
                    stroke="#d97706"
                    strokeWidth="1"
                  />
                  <text
                    x={startX + drawWidth - 90}
                    y={rowPositions[1] + 22.5}
                    fill="#92400e"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Travessa Int: {profileInt.name} ({intFaceMm}×{intFaceMm}mm)
                  </text>
                </g>
              )}
            </g>

            {/* ========================================================================= */}
            {/* ENHANCED TRANSPORTATION MODULES MARKING (SEPARAÇÕES DE TRANSPORTE)       */}
            {/* ========================================================================= */}
            {isModularTransport && (
              <g id="transport-modules-marking">
                {/* Horizontal Module Separations */}
                {modulesHorizontalCount > 1 &&
                  Array.from({ length: modulesHorizontalCount - 1 }).map((_, mIdx) => {
                    const splitRatio = (mIdx + 1) / modulesHorizontalCount;
                    const splitX = startX + splitRatio * drawWidth;

                    return (
                      <g key={`h-split-mod-${mIdx}`}>
                        {/* Glowing highlight strip */}
                        <line
                          x1={splitX}
                          y1={startY - 22}
                          x2={splitX}
                          y2={startY + drawHeight + 22}
                          stroke="#db2777"
                          strokeWidth="3.5"
                          strokeDasharray="6 4"
                        />

                        {/* Top and bottom splice joint indicators */}
                        <rect
                          x={splitX - 7}
                          y={startY - 4}
                          width="14"
                          height="8"
                          fill="#be185d"
                          rx="1.5"
                        />
                        <rect
                          x={splitX - 7}
                          y={startY + drawHeight - 4}
                          width="14"
                          height="8"
                          fill="#be185d"
                          rx="1.5"
                        />

                        {/* Center Splice Badge */}
                        <rect
                          x={splitX - 72}
                          y={startY + (drawHeight * (mIdx + 1)) / (modulesHorizontalCount + 1) - 11}
                          width="144"
                          height="22"
                          rx="4"
                          fill="#fdf2f8"
                          stroke="#db2777"
                          strokeWidth="1.5"
                        />
                        <text
                          x={splitX}
                          y={startY + (drawHeight * (mIdx + 1)) / (modulesHorizontalCount + 1) + 4}
                          fill="#9d174d"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ✂ DIVISÃO DE TRANSPORTE
                        </text>
                      </g>
                    );
                  })}

                {/* Module Range Banners */}
                {Array.from({ length: modulesHorizontalCount }).map((_, mIdx) => {
                  const mLeft = startX + (mIdx * drawWidth) / modulesHorizontalCount;
                  const mWidth = drawWidth / modulesHorizontalCount;
                  const mCenterX = mLeft + mWidth / 2;
                  const bannerY = startY - 50;

                  return (
                    <g key={`module-banner-${mIdx}`}>
                      {/* Range line with brackets */}
                      <line x1={mLeft + 4} y1={bannerY} x2={mLeft + mWidth - 4} y2={bannerY} stroke="#7c3aed" strokeWidth="1.5" />
                      <line x1={mLeft + 4} y1={bannerY - 4} x2={mLeft + 4} y2={bannerY + 4} stroke="#7c3aed" strokeWidth="1.5" />
                      <line x1={mLeft + mWidth - 4} y1={bannerY - 4} x2={mLeft + mWidth - 4} y2={bannerY + 4} stroke="#7c3aed" strokeWidth="1.5" />

                      {/* Module Badge */}
                      <rect
                        x={mCenterX - 70}
                        y={bannerY - 9.5}
                        width="140"
                        height="19"
                        rx="4"
                        fill="#7c3aed"
                      />
                      <text
                        x={mCenterX}
                        y={bannerY + 4}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        MÓDULO {mIdx + 1} ({modWidthM.toFixed(2).replace('.', ',')} m)
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* ========================================================================= */}
            {/* TIER 1: TOP PARTIAL CLEAR SPANS (COTAS DE VÃO LIVRE ENTRE COLUNAS)        */}
            {/* ========================================================================= */}
            {colPositions.map((xLeft, j) => {
              if (j === colPositions.length - 1) return null;
              const xRight = colPositions[j + 1];
              const spanCenterX = (xLeft + xRight) / 2;
              
              // Alternating height if dense columns to prevent any text overlapping
              const isStaggered = isDenseHoriz && j % 2 === 1;
              const dimLineY = startY - (isStaggered ? 26 : 14);

              return (
                <g key={`span-top-h-${j}`}>
                  {/* Witness extension lines */}
                  <line
                    x1={xLeft}
                    y1={startY - 2}
                    x2={xLeft}
                    y2={dimLineY - 2}
                    stroke="#64748b"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={xRight}
                    y1={startY - 2}
                    x2={xRight}
                    y2={dimLineY - 2}
                    stroke="#64748b"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />

                  {/* Dimension line with end ticks */}
                  <line x1={xLeft} y1={dimLineY} x2={xRight} y2={dimLineY} stroke="#0f172a" strokeWidth="1.2" />
                  <line x1={xLeft} y1={dimLineY - 3.5} x2={xLeft} y2={dimLineY + 3.5} stroke="#0f172a" strokeWidth="1.4" />
                  <line x1={xRight} y1={dimLineY - 3.5} x2={xRight} y2={dimLineY + 3.5} stroke="#0f172a" strokeWidth="1.4" />

                  {/* Text Badge */}
                  <rect
                    x={spanCenterX - (isSuperDenseHoriz ? 24 : 36)}
                    y={dimLineY - 8}
                    width={isSuperDenseHoriz ? 48 : 72}
                    height="16"
                    rx="3"
                    fill="#ffffff"
                    stroke="#475569"
                    strokeWidth="0.9"
                  />
                  <text
                    x={spanCenterX}
                    y={dimLineY + 3.5}
                    fill="#0f172a"
                    fontSize={isSuperDenseHoriz ? '7.5' : '8.5'}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {isSuperDenseHoriz
                      ? `${(vaoLivreHoriz * 100).toFixed(1).replace('.', ',')}cm`
                      : `Vão ${(vaoLivreHoriz * 100).toFixed(1).replace('.', ',')}cm`}
                  </text>
                </g>
              );
            })}

            {/* ========================================================================= */}
            {/* TIER 2: TOP TOTAL DIMENSION (COTA TOTAL SUPERIOR - PADRÃO HARMONIZADO)    */}
            {/* ========================================================================= */}
            {(() => {
              // Positioned clearly above spans and module tags
              const totalDimY = isModularTransport ? startY - 76 : startY - (isDenseHoriz ? 48 : 38);
              return (
                <g id="top-total-dim">
                  {/* Extension lines */}
                  <line x1={startX} y1={startY - 4} x2={startX} y2={totalDimY - 4} stroke="#0f172a" strokeWidth="1.2" />
                  <line x1={startX + drawWidth} y1={startY - 4} x2={startX + drawWidth} y2={totalDimY - 4} stroke="#0f172a" strokeWidth="1.2" />
                  
                  {/* Main dimension line with arrow/ticks */}
                  <line x1={startX} y1={totalDimY} x2={startX + drawWidth} y2={totalDimY} stroke="#0f172a" strokeWidth="1.8" />
                  <line x1={startX} y1={totalDimY - 5} x2={startX} y2={totalDimY + 5} stroke="#0f172a" strokeWidth="2" />
                  <line x1={startX + drawWidth} y1={totalDimY - 5} x2={startX + drawWidth} y2={totalDimY + 5} stroke="#0f172a" strokeWidth="2" />

                  {/* Standardized White Badge matching all technical dimensions */}
                  <rect
                    x={startX + drawWidth / 2 - 142}
                    y={totalDimY - 10}
                    width="284"
                    height="20"
                    rx="4"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  <text
                    x={startX + drawWidth / 2}
                    y={totalDimY + 4}
                    fill="#0f172a"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    LARGURA TOTAL: {largura.toFixed(2).replace('.', ',')} m ({Math.round(largura * 1000)} mm)
                  </text>
                </g>
              );
            })()}

            {/* ========================================================================= */}
            {/* TIER 3: RIGHT PARTIAL CLEAR SPANS (COTAS DE VÃO LIVRE VERTICAL)           */}
            {/* ========================================================================= */}
            {rowPositions.map((yTop, i) => {
              if (i === rowPositions.length - 1) return null;
              const yBottom = rowPositions[i + 1];
              const spanCenterY = (yTop + yBottom) / 2;
              const dimLineX = startX + drawWidth + 22;

              return (
                <g key={`span-right-v-${i}`}>
                  {/* Witness extension lines */}
                  <line x1={startX + drawWidth + 4} y1={yTop} x2={dimLineX + 4} y2={yTop} stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 2" />
                  <line x1={startX + drawWidth + 4} y1={yBottom} x2={dimLineX + 4} y2={yBottom} stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 2" />

                  {/* Vertical dimension line with ticks */}
                  <line x1={dimLineX} y1={yTop} x2={dimLineX} y2={yBottom} stroke="#0f172a" strokeWidth="1.2" />
                  <line x1={dimLineX - 3.5} y1={yTop} x2={dimLineX + 3.5} y2={yTop} stroke="#0f172a" strokeWidth="1.4" />
                  <line x1={dimLineX - 3.5} y1={yBottom} x2={dimLineX + 3.5} y2={yBottom} stroke="#0f172a" strokeWidth="1.4" />

                  {/* Text label */}
                  <rect
                    x={dimLineX + 6}
                    y={spanCenterY - 8}
                    width="58"
                    height="16"
                    rx="3"
                    fill="#ffffff"
                    stroke="#475569"
                    strokeWidth="0.9"
                  />
                  <text
                    x={dimLineX + 35}
                    y={spanCenterY + 3.5}
                    fill="#0f172a"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {(vaoLivreVert * 100).toFixed(1).replace('.', ',')} cm
                  </text>
                </g>
              );
            })}

            {/* ========================================================================= */}
            {/* TIER 4: RIGHT TOTAL HEIGHT (COTA TOTAL LATERAL - MESMO PADRÃO HORIZONTAL) */}
            {/* ========================================================================= */}
            {(() => {
              const totalDimX = startX + drawWidth + (isDenseVert ? 90 : 86);
              return (
                <g id="right-total-dim">
                  {/* Witness extension lines */}
                  <line x1={startX + drawWidth + 4} y1={startY} x2={totalDimX + 4} y2={startY} stroke="#0f172a" strokeWidth="1.2" />
                  <line x1={startX + drawWidth + 4} y1={startY + drawHeight} x2={totalDimX + 4} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1.2" />
                  
                  {/* Main vertical dimension line */}
                  <line x1={totalDimX} y1={startY} x2={totalDimX} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1.8" />
                  <line x1={totalDimX - 5} y1={startY} x2={totalDimX + 5} y2={startY} stroke="#0f172a" strokeWidth="2" />
                  <line x1={totalDimX - 5} y1={startY + drawHeight} x2={totalDimX + 5} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="2" />

                  {/* Standardized White Badge matching Top Width badge */}
                  <g transform={`rotate(90, ${totalDimX + 16}, ${startY + drawHeight / 2})`}>
                    <rect
                      x={totalDimX + 16 - 138}
                      y={startY + drawHeight / 2 - 10}
                      width="276"
                      height="20"
                      rx="4"
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <text
                      x={totalDimX + 16}
                      y={startY + drawHeight / 2 + 4}
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ALTURA TOTAL: {altura.toFixed(2).replace('.', ',')} m ({Math.round(altura * 1000)} mm)
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ========================================================================= */}
            {/* TIER 5: BOTTOM CUMULATIVE TAPE MEASURE SCALE (TRENA PROGRESSIVA)          */}
            {/* ========================================================================= */}
            <g id="tape-measure-scale">
              {/* Tape ribbon base */}
              <rect
                x={startX}
                y={startY + drawHeight + 16}
                width={drawWidth}
                height="18"
                rx="3"
                fill="#fef08a"
                stroke="#ca8a04"
                strokeWidth="1.2"
              />

              {/* Tape ticks and marks */}
              {colPositions.map((x, j) => {
                const offsetM = (j * largura) / numHorizBays;
                const isStaggered = isDenseHoriz && j % 2 === 1;

                return (
                  <g key={`tape-tick-${j}`}>
                    <line x1={x} y1={startY + drawHeight + 16} x2={x} y2={startY + drawHeight + 34} stroke="#854d0e" strokeWidth="1.5" />
                    <text
                      x={x}
                      y={startY + drawHeight + (isStaggered ? 52 : 42)}
                      fill="#854d0e"
                      fontSize={isSuperDenseHoriz ? '7.5' : '9'}
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {offsetM.toFixed(2).replace('.', ',')}m
                    </text>
                  </g>
                );
              })}

              {/* Tape label tag */}
              <rect
                x={startX - 62}
                y={startY + drawHeight + 16}
                width="58"
                height="18"
                rx="3"
                fill="#ca8a04"
              />
              <text
                x={startX - 33}
                y={startY + drawHeight + 28}
                fill="#ffffff"
                fontSize="8.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                Trena (m)
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
