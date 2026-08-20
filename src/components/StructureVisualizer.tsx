import React from 'react';
import { MetalonInput } from '../types';
import { calculateMetalonStructure } from '../utils/calculator';

interface VisualizerProps {
  input: MetalonInput;
  part?: 'all' | 'part1' | 'part2';
}

export const StructureVisualizer: React.FC<VisualizerProps> = ({ input, part = 'all' }) => {
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
    totalBarrasOtimizado,
    weldsCountHorizTopology,
    weldsCountVertTopology,
    transportLogistics,
    diagrams,
    winnerDiagram,
  } = calc;

  const d1 = diagrams[0];
  const d2 = diagrams[1];
  const d3 = diagrams[2];
  const d4 = diagrams[3];

  // SVG Dimension Constants tailored for A4 page width and 2-diagram vertical stack per page
  const svgWidth = 720;
  const svgHeight = 236;

  const padLeft = 85;
  const padRight = 75;
  const padTop = 42;
  const padBottom = 26;

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

  // Spans count
  const numVaosHoriz = Math.max(1, colunasVerticais - 1);
  const numVaosVert = Math.max(1, linhasHorizontais - 1);

  // Partial span dimensions in cm and m
  const vaoHorizCmStr = (vaoLivreHoriz * 100).toFixed(1).replace('.', ',');
  const vaoVertCmStr = (vaoLivreVert * 100).toFixed(1).replace('.', ',');
  const vaoHorizMStr = vaoLivreHoriz.toFixed(2).replace('.', ',');
  const vaoVertMStr = vaoLivreVert.toFixed(2).replace('.', ',');

  const showPart1 = part === 'all' || part === 'part1';
  const showPart2 = part === 'all' || part === 'part2';

  return (
    <div className="space-y-4 font-serif">
      {/* Section Header */}
      {showPart1 && (
        <>
          <div className="border-b border-slate-700 pb-1 flex items-center justify-between font-serif">
            <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
              <span>5.</span>
              Esquemas Estruturais Detalhados com Cotas em Todos os Pontos (Parte 1/2)
            </h3>
            <span className="text-[11px] font-medium text-slate-700 font-serif">
              Modelos 1 e 2 • Cotas Técnicas e Contagem de Soldas
            </span>
          </div>

          {/* Logistics & Winner Alert Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Gabarito de Caminhão (4,30 m × 2,00 m):</span>
              <span>{transportLogistics.statusText}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                ★ Modelo Eleito: {winnerDiagram.shortTitle} ({winnerDiagram.weldsCount} soldas • {winnerDiagram.totalBars} barras)
              </span>
            </div>
          </div>
        </>
      )}

      {showPart2 && part !== 'all' && (
        <div className="border-b border-slate-700 pb-1 flex items-center justify-between font-serif">
          <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <span>5.</span>
            Esquemas Estruturais Detalhados com Cotas em Todos os Pontos (Parte 2/2)
          </h3>
          <span className="text-[11px] font-medium text-slate-700 font-serif">
            Modelos 3 e 4 • Cotas Técnicas e Contagem de Soldas
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 font-serif">
        {/* ========================================================================= */}
        {/* DIAGRAMA 1: Estrutura Horizontal - Topologia Linhas Contínuas (Solda Horiz) */}
        {/* ========================================================================= */}
        {showPart1 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d1.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 1 — {d1.title} ({d1.shortTitle})
                </h4>
                {d1.isWinner && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    ★ MODELO VITORIOSO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d1.totalBars} barras de 6,00 m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d1.totalMetragemLinear.toFixed(2).replace('.', ',')} m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d1.aproveitamentoPct.toFixed(1).replace('.', ',')}% aproveitamento
                </span>
                <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  {d1.weldsCount} pontos de solda
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                <defs>
                  <marker id="d1-arr-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                    <path d="M 10 1 L 0 5 L 10 9 z" fill="#475569" />
                  </marker>
                  <marker id="d1-arr-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                  </marker>
                  <marker id="d1-int-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                    <path d="M 10 1 L 0 5 L 10 9 z" fill="#0284c7" />
                  </marker>
                  <marker id="d1-int-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
                  </marker>
                </defs>

                {/* Outer Reference Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  rx="2"
                />

                {/* Ghost Columns for Intersection & Welding Context */}
                {verticalElements.map((_, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  return (
                    <line
                      key={`d1-vghost-${j}`}
                      x1={x}
                      y1={startY}
                      x2={x}
                      y2={startY + drawHeight}
                      stroke="#e2e8f0"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {/* Horizontal Lines (Continuous Pass-Through) */}
                {horizontalElements.map((elem, i) => {
                  const y = startY + (i * drawHeight) / numVaosVert;
                  const isBorder = i === 0 || i === linhasHorizontais - 1;

                  return (
                    <g key={`d1-h-${i}`}>
                      {/* Continuous Bar Line */}
                      <line
                        x1={startX}
                        y1={y}
                        x2={startX + drawWidth}
                        y2={y}
                        stroke={isBorder ? '#1d4ed8' : '#2563eb'}
                        strokeWidth={isBorder ? '3' : '2'}
                        strokeLinecap="round"
                      />

                      {/* Left Identifier Tag */}
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

                      {/* Center Dimension Badge on Bar */}
                      <g>
                        <rect
                          x={startX + drawWidth / 2 - 28}
                          y={y - 6.5}
                          width="56"
                          height="13"
                          rx="2.5"
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="0.8"
                        />
                        <text
                          x={startX + drawWidth / 2}
                          y={y + 2.5}
                          fill="#0f172a"
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {largura.toFixed(2).replace('.', ',')} m • B{String(elem.segments[0]?.barNumber || 1).padStart(2, '0')}
                        </text>
                      </g>

                      {/* Horizontal Welding Points at Column Intersections */}
                      {verticalElements.map((_, j) => {
                        const x = startX + (j * drawWidth) / numVaosHoriz;
                        return (
                          <g key={`d1-weld-${i}-${j}`}>
                            <circle cx={x} cy={y} r="2.8" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTAS INTERNAS DO DIAGRAMA 1 (Vãos Livres Interiores) === */}
                {Array.from({ length: numVaosVert }).map((_, i) => {
                  const y1 = startY + (i * drawHeight) / numVaosVert;
                  const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                  const midY = (y1 + y2) / 2;
                  const cellH = y2 - y1;

                  return (
                    <g key={`d1-internal-row-${i}`}>
                      {Array.from({ length: numVaosHoriz }).map((_, j) => {
                        const x1 = startX + (j * drawWidth) / numVaosHoriz;
                        const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                        const midX = (x1 + x2) / 2;
                        const cellW = x2 - x1;

                        // Internal horizontal span dimension line inside each cell
                        return (
                          <g key={`d1-int-cell-${i}-${j}`}>
                            {cellW > 45 && cellH > 24 && (
                              <>
                                {/* Inner Horizontal Dimension Line */}
                                <line
                                  x1={x1 + 6}
                                  y1={midY - (cellH > 40 ? 5 : 0)}
                                  x2={x2 - 6}
                                  y2={midY - (cellH > 40 ? 5 : 0)}
                                  stroke="#0284c7"
                                  strokeWidth="0.8"
                                  strokeDasharray="3 2"
                                  markerStart="url(#d1-int-start)"
                                  markerEnd="url(#d1-int-end)"
                                />
                                <rect
                                  x={midX - 22}
                                  y={midY - (cellH > 40 ? 11 : 6)}
                                  width="44"
                                  height="11"
                                  rx="2"
                                  fill="#ffffff"
                                  stroke="#0284c7"
                                  strokeWidth="0.7"
                                />
                                <text
                                  x={midX}
                                  y={midY - (cellH > 40 ? 3 : -2)}
                                  fill="#0369a1"
                                  fontSize="6.5"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  Vão: {vaoHorizCmStr} cm
                                </text>

                                {/* Inner Vertical Dimension Line (in first column cells) */}
                                {j === 0 && cellH > 38 && (
                                  <>
                                    <line
                                      x1={x1 + 14}
                                      y1={y1 + 6}
                                      x2={x1 + 14}
                                      y2={y2 - 6}
                                      stroke="#0284c7"
                                      strokeWidth="0.8"
                                      strokeDasharray="3 2"
                                      markerStart="url(#d1-int-start)"
                                      markerEnd="url(#d1-int-end)"
                                    />
                                    <rect
                                      x={x1 + 16}
                                      y={midY + 3}
                                      width="42"
                                      height="10"
                                      rx="2"
                                      fill="#ffffff"
                                      stroke="#0284c7"
                                      strokeWidth="0.6"
                                    />
                                    <text
                                      x={x1 + 37}
                                      y={midY + 10.5}
                                      fill="#0369a1"
                                      fontSize="6"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      Alt: {vaoVertCmStr} cm
                                    </text>
                                  </>
                                )}
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTAS EXTERNAS DO DIAGRAMA 1 === */}
                {/* Linhas de Extensão Superiores */}
                <line x1={startX} y1={startY} x2={startX} y2={startY - 30} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth} y2={startY - 30} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Superior (Largura Total) */}
                <line
                  x1={startX}
                  y1={startY - 25}
                  x2={startX + drawWidth}
                  y2={startY - 25}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 45}
                  y={startY - 32}
                  width="90"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text
                  x={startX + drawWidth / 2}
                  y={startY - 23}
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cotas Parciais Superiores de Cada Vão */}
                {Array.from({ length: numVaosHoriz }).map((_, j) => {
                  const x1 = startX + (j * drawWidth) / numVaosHoriz;
                  const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                  const midX = (x1 + x2) / 2;
                  return (
                    <g key={`d1-ext-span-dim-${j}`}>
                      <line x1={x1} y1={startY - 10} x2={x2} y2={startY - 10} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x1} y1={startY - 13} x2={x1} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x2} y1={startY - 13} x2={x2} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      {drawWidth / numVaosHoriz > 35 && (
                        <text
                          x={midX}
                          y={startY - 12}
                          fill="#475569"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {vaoHorizCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Linhas de Extensão Laterais Direitas */}
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth + 38} y2={startY} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY + drawHeight} x2={startX + drawWidth + 38} y2={startY + drawHeight} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Lateral Direita (Altura Total) */}
                <line
                  x1={startX + drawWidth + 30}
                  y1={startY}
                  x2={startX + drawWidth + 30}
                  y2={startY + drawHeight}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <line x1={startX + drawWidth + 26} y1={startY} x2={startX + drawWidth + 34} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 26} y1={startY + drawHeight} x2={startX + drawWidth + 34} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 42}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 42}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cotas Parciais Verticais dos Vãos */}
                {Array.from({ length: numVaosVert }).map((_, i) => {
                  const y1 = startY + (i * drawHeight) / numVaosVert;
                  const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                  const midY = (y1 + y2) / 2;
                  return (
                    <g key={`d1-ext-vspan-dim-${i}`}>
                      <line x1={startX + drawWidth + 10} y1={y1} x2={startX + drawWidth + 10} y2={y2} stroke="#475569" strokeWidth="0.8" />
                      <line x1={startX + drawWidth + 7} y1={y1} x2={startX + drawWidth + 13} y2={y1} stroke="#475569" strokeWidth="0.8" />
                      <line x1={startX + drawWidth + 7} y1={y2} x2={startX + drawWidth + 13} y2={y2} stroke="#475569" strokeWidth="0.8" />
                      {drawHeight / numVaosVert > 16 && (
                        <text
                          x={startX + drawWidth + 16}
                          y={midY + 2.5}
                          fill="#475569"
                          fontSize="6"
                          fontWeight="bold"
                          textAnchor="start"
                        >
                          {vaoVertCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAMA 2: Estrutura Horizontal - Topologia Colunas Contínuas (Solda Vert) */}
        {/* ========================================================================= */}
        {showPart1 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d2.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 2 — {d2.title} ({d2.shortTitle})
                </h4>
                {d2.isWinner && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    ★ MODELO VITORIOSO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d2.totalBars} barras de 6,00 m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d2.totalMetragemLinear.toFixed(2).replace('.', ',')} m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d2.aproveitamentoPct.toFixed(1).replace('.', ',')}% aproveitamento
                </span>
                <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  {d2.weldsCount} pontos de solda
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                <defs>
                  <marker id="d2-int-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                    <path d="M 10 1 L 0 5 L 10 9 z" fill="#0284c7" />
                  </marker>
                  <marker id="d2-int-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
                  </marker>
                </defs>

                {/* Outer Frame */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  rx="2"
                />

                {/* Pass-Through Columns */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  return (
                    <line
                      key={`d2-col-${j}`}
                      x1={x}
                      y1={startY}
                      x2={x}
                      y2={startY + drawHeight}
                      stroke={isOuter ? '#047857' : '#059669'}
                      strokeWidth={isOuter ? '2.8' : '2'}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Sectioned Horizontal Crossbeams (Travessas Cortadas entre Colunas) */}
                {Array.from({ length: linhasHorizontais }).map((_, i) => {
                  const y = startY + (i * drawHeight) / numVaosVert;
                  return (
                    <g key={`d2-row-${i}`}>
                      {Array.from({ length: numVaosHoriz }).map((_, j) => {
                        const x1 = startX + (j * drawWidth) / numVaosHoriz;
                        const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                        const midX = (x1 + x2) / 2;

                        return (
                          <g key={`d2-crossbeam-${i}-${j}`}>
                            {/* Segment Line */}
                            <line
                              x1={x1 + 2}
                              y1={y}
                              x2={x2 - 2}
                              y2={y}
                              stroke="#0284c7"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />

                            {/* Vertical Solder Welds at Column Junctions */}
                            <line x1={x1 + 1} y1={y - 4} x2={x1 + 1} y2={y + 4} stroke="#ef4444" strokeWidth="2" />
                            <line x1={x2 - 1} y1={y - 4} x2={x2 - 1} y2={y + 4} stroke="#ef4444" strokeWidth="2" />

                            {/* Span Dimension Tag on Crossbeam */}
                            {drawWidth / numVaosHoriz > 38 && (
                              <g>
                                <rect
                                  x={midX - 18}
                                  y={y - 5.5}
                                  width="36"
                                  height="11"
                                  rx="2"
                                  fill="#ffffff"
                                  stroke="#0284c7"
                                  strokeWidth="0.7"
                                />
                                <text
                                  x={midX}
                                  y={y + 2.5}
                                  fill="#0369a1"
                                  fontSize="6.5"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {vaoHorizCmStr} cm
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTAS INTERNAS DO DIAGRAMA 2 (Vão Livre Vertical e Cortes) === */}
                {Array.from({ length: numVaosVert }).map((_, i) => {
                  const y1 = startY + (i * drawHeight) / numVaosVert;
                  const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                  const midY = (y1 + y2) / 2;
                  const cellH = y2 - y1;

                  return (
                    <g key={`d2-int-vrow-${i}`}>
                      {cellH > 32 && (
                        <>
                          <line
                            x1={startX + drawWidth / 2 - 20}
                            y1={y1 + 4}
                            x2={startX + drawWidth / 2 - 20}
                            y2={y2 - 4}
                            stroke="#047857"
                            strokeWidth="0.8"
                            strokeDasharray="2 2"
                            markerStart="url(#d2-int-start)"
                            markerEnd="url(#d2-int-end)"
                          />
                          <rect
                            x={startX + drawWidth / 2 - 16}
                            y={midY - 5}
                            width="52"
                            height="10"
                            rx="2"
                            fill="#ffffff"
                            stroke="#047857"
                            strokeWidth="0.6"
                          />
                          <text
                            x={startX + drawWidth / 2 + 10}
                            y={midY + 2.5}
                            fill="#065f46"
                            fontSize="6"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Vão Vert: {vaoVertCmStr} cm
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* === COTAS EXTERNAS DO DIAGRAMA 2 === */}
                {/* Linhas de Extensão Superiores */}
                <line x1={startX} y1={startY} x2={startX} y2={startY - 30} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth} y2={startY - 30} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 65}
                  y={startY - 32}
                  width="130"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({numVaosHoriz} Travessas por Linha)
                </text>

                {/* Cotas Parciais Superiores de Cada Vão */}
                {Array.from({ length: numVaosHoriz }).map((_, j) => {
                  const x1 = startX + (j * drawWidth) / numVaosHoriz;
                  const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                  const midX = (x1 + x2) / 2;
                  return (
                    <g key={`d2-ext-span-dim-${j}`}>
                      <line x1={x1} y1={startY - 10} x2={x2} y2={startY - 10} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x1} y1={startY - 13} x2={x1} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x2} y1={startY - 13} x2={x2} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      {drawWidth / numVaosHoriz > 35 && (
                        <text
                          x={midX}
                          y={startY - 12}
                          fill="#475569"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {vaoHorizCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Linhas de Extensão Laterais Direitas */}
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth + 38} y2={startY} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY + drawHeight} x2={startX + drawWidth + 38} y2={startY + drawHeight} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Lateral */}
                <line x1={startX + drawWidth + 30} y1={startY} x2={startX + drawWidth + 30} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 26} y1={startY} x2={startX + drawWidth + 34} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 26} y1={startY + drawHeight} x2={startX + drawWidth + 34} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 42}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 42}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cotas Parciais Verticais dos Vãos */}
                {Array.from({ length: numVaosVert }).map((_, i) => {
                  const y1 = startY + (i * drawHeight) / numVaosVert;
                  const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                  const midY = (y1 + y2) / 2;
                  return (
                    <g key={`d2-ext-vspan-dim-${i}`}>
                      <line x1={startX + drawWidth + 10} y1={y1} x2={startX + drawWidth + 10} y2={y2} stroke="#475569" strokeWidth="0.8" />
                      <line x1={startX + drawWidth + 7} y1={y1} x2={startX + drawWidth + 13} y2={y1} stroke="#475569" strokeWidth="0.8" />
                      <line x1={startX + drawWidth + 7} y1={y2} x2={startX + drawWidth + 13} y2={y2} stroke="#475569" strokeWidth="0.8" />
                      {drawHeight / numVaosVert > 16 && (
                        <text
                          x={startX + drawWidth + 16}
                          y={midY + 2.5}
                          fill="#475569"
                          fontSize="6"
                          fontWeight="bold"
                          textAnchor="start"
                        >
                          {vaoVertCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAMA 3: Estrutura Vertical - Topologia Linhas Contínuas (Solda Horiz) */}
        {/* ========================================================================= */}
        {showPart2 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d3.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 3 — {d3.title} ({d3.shortTitle})
                </h4>
                {d3.isWinner && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    ★ MODELO VITORIOSO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d3.totalBars} barras de 6,00 m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d3.totalMetragemLinear.toFixed(2).replace('.', ',')} m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d3.aproveitamentoPct.toFixed(1).replace('.', ',')}% aproveitamento
                </span>
                <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  {d3.weldsCount} pontos de solda
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                <defs>
                  <marker id="d3-int-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                    <path d="M 10 1 L 0 5 L 10 9 z" fill="#b45309" />
                  </marker>
                  <marker id="d3-int-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#b45309" />
                  </marker>
                </defs>

                {/* Outer Bounding Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  rx="2"
                />

                {/* Continuous Top and Bottom Border Lines (Linhas Passantes) */}
                <line x1={startX} y1={startY} x2={startX + drawWidth} y2={startY} stroke="#1e293b" strokeWidth="3" />
                <line x1={startX} y1={startY + drawHeight} x2={startX + drawWidth} y2={startY + drawHeight} stroke="#1e293b" strokeWidth="3" />

                {/* Vertical Columns Cut to Inner Span */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  const isStaggered = colunasVerticais > 12 && j % 2 === 1;

                  return (
                    <g key={`d3-col-${j}`}>
                      {/* Vertical Column Bar */}
                      <line
                        x1={x}
                        y1={startY + 2}
                        x2={x}
                        y2={startY + drawHeight - 2}
                        stroke={isOuter ? '#b45309' : '#d97706'}
                        strokeWidth={isOuter ? '2.8' : '2'}
                        strokeLinecap="round"
                      />

                      {/* Horizontal Weld Joints Top and Bottom */}
                      <line x1={x - 4} y1={startY} x2={x + 4} y2={startY} stroke="#ef4444" strokeWidth="2.5" />
                      <line x1={x - 4} y1={startY + drawHeight} x2={x + 4} y2={startY + drawHeight} stroke="#ef4444" strokeWidth="2.5" />

                      {/* Column Tag Top (C1, C2...) */}
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

                      {/* Column Bar Tag Bottom (B01, B02...) */}
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

                {/* === COTAS INTERNAS DO DIAGRAMA 3 === */}
                {Array.from({ length: numVaosHoriz }).map((_, j) => {
                  const x1 = startX + (j * drawWidth) / numVaosHoriz;
                  const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                  const midX = (x1 + x2) / 2;
                  const cellW = x2 - x1;

                  return (
                    <g key={`d3-int-cell-${j}`}>
                      {cellW > 40 && (
                        <>
                          <line
                            x1={x1 + 6}
                            y1={startY + drawHeight / 2}
                            x2={x2 - 6}
                            y2={startY + drawHeight / 2}
                            stroke="#b45309"
                            strokeWidth="0.8"
                            strokeDasharray="2 2"
                            markerStart="url(#d3-int-start)"
                            markerEnd="url(#d3-int-end)"
                          />
                          <rect
                            x={midX - 22}
                            y={startY + drawHeight / 2 - 5.5}
                            width="44"
                            height="11"
                            rx="2"
                            fill="#ffffff"
                            stroke="#b45309"
                            strokeWidth="0.7"
                          />
                          <text
                            x={midX}
                            y={startY + drawHeight / 2 + 2.5}
                            fill="#92400e"
                            fontSize="6.5"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Vão: {vaoHorizCmStr} cm
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* === COTAS EXTERNAS DO DIAGRAMA 3 === */}
                {/* Linhas de Extensão Superiores */}
                <line x1={startX} y1={startY} x2={startX} y2={startY - 32} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth} y2={startY - 32} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 60}
                  y={startY - 32}
                  width="120"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({colunasVerticais} Colunas)
                </text>

                {/* Cotas Parciais Superiores de Cada Vão */}
                {Array.from({ length: numVaosHoriz }).map((_, j) => {
                  const x1 = startX + (j * drawWidth) / numVaosHoriz;
                  const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                  const midX = (x1 + x2) / 2;
                  return (
                    <g key={`d3-ext-span-dim-${j}`}>
                      <line x1={x1} y1={startY - 10} x2={x2} y2={startY - 10} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x1} y1={startY - 13} x2={x1} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x2} y1={startY - 13} x2={x2} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      {drawWidth / numVaosHoriz > 35 && (
                        <text
                          x={midX}
                          y={startY - 12}
                          fill="#475569"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {vaoHorizCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Linhas de Extensão Laterais Direitas */}
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth + 42} y2={startY} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY + drawHeight} x2={startX + drawWidth + 42} y2={startY + drawHeight} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Lateral (Altura Total) */}
                <line x1={startX + drawWidth + 34} y1={startY} x2={startX + drawWidth + 34} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 30} y1={startY} x2={startX + drawWidth + 38} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 30} y1={startY + drawHeight} x2={startX + drawWidth + 38} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 45}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 45}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cota de Corte Real da Coluna Vertical */}
                <line x1={startX + drawWidth + 12} y1={startY + 2} x2={startX + drawWidth + 12} y2={startY + drawHeight - 2} stroke="#b45309" strokeWidth="1.2" />
                <line x1={startX + drawWidth + 8} y1={startY + 2} x2={startX + drawWidth + 16} y2={startY + 2} stroke="#b45309" strokeWidth="1" />
                <line x1={startX + drawWidth + 8} y1={startY + drawHeight - 2} x2={startX + drawWidth + 16} y2={startY + drawHeight - 2} stroke="#b45309" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 22}
                  y={startY + drawHeight / 2}
                  fill="#92400e"
                  fontSize="6.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 22}, ${startY + drawHeight / 2})`}
                >
                  Corte: {vertCutLength.toFixed(2).replace('.', ',')} m
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAMA 4: Estrutura Vertical - Topologia Colunas Contínuas (Solda Vert) */}
        {/* ========================================================================= */}
        {showPart2 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d4.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 4 — {d4.title} ({d4.shortTitle})
                </h4>
                {d4.isWinner && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    ★ MODELO VITORIOSO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d4.totalBars} barras de 6,00 m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d4.totalMetragemLinear.toFixed(2).replace('.', ',')} m
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d4.aproveitamentoPct.toFixed(1).replace('.', ',')}% aproveitamento
                </span>
                <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  {d4.weldsCount} pontos de solda
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                <defs>
                  <marker id="d4-int-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                    <path d="M 10 1 L 0 5 L 10 9 z" fill="#0f766e" />
                  </marker>
                  <marker id="d4-int-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f766e" />
                  </marker>
                </defs>

                {/* Outer Bounding Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  rx="2"
                />

                {/* Full Height Vertical Columns */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;

                  return (
                    <g key={`d4-col-${j}`}>
                      <line
                        x1={x}
                        y1={startY}
                        x2={x}
                        y2={startY + drawHeight}
                        stroke={isOuter ? '#0f766e' : '#14b8a6'}
                        strokeWidth={isOuter ? '3' : '2'}
                        strokeLinecap="round"
                      />

                      {/* Column Center Tag */}
                      <g>
                        <rect
                          x={x - 14}
                          y={startY + drawHeight / 2 - 6}
                          width="28"
                          height="12"
                          rx="2"
                          fill="#ffffff"
                          stroke="#0f766e"
                          strokeWidth="0.8"
                        />
                        <text
                          x={x}
                          y={startY + drawHeight / 2 + 2.5}
                          fill="#134e4a"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          C{elem.index}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Intermediary Crossbeams with Vertical Welds */}
                {Array.from({ length: linhasHorizontais }).map((_, i) => {
                  const y = startY + (i * drawHeight) / numVaosVert;
                  return (
                    <g key={`d4-h-${i}`}>
                      {Array.from({ length: numVaosHoriz }).map((_, j) => {
                        const x1 = startX + (j * drawWidth) / numVaosHoriz;
                        const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;

                        return (
                          <g key={`d4-cross-${i}-${j}`}>
                            <line x1={x1 + 2} y1={y} x2={x2 - 2} y2={y} stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
                            <circle cx={x1} cy={y} r="2.2" fill="#ef4444" />
                            <circle cx={x2} cy={y} r="2.2" fill="#ef4444" />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTAS INTERNAS DO DIAGRAMA 4 === */}
                {Array.from({ length: numVaosVert }).map((_, i) => {
                  const y1 = startY + (i * drawHeight) / numVaosVert;
                  const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                  const midY = (y1 + y2) / 2;
                  const cellH = y2 - y1;

                  return (
                    <g key={`d4-int-row-${i}`}>
                      {Array.from({ length: numVaosHoriz }).map((_, j) => {
                        const x1 = startX + (j * drawWidth) / numVaosHoriz;
                        const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                        const midX = (x1 + x2) / 2;
                        const cellW = x2 - x1;

                        return (
                          <g key={`d4-int-cell-${i}-${j}`}>
                            {cellW > 45 && cellH > 24 && (
                              <>
                                <line
                                  x1={x1 + 6}
                                  y1={midY - (cellH > 36 ? 4 : 0)}
                                  x2={x2 - 6}
                                  y2={midY - (cellH > 36 ? 4 : 0)}
                                  stroke="#0f766e"
                                  strokeWidth="0.8"
                                  strokeDasharray="2 2"
                                  markerStart="url(#d4-int-start)"
                                  markerEnd="url(#d4-int-end)"
                                />
                                <rect
                                  x={midX - 22}
                                  y={midY - (cellH > 36 ? 10 : 5.5)}
                                  width="44"
                                  height="11"
                                  rx="2"
                                  fill="#ffffff"
                                  stroke="#0f766e"
                                  strokeWidth="0.7"
                                />
                                <text
                                  x={midX}
                                  y={midY - (cellH > 36 ? 2 : -2.5)}
                                  fill="#134e4a"
                                  fontSize="6.5"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  Vão: {vaoHorizCmStr} cm
                                </text>

                                {j === 0 && cellH > 36 && (
                                  <>
                                    <line
                                      x1={x1 + 14}
                                      y1={y1 + 6}
                                      x2={x1 + 14}
                                      y2={y2 - 6}
                                      stroke="#0f766e"
                                      strokeWidth="0.8"
                                      strokeDasharray="2 2"
                                      markerStart="url(#d4-int-start)"
                                      markerEnd="url(#d4-int-end)"
                                    />
                                    <rect
                                      x={x1 + 16}
                                      y={midY + 2}
                                      width="42"
                                      height="10"
                                      rx="2"
                                      fill="#ffffff"
                                      stroke="#0f766e"
                                      strokeWidth="0.6"
                                    />
                                    <text
                                      x={x1 + 37}
                                      y={midY + 9.5}
                                      fill="#134e4a"
                                      fontSize="6"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      Alt: {vaoVertCmStr} cm
                                    </text>
                                  </>
                                )}
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTAS EXTERNAS DO DIAGRAMA 4 === */}
                {/* Linhas de Extensão Superiores */}
                <line x1={startX} y1={startY} x2={startX} y2={startY - 30} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth} y2={startY - 30} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 70}
                  y={startY - 32}
                  width="140"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({colunasVerticais} Colunas Passantes)
                </text>

                {/* Cotas Parciais Superiores de Cada Vão */}
                {Array.from({ length: numVaosHoriz }).map((_, j) => {
                  const x1 = startX + (j * drawWidth) / numVaosHoriz;
                  const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                  const midX = (x1 + x2) / 2;
                  return (
                    <g key={`d4-ext-span-dim-${j}`}>
                      <line x1={x1} y1={startY - 10} x2={x2} y2={startY - 10} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x1} y1={startY - 13} x2={x1} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      <line x1={x2} y1={startY - 13} x2={x2} y2={startY - 7} stroke="#475569" strokeWidth="0.8" />
                      {drawWidth / numVaosHoriz > 35 && (
                        <text
                          x={midX}
                          y={startY - 12}
                          fill="#475569"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {vaoHorizCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Linhas de Extensão Laterais Direitas */}
                <line x1={startX + drawWidth} y1={startY} x2={startX + drawWidth + 38} y2={startY} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />
                <line x1={startX + drawWidth} y1={startY + drawHeight} x2={startX + drawWidth + 38} y2={startY + drawHeight} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2 2" />

                {/* Cota Geral Lateral (Altura Total da Coluna) */}
                <line x1={startX + drawWidth + 30} y1={startY} x2={startX + drawWidth + 30} y2={startY + drawHeight} stroke="#0f766e" strokeWidth="1.2" />
                <line x1={startX + drawWidth + 26} y1={startY} x2={startX + drawWidth + 34} y2={startY} stroke="#0f766e" strokeWidth="1" />
                <line x1={startX + drawWidth + 26} y1={startY + drawHeight} x2={startX + drawWidth + 34} y2={startY + drawHeight} stroke="#0f766e" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 42}
                  y={startY + drawHeight / 2}
                  fill="#0f766e"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 42}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cotas Parciais Verticais dos Vãos */}
                {Array.from({ length: numVaosVert }).map((_, i) => {
                  const y1 = startY + (i * drawHeight) / numVaosVert;
                  const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                  const midY = (y1 + y2) / 2;
                  return (
                    <g key={`d4-ext-vspan-dim-${i}`}>
                      <line x1={startX + drawWidth + 10} y1={y1} x2={startX + drawWidth + 10} y2={y2} stroke="#475569" strokeWidth="0.8" />
                      <line x1={startX + drawWidth + 7} y1={y1} x2={startX + drawWidth + 13} y2={y1} stroke="#475569" strokeWidth="0.8" />
                      <line x1={startX + drawWidth + 7} y1={y2} x2={startX + drawWidth + 13} y2={y2} stroke="#475569" strokeWidth="0.8" />
                      {drawHeight / numVaosVert > 16 && (
                        <text
                          x={startX + drawWidth + 16}
                          y={midY + 2.5}
                          fill="#475569"
                          fontSize="6"
                          fontWeight="bold"
                          textAnchor="start"
                        >
                          {vaoVertCmStr} cm
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
