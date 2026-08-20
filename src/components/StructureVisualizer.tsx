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
  const svgHeight = 220;

  const padLeft = 85;
  const padRight = 55;
  const padTop = 40;
  const padBottom = 34;

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

  // Partial span dimensions in cm
  const vaoHorizCmStr = (vaoLivreHoriz * 100).toFixed(1).replace('.', ',');
  const vaoVertCmStr = (vaoLivreVert * 100).toFixed(1).replace('.', ',');

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
                  {d1.weldsCount} pontos de solda (~{d1.weldingTimeFormatted})
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
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

                {/* === COTAS TÉCNICAS DO DIAGRAMA 1 === */}
                {/* Cota Geral Superior (Largura Total) */}
                <line
                  x1={startX}
                  y1={startY - 22}
                  x2={startX + drawWidth}
                  y2={startY - 22}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <line x1={startX} y1={startY - 27} x2={startX} y2={startY - 17} stroke="#0f172a" strokeWidth="1" />
                <line
                  x1={startX + drawWidth}
                  y1={startY - 27}
                  x2={startX + drawWidth}
                  y2={startY - 17}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <rect
                  x={startX + drawWidth / 2 - 40}
                  y={startY - 29}
                  width="80"
                  height="13"
                  fill="#ffffff"
                  rx="2"
                />
                <text
                  x={startX + drawWidth / 2}
                  y={startY - 20}
                  fill="#0f172a"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cotas Parciais Superiores de Cada Vão Livre */}
                {numVaosHoriz > 1 &&
                  Array.from({ length: numVaosHoriz }).map((_, j) => {
                    const x1 = startX + (j * drawWidth) / numVaosHoriz;
                    const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;
                    const midX = (x1 + x2) / 2;
                    return (
                      <g key={`d1-span-dim-${j}`}>
                        <line x1={x1} y1={startY - 8} x2={x2} y2={startY - 8} stroke="#475569" strokeWidth="0.8" />
                        <line x1={x1} y1={startY - 11} x2={x1} y2={startY - 5} stroke="#475569" strokeWidth="0.8" />
                        <line x1={x2} y1={startY - 11} x2={x2} y2={startY - 5} stroke="#475569" strokeWidth="0.8" />
                        {drawWidth / numVaosHoriz > 35 && (
                          <text
                            x={midX}
                            y={startY - 11}
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

                {/* Cota Geral Lateral Direita (Altura Total) */}
                <line
                  x1={startX + drawWidth + 22}
                  y1={startY}
                  x2={startX + drawWidth + 22}
                  y2={startY + drawHeight}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <line
                  x1={startX + drawWidth + 17}
                  y1={startY}
                  x2={startX + drawWidth + 27}
                  y2={startY}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <line
                  x1={startX + drawWidth + 17}
                  y1={startY + drawHeight}
                  x2={startX + drawWidth + 27}
                  y2={startY + drawHeight}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <text
                  x={startX + drawWidth + 36}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 36}, ${startY + drawHeight / 2})`}
                >
                  Altura: {altura.toFixed(2).replace('.', ',')} m
                </text>

                {/* Cotas Parciais Verticais dos Vãos */}
                {numVaosVert > 1 &&
                  Array.from({ length: numVaosVert }).map((_, i) => {
                    const y1 = startY + (i * drawHeight) / numVaosVert;
                    const y2 = startY + ((i + 1) * drawHeight) / numVaosVert;
                    const midY = (y1 + y2) / 2;
                    return (
                      <g key={`d1-vspan-dim-${i}`}>
                        <line x1={startX + drawWidth + 7} y1={y1} x2={startX + drawWidth + 7} y2={y2} stroke="#475569" strokeWidth="0.8" />
                        <line x1={startX + drawWidth + 4} y1={y1} x2={startX + drawWidth + 10} y2={y1} stroke="#475569" strokeWidth="0.8" />
                        <line x1={startX + drawWidth + 4} y1={y2} x2={startX + drawWidth + 10} y2={y2} stroke="#475569" strokeWidth="0.8" />
                        {drawHeight / numVaosVert > 18 && (
                          <text
                            x={startX + drawWidth + 12}
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
                  {d2.weldsCount} pontos de solda (~{d2.weldingTimeFormatted})
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
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
                            {drawWidth / numVaosHoriz > 42 && (
                              <g>
                                <rect
                                  x={midX - 16}
                                  y={y - 5.5}
                                  width="32"
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

                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 20} x2={startX + drawWidth} y2={startY - 20} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 25} x2={startX} y2={startY - 15} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 25} x2={startX + drawWidth} y2={startY - 15} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 60}
                  y={startY - 29}
                  width="120"
                  height="14"
                  fill="#ffffff"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 19} fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({numVaosHoriz} Travessas por Linha)
                </text>

                {/* Cota Geral Lateral */}
                <line x1={startX + drawWidth + 20} y1={startY} x2={startX + drawWidth + 20} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 15} y1={startY} x2={startX + drawWidth + 25} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 15} y1={startY + drawHeight} x2={startX + drawWidth + 25} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 34}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 34}, ${startY + drawHeight / 2})`}
                >
                  Altura: {altura.toFixed(2).replace('.', ',')} m
                </text>
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
                  {d3.weldsCount} pontos de solda (~{d3.weldingTimeFormatted})
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
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

                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 24} x2={startX + drawWidth} y2={startY - 24} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 19} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 19} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 55}
                  y={startY - 31}
                  width="110"
                  height="14"
                  fill="#ffffff"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 21} fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({colunasVerticais} Colunas)
                </text>

                {/* Cota de Corte Real da Coluna Vertical */}
                <line x1={startX + drawWidth + 20} y1={startY + 2} x2={startX + drawWidth + 20} y2={startY + drawHeight - 2} stroke="#b45309" strokeWidth="1.2" />
                <line x1={startX + drawWidth + 15} y1={startY + 2} x2={startX + drawWidth + 25} y2={startY + 2} stroke="#b45309" strokeWidth="1" />
                <line x1={startX + drawWidth + 15} y1={startY + drawHeight - 2} x2={startX + drawWidth + 25} y2={startY + drawHeight - 2} stroke="#b45309" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 34}
                  y={startY + drawHeight / 2}
                  fill="#92400e"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 34}, ${startY + drawHeight / 2})`}
                >
                  Corte Real: {vertCutLength.toFixed(2).replace('.', ',')} m
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
                  {d4.weldsCount} pontos de solda (~{d4.weldingTimeFormatted})
                </span>
              </div>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
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

                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 20} x2={startX + drawWidth} y2={startY - 20} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 25} x2={startX} y2={startY - 15} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 25} x2={startX + drawWidth} y2={startY - 15} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 70}
                  y={startY - 29}
                  width="140"
                  height="14"
                  fill="#ffffff"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 19} fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({colunasVerticais} Colunas Passantes)
                </text>

                {/* Cota Geral Lateral (Altura Total da Coluna) */}
                <line x1={startX + drawWidth + 20} y1={startY} x2={startX + drawWidth + 20} y2={startY + drawHeight} stroke="#0f766e" strokeWidth="1.2" />
                <line x1={startX + drawWidth + 15} y1={startY} x2={startX + drawWidth + 25} y2={startY} stroke="#0f766e" strokeWidth="1" />
                <line x1={startX + drawWidth + 15} y1={startY + drawHeight} x2={startX + drawWidth + 25} y2={startY + drawHeight} stroke="#0f766e" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 34}
                  y={startY + drawHeight / 2}
                  fill="#0f766e"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 34}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m
                </text>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
