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

  const padLeft = 65;
  const padRight = 65;
  const padTop = 40;
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

  // Partial span dimensions in cm
  const vaoHorizCmStr = (vaoLivreHoriz * 100).toFixed(1).replace('.', ',');
  const vaoVertCmStr = (vaoLivreVert * 100).toFixed(1).replace('.', ',');

  const showPart1 = part === 'all' || part === 'part1';
  const showPart2 = part === 'all' || part === 'part2';

  // Stagger column badges if many columns
  const isColStaggered = colunasVerticais > 14;

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
              Modelos 1 e 2 • Cotas Padronizadas e Simbologia de Solda
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
                ★ Melhor custo/benefício: {winnerDiagram.shortTitle} ({winnerDiagram.weldsCount} soldas • {winnerDiagram.totalBars} barras)
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
            Modelos 3 e 4 • Cotas Padronizadas e Simbologia de Solda
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 font-serif">
        {/* ========================================================================= */}
        {/* DIAGRAMA 1: Estrutura Horizontal - Topologia Linhas Contínuas (Solda Horiz) */}
        {/* ========================================================================= */}
        {showPart1 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d1.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            {/* Header Padronizado */}
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 1 — {d1.title} ({d1.shortTitle})
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d1.totalBars} barras (6,00 m)
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d1.totalMetragemLinear.toFixed(2).replace('.', ',')} m linear
                </span>
                <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
                  {d1.weldsCount} pontos de solda
                </span>
                {d1.isWinner ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                    ★ Melhor custo/benefício
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Alternativa
                  </span>
                )}
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
                  rx="2"
                />

                {/* Vertical Columns (C1 a Cn) */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  const isEven = j % 2 === 1;
                  const tagY = startY - (isColStaggered && isEven ? 19 : 10);

                  return (
                    <g key={`d1-col-${j}`}>
                      {/* Vertical Column Line */}
                      <line
                        x1={x}
                        y1={startY}
                        x2={x}
                        y2={startY + drawHeight}
                        stroke={isOuter ? '#b45309' : '#e2e8f0'}
                        strokeWidth={isOuter ? '2' : '1.2'}
                        strokeDasharray={isOuter ? undefined : '2 2'}
                      />

                      {/* Top Column Tag (C1..Cn) */}
                      <rect
                        x={x - 8}
                        y={tagY - 5.5}
                        width="16"
                        height="10"
                        rx="2"
                        fill={isOuter ? '#fef3c7' : '#ffffff'}
                        stroke={isOuter ? '#b45309' : '#cbd5e1'}
                        strokeWidth="0.7"
                      />
                      <text
                        x={x}
                        y={tagY + 2}
                        fill={isOuter ? '#78350f' : '#475569'}
                        fontSize="6.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        C{elem.index}
                      </text>
                    </g>
                  );
                })}

                {/* Horizontal Lines (L1 a Ln) */}
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

                      {/* Left Identifier Tag (L1..L6) */}
                      <rect
                        x={startX - 26}
                        y={y - 5.5}
                        width="20"
                        height="11"
                        rx="2"
                        fill={isBorder ? '#1e3a8a' : '#f1f5f9'}
                        stroke={isBorder ? '#1e3a8a' : '#cbd5e1'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={startX - 16}
                        y={y + 2.5}
                        fill={isBorder ? '#ffffff' : '#1e293b'}
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        L{elem.index}
                      </text>

                      {/* Horizontal Welding Points at Column Intersections */}
                      {verticalElements.map((_, j) => {
                        const x = startX + (j * drawWidth) / numVaosHoriz;
                        return (
                          <circle
                            key={`d1-weld-${i}-${j}`}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="0.8"
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTA TÍPICA LIMPA DO PRIMEIRO VÃO (Sem Repetição Poluída) === */}
                <g>
                  {/* Vão Horiz Típico no 1º vão */}
                  <line x1={startX} y1={startY + drawHeight + 10} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 10} stroke="#2563eb" strokeWidth="0.9" />
                  <line x1={startX} y1={startY + drawHeight + 6} x2={startX} y2={startY + drawHeight + 14} stroke="#2563eb" strokeWidth="0.9" />
                  <line x1={startX + drawWidth / numVaosHoriz} y1={startY + drawHeight + 6} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 14} stroke="#2563eb" strokeWidth="0.9" />
                  <text
                    x={startX + drawWidth / (2 * numVaosHoriz)}
                    y={startY + drawHeight + 20}
                    fill="#1d4ed8"
                    fontSize="6.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Vão Típico: {vaoHorizCmStr} cm
                  </text>
                </g>

                {/* === COTAS GERAIS MASTER (Superior e Lateral Direita) === */}
                {/* Cota Geral Superior (Largura Total) */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 80}
                  y={startY - 32}
                  width="160"
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
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({numVaosHoriz} vãos = {vaoHorizCmStr} cm)
                </text>

                {/* Cota Geral Lateral Direita (Altura Total) */}
                <line x1={startX + drawWidth + 24} y1={startY} x2={startX + drawWidth + 24} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 20} y1={startY} x2={startX + drawWidth + 28} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 20} y1={startY + drawHeight} x2={startX + drawWidth + 28} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 38}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 38}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m ({numVaosVert} vãos = {vaoVertCmStr} cm)
                </text>
              </svg>
            </div>

            {/* Rodapé Padronizado com Legenda Técnica e Simbologia de Solda */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200 text-[10.5px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">Vãos Modulares Padronizados:</span>
                <span>Todos os {numVaosHoriz} vãos horizontais = <strong>{vaoHorizCmStr} cm</strong> • Todos os {numVaosVert} vãos verticais = <strong>{vaoVertCmStr} cm</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>● Marcação de Solda em todos os {d1.weldsCount} nós de cruzamento</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAMA 2: Estrutura Horizontal - Topologia Colunas Contínuas (Solda Vert) */}
        {/* ========================================================================= */}
        {showPart1 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d2.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            {/* Header Padronizado */}
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 2 — {d2.title} ({d2.shortTitle})
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d2.totalBars} barras (6,00 m)
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d2.totalMetragemLinear.toFixed(2).replace('.', ',')} m linear
                </span>
                <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
                  {d2.weldsCount} pontos de solda
                </span>
                {d2.isWinner ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                    ★ Melhor custo/benefício
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Alternativa
                  </span>
                )}
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
                  rx="2"
                />

                {/* Pass-Through Columns (C1 a Cn) */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  const isEven = j % 2 === 1;
                  const tagY = startY - (isColStaggered && isEven ? 19 : 10);

                  return (
                    <g key={`d2-col-${j}`}>
                      <line
                        x1={x}
                        y1={startY}
                        x2={x}
                        y2={startY + drawHeight}
                        stroke={isOuter ? '#047857' : '#059669'}
                        strokeWidth={isOuter ? '2.8' : '2'}
                        strokeLinecap="round"
                      />

                      {/* Top Column Tag (C1..Cn) */}
                      <rect
                        x={x - 8}
                        y={tagY - 5.5}
                        width="16"
                        height="10"
                        rx="2"
                        fill={isOuter ? '#d1fae5' : '#ffffff'}
                        stroke={isOuter ? '#047857' : '#cbd5e1'}
                        strokeWidth="0.7"
                      />
                      <text
                        x={x}
                        y={tagY + 2}
                        fill={isOuter ? '#064e3b' : '#475569'}
                        fontSize="6.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        C{elem.index}
                      </text>
                    </g>
                  );
                })}

                {/* Sectioned Horizontal Crossbeams (Travessas Cortadas entre Colunas) & Soldas Verticais */}
                {Array.from({ length: linhasHorizontais }).map((_, i) => {
                  const y = startY + (i * drawHeight) / numVaosVert;
                  const isBorder = i === 0 || i === linhasHorizontais - 1;

                  return (
                    <g key={`d2-row-${i}`}>
                      {/* Left Identifier Tag (L1..L6) */}
                      <rect
                        x={startX - 26}
                        y={y - 5.5}
                        width="20"
                        height="11"
                        rx="2"
                        fill={isBorder ? '#065f46' : '#f1f5f9'}
                        stroke={isBorder ? '#065f46' : '#cbd5e1'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={startX - 16}
                        y={y + 2.5}
                        fill={isBorder ? '#ffffff' : '#1e293b'}
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        L{i + 1}
                      </text>

                      {Array.from({ length: numVaosHoriz }).map((_, j) => {
                        const x1 = startX + (j * drawWidth) / numVaosHoriz;
                        const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;

                        return (
                          <g key={`d2-crossbeam-${i}-${j}`}>
                            {/* Segment Line */}
                            <line
                              x1={x1 + 1.5}
                              y1={y}
                              x2={x2 - 1.5}
                              y2={y}
                              stroke="#0284c7"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />

                            {/* Vertical Solder Welds at Column Junctions (Filetes Vermelhos) */}
                            <line x1={x1 + 1} y1={y - 3.5} x2={x1 + 1} y2={y + 3.5} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                            <line x1={x2 - 1} y1={y - 3.5} x2={x2 - 1} y2={y + 3.5} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTA TÍPICA DO 1º VÃO === */}
                <g>
                  <line x1={startX} y1={startY + drawHeight + 10} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 10} stroke="#059669" strokeWidth="0.9" />
                  <line x1={startX} y1={startY + drawHeight + 6} x2={startX} y2={startY + drawHeight + 14} stroke="#059669" strokeWidth="0.9" />
                  <line x1={startX + drawWidth / numVaosHoriz} y1={startY + drawHeight + 6} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 14} stroke="#059669" strokeWidth="0.9" />
                  <text
                    x={startX + drawWidth / (2 * numVaosHoriz)}
                    y={startY + drawHeight + 20}
                    fill="#047857"
                    fontSize="6.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Travessa: {vaoHorizCmStr} cm
                  </text>
                </g>

                {/* === COTAS GERAIS MASTER === */}
                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 85}
                  y={startY - 32}
                  width="170"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({numVaosHoriz} travessas = {vaoHorizCmStr} cm)
                </text>

                {/* Cota Geral Lateral */}
                <line x1={startX + drawWidth + 24} y1={startY} x2={startX + drawWidth + 24} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 20} y1={startY} x2={startX + drawWidth + 28} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 20} y1={startY + drawHeight} x2={startX + drawWidth + 28} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 38}
                  y={startY + drawHeight / 2}
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 38}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m ({numVaosVert} vãos = {vaoVertCmStr} cm)
                </text>
              </svg>
            </div>

            {/* Rodapé Padronizado */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200 text-[10.5px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">Vãos Modulares Padronizados:</span>
                <span>Todos os {numVaosHoriz} vãos horizontais = <strong>{vaoHorizCmStr} cm</strong> • Todos os {numVaosVert} vãos verticais = <strong>{vaoVertCmStr} cm</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>● Soldas verticais bilaterais em todos os {d2.weldsCount} encontros de travessas</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAMA 3: Estrutura Vertical - Topologia Linhas Contínuas (Solda Horiz) */}
        {/* ========================================================================= */}
        {showPart2 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d3.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            {/* Header Padronizado */}
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 3 — {d3.title} ({d3.shortTitle})
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d3.totalBars} barras (6,00 m)
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d3.totalMetragemLinear.toFixed(2).replace('.', ',')} m linear
                </span>
                <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
                  {d3.weldsCount} pontos de solda
                </span>
                {d3.isWinner ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                    ★ Melhor custo/benefício
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Alternativa
                  </span>
                )}
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
                  rx="2"
                />

                {/* Continuous Top (L1) and Bottom (Ln) Border Lines */}
                <line x1={startX} y1={startY} x2={startX + drawWidth} y2={startY} stroke="#1e293b" strokeWidth="3" />
                <line x1={startX} y1={startY + drawHeight} x2={startX + drawWidth} y2={startY + drawHeight} stroke="#1e293b" strokeWidth="3" />

                {/* Left Line Tags for Top and Bottom (L1 and L6) */}
                <rect x={startX - 26} y={startY - 5.5} width="20" height="11" rx="2" fill="#1e293b" stroke="#1e293b" strokeWidth="0.8" />
                <text x={startX - 16} y={startY + 2.5} fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">L1</text>

                <rect x={startX - 26} y={startY + drawHeight - 5.5} width="20" height="11" rx="2" fill="#1e293b" stroke="#1e293b" strokeWidth="0.8" />
                <text x={startX - 16} y={startY + drawHeight + 2.5} fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">L{linhasHorizontais}</text>

                {/* Vertical Columns Cut to Inner Span (C1 a Cn) */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  const isEven = j % 2 === 1;
                  const tagY = startY - (isColStaggered && isEven ? 19 : 10);

                  return (
                    <g key={`d3-col-${j}`}>
                      {/* Vertical Column Bar */}
                      <line
                        x1={x}
                        y1={startY + 1.5}
                        x2={x}
                        y2={startY + drawHeight - 1.5}
                        stroke={isOuter ? '#b45309' : '#d97706'}
                        strokeWidth={isOuter ? '2.8' : '2'}
                        strokeLinecap="round"
                      />

                      {/* Horizontal Weld Joints Top and Bottom (Pontos de Solda de Topo) */}
                      <circle cx={x} cy={startY + 1} r="2.5" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />
                      <circle cx={x} cy={startY + drawHeight - 1} r="2.5" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />

                      {/* Top Column Tag (C1..Cn) */}
                      <rect
                        x={x - 8}
                        y={tagY - 5.5}
                        width="16"
                        height="10"
                        rx="2"
                        fill={isOuter ? '#fef3c7' : '#ffffff'}
                        stroke={isOuter ? '#b45309' : '#cbd5e1'}
                        strokeWidth="0.7"
                      />
                      <text
                        x={x}
                        y={tagY + 2}
                        fill={isOuter ? '#92400e' : '#475569'}
                        fontSize="6.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        C{elem.index}
                      </text>
                    </g>
                  );
                })}

                {/* === COTA TÍPICA DO 1º VÃO === */}
                <g>
                  <line x1={startX} y1={startY + drawHeight + 10} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 10} stroke="#b45309" strokeWidth="0.9" />
                  <line x1={startX} y1={startY + drawHeight + 6} x2={startX} y2={startY + drawHeight + 14} stroke="#b45309" strokeWidth="0.9" />
                  <line x1={startX + drawWidth / numVaosHoriz} y1={startY + drawHeight + 6} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 14} stroke="#b45309" strokeWidth="0.9" />
                  <text
                    x={startX + drawWidth / (2 * numVaosHoriz)}
                    y={startY + drawHeight + 20}
                    fill="#92400e"
                    fontSize="6.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Vão: {vaoHorizCmStr} cm
                  </text>
                </g>

                {/* === COTAS GERAIS MASTER === */}
                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 80}
                  y={startY - 32}
                  width="160"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({colunasVerticais} Colunas)
                </text>

                {/* Cota Geral Lateral (Altura Total) */}
                <line x1={startX + drawWidth + 28} y1={startY} x2={startX + drawWidth + 28} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 24} y1={startY} x2={startX + drawWidth + 32} y2={startY} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth + 24} y1={startY + drawHeight} x2={startX + drawWidth + 32} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
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

                {/* Cota de Corte Real da Coluna Vertical */}
                <line x1={startX + drawWidth + 10} y1={startY + 2} x2={startX + drawWidth + 10} y2={startY + drawHeight - 2} stroke="#b45309" strokeWidth="1.2" />
                <line x1={startX + drawWidth + 6} y1={startY + 2} x2={startX + drawWidth + 14} y2={startY + 2} stroke="#b45309" strokeWidth="1" />
                <line x1={startX + drawWidth + 6} y1={startY + drawHeight - 2} x2={startX + drawWidth + 14} y2={startY + drawHeight - 2} stroke="#b45309" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 18}
                  y={startY + drawHeight / 2}
                  fill="#92400e"
                  fontSize="6.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 18}, ${startY + drawHeight / 2})`}
                >
                  Corte: {vertCutLength.toFixed(2).replace('.', ',')} m
                </text>
              </svg>
            </div>

            {/* Rodapé Padronizado */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200 text-[10.5px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">Vãos Modulares Padronizados:</span>
                <span>Todos os {numVaosHoriz} vãos horizontais = <strong>{vaoHorizCmStr} cm</strong> • Corte unitário das colunas = <strong>{vertCutLength.toFixed(2).replace('.', ',')} m</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>● Soldas de topo em cada extremidade das colunas ({d3.weldsCount} nós)</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIAGRAMA 4: Estrutura Vertical - Topologia Colunas Contínuas (Solda Vert) */}
        {/* ========================================================================= */}
        {showPart2 && (
          <div className={`bg-white text-slate-900 rounded-lg p-3 border ${d4.isWinner ? 'border-emerald-500 ring-1 ring-emerald-400' : 'border-slate-300'}`}>
            {/* Header Padronizado */}
            <div className="flex flex-wrap items-center justify-between mb-2 font-serif gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 font-serif">
                  Figura 4 — {d4.title} ({d4.shortTitle})
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {d4.totalBars} barras (6,00 m)
                </span>
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {d4.totalMetragemLinear.toFixed(2).replace('.', ',')} m linear
                </span>
                <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
                  {d4.weldsCount} pontos de solda
                </span>
                {d4.isWinner ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                    ★ Melhor custo/benefício
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Alternativa
                  </span>
                )}
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
                  rx="2"
                />

                {/* Full Height Vertical Columns (C1 a Cn) */}
                {verticalElements.map((elem, j) => {
                  const x = startX + (j * drawWidth) / numVaosHoriz;
                  const isOuter = j === 0 || j === colunasVerticais - 1;
                  const isEven = j % 2 === 1;
                  const tagY = startY - (isColStaggered && isEven ? 19 : 10);

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

                      {/* Top Column Tag (C1..Cn) */}
                      <rect
                        x={x - 8}
                        y={tagY - 5.5}
                        width="16"
                        height="10"
                        rx="2"
                        fill={isOuter ? '#ccfbf1' : '#ffffff'}
                        stroke={isOuter ? '#0f766e' : '#cbd5e1'}
                        strokeWidth="0.7"
                      />
                      <text
                        x={x}
                        y={tagY + 2}
                        fill={isOuter ? '#115e59' : '#475569'}
                        fontSize="6.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        C{elem.index}
                      </text>
                    </g>
                  );
                })}

                {/* Intermediary Crossbeams with Vertical Welds (L1 a Ln) */}
                {Array.from({ length: linhasHorizontais }).map((_, i) => {
                  const y = startY + (i * drawHeight) / numVaosVert;
                  const isBorder = i === 0 || i === linhasHorizontais - 1;

                  return (
                    <g key={`d4-h-${i}`}>
                      {/* Left Line Identifier Tag (L1..L6) */}
                      <rect
                        x={startX - 26}
                        y={y - 5.5}
                        width="20"
                        height="11"
                        rx="2"
                        fill={isBorder ? '#0f766e' : '#f1f5f9'}
                        stroke={isBorder ? '#0f766e' : '#cbd5e1'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={startX - 16}
                        y={y + 2.5}
                        fill={isBorder ? '#ffffff' : '#1e293b'}
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        L{i + 1}
                      </text>

                      {Array.from({ length: numVaosHoriz }).map((_, j) => {
                        const x1 = startX + (j * drawWidth) / numVaosHoriz;
                        const x2 = startX + ((j + 1) * drawWidth) / numVaosHoriz;

                        return (
                          <g key={`d4-cross-${i}-${j}`}>
                            <line x1={x1 + 1.5} y1={y} x2={x2 - 1.5} y2={y} stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
                            {/* Soldas nas pontas das travessas */}
                            <circle cx={x1} cy={y} r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                            <circle cx={x2} cy={y} r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* === COTA TÍPICA DO 1º VÃO === */}
                <g>
                  <line x1={startX} y1={startY + drawHeight + 10} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 10} stroke="#0f766e" strokeWidth="0.9" />
                  <line x1={startX} y1={startY + drawHeight + 6} x2={startX} y2={startY + drawHeight + 14} stroke="#0f766e" strokeWidth="0.9" />
                  <line x1={startX + drawWidth / numVaosHoriz} y1={startY + drawHeight + 6} x2={startX + drawWidth / numVaosHoriz} y2={startY + drawHeight + 14} stroke="#0f766e" strokeWidth="0.9" />
                  <text
                    x={startX + drawWidth / (2 * numVaosHoriz)}
                    y={startY + drawHeight + 20}
                    fill="#0f766e"
                    fontSize="6.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Vão Típico: {vaoHorizCmStr} cm
                  </text>
                </g>

                {/* === COTAS GERAIS MASTER === */}
                {/* Cota Geral Superior */}
                <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
                <rect
                  x={startX + drawWidth / 2 - 85}
                  y={startY - 32}
                  width="170"
                  height="13"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="0.7"
                  rx="2"
                />
                <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Largura Total: {largura.toFixed(2).replace('.', ',')} m ({colunasVerticais} Colunas Passantes)
                </text>

                {/* Cota Geral Lateral (Altura Total da Coluna) */}
                <line x1={startX + drawWidth + 24} y1={startY} x2={startX + drawWidth + 24} y2={startY + drawHeight} stroke="#0f766e" strokeWidth="1.2" />
                <line x1={startX + drawWidth + 20} y1={startY} x2={startX + drawWidth + 28} y2={startY} stroke="#0f766e" strokeWidth="1" />
                <line x1={startX + drawWidth + 20} y1={startY + drawHeight} x2={startX + drawWidth + 28} y2={startY + drawHeight} stroke="#0f766e" strokeWidth="1" />
                <text
                  x={startX + drawWidth + 38}
                  y={startY + drawHeight / 2}
                  fill="#0f766e"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 38}, ${startY + drawHeight / 2})`}
                >
                  Altura Total: {altura.toFixed(2).replace('.', ',')} m ({numVaosVert} vãos = {vaoVertCmStr} cm)
                </text>
              </svg>
            </div>

            {/* Rodapé Padronizado */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200 text-[10.5px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">Vãos Modulares Padronizados:</span>
                <span>Todos os {numVaosHoriz} vãos horizontais = <strong>{vaoHorizCmStr} cm</strong> • Todos os {numVaosVert} vãos verticais = <strong>{vaoVertCmStr} cm</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>● Soldas em todos os {d4.weldsCount} encontros de travessas com as colunas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
