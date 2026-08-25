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
    totalBarrasOtimizado,
    weldsCountHorizTopology,
    transportLogistics,
    winnerDiagram,
  } = calc;

  const extFaceMm = Math.round(profileExt.faceSizeM * 1000);

  // High-precision Blueprint dimensions
  const svgWidth = 720;
  const svgHeight = 240;

  const padLeft = 60;
  const padRight = 65;
  const padTop = 38;
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

  const numVaosHoriz = Math.max(1, colunasVerticais - 1);
  const numVaosVert = Math.max(1, linhasHorizontais - 1);

  const vaoHorizCmStr = (vaoLivreHoriz * 100).toFixed(1).replace('.', ',');
  const vaoVertCmStr = (vaoLivreVert * 100).toFixed(1).replace('.', ',');

  const isColStaggered = colunasVerticais > 14;

  return (
    <div className="space-y-3.5 font-serif">
      {/* Section Header */}
      <div className="border-b border-slate-700 pb-1 flex items-center justify-between font-serif">
        <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
          <span>6.</span>
          Gabarito Técnico Geral de Montagem e Logística de Transporte
        </h3>
        <span className="text-[11px] font-medium text-slate-700 font-serif">
          Gabarito de Produção (Barras B01 a B{String(totalBarrasOtimizado).padStart(2, '0')})
        </span>
      </div>

      {/* Main Master Technical Blueprint Card */}
      <div className="bg-white border border-slate-300 rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-1.5 font-serif">
          <h4 className="text-xs font-bold text-slate-900 font-serif">
            Figura 5 — Planta Técnica Geral de Montagem com Delimitação Modular de Transporte
          </h4>
          <div className="flex items-center gap-2 text-[11px] font-serif text-slate-700">
            <span className="flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              {winnerDiagram.weldsCount} Nós de Solda
            </span>
            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
              {transportLogistics.totalModulesCount} Módulo(s)
            </span>
          </div>
        </div>

        <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
            {/* Background Grid */}
            <defs>
              <pattern id="master-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f8fafc" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#master-grid)" rx="6" />

            {/* Outer Structural Frame */}
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

            {/* Horizontal Grid Lines */}
            {horizontalElements.map((elem, i) => {
              const y = startY + (i * drawHeight) / numVaosVert;
              const isBorder = i === 0 || i === linhasHorizontais - 1;

              return (
                <g key={`master-h-${i}`}>
                  {/* Left Line Label (L1..L6) */}
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

                  {/* Horizontal Line */}
                  <line
                    x1={startX}
                    y1={y}
                    x2={startX + drawWidth}
                    y2={y}
                    stroke={isBorder ? '#1e40af' : '#2563eb'}
                    strokeWidth={isBorder ? '2.5' : '1.8'}
                  />
                </g>
              );
            })}

            {/* Vertical Columns (C1..Cn) */}
            {verticalElements.map((elem, j) => {
              const x = startX + (j * drawWidth) / numVaosHoriz;
              const isOuter = j === 0 || j === colunasVerticais - 1;
              const isEven = j % 2 === 1;
              const tagY = startY - (isColStaggered && isEven ? 19 : 10);

              return (
                <g key={`master-v-${j}`}>
                  <line
                    x1={x}
                    y1={startY}
                    x2={x}
                    y2={startY + drawHeight}
                    stroke={isOuter ? '#b45309' : '#d97706'}
                    strokeWidth={isOuter ? '2.5' : '1.6'}
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
                    fill={isOuter ? '#78350f' : '#334155'}
                    fontSize="6.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    C{elem.index}
                  </text>
                </g>
              );
            })}

            {/* Red Solder Weld Nodes at all Intersections */}
            {horizontalElements.map((_, i) => {
              const y = startY + (i * drawHeight) / numVaosVert;
              return verticalElements.map((_, j) => {
                const x = startX + (j * drawWidth) / numVaosHoriz;
                return (
                  <circle
                    key={`master-node-${i}-${j}`}
                    cx={x}
                    cy={y}
                    r="2.5"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                );
              });
            })}

            {/* Transport Modular Boundary Lines (Dashed Pink lines if split is needed) */}
            {transportLogistics.modulesHorizontalCount > 1 &&
              Array.from({ length: transportLogistics.modulesHorizontalCount - 1 }).map((_, mIdx) => {
                const splitX = startX + ((mIdx + 1) * drawWidth) / transportLogistics.modulesHorizontalCount;
                return (
                  <g key={`truck-split-h-${mIdx}`}>
                    <line
                      x1={splitX}
                      y1={startY - 14}
                      x2={splitX}
                      y2={startY + drawHeight + 14}
                      stroke="#db2777"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                    <rect
                      x={splitX - 35}
                      y={startY + drawHeight / 2 - 8}
                      width="70"
                      height="16"
                      rx="3"
                      fill="#fdf2f8"
                      stroke="#db2777"
                      strokeWidth="1"
                    />
                    <text
                      x={splitX}
                      y={startY + drawHeight / 2 + 3}
                      fill="#9d174d"
                      fontSize="6.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Junta de Transporte
                    </text>
                  </g>
                );
              })}

            {/* Cotas Técnicas Gerais e Únicas (Sem Repetições Poluídas) */}
            {/* Cota Geral de Largura Total */}
            <line x1={startX} y1={startY - 25} x2={startX + drawWidth} y2={startY - 25} stroke="#0f172a" strokeWidth="1" />
            <line x1={startX} y1={startY - 29} x2={startX} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
            <line x1={startX + drawWidth} y1={startY - 29} x2={startX + drawWidth} y2={startY - 21} stroke="#0f172a" strokeWidth="1" />
            <rect x={startX + drawWidth / 2 - 80} y={startY - 32} width="160" height="13" fill="#ffffff" stroke="#0f172a" strokeWidth="0.7" rx="2" />
            <text x={startX + drawWidth / 2} y={startY - 23} fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle">
              Largura Total: {largura.toFixed(2).replace('.', ',')} m ({numVaosHoriz} vãos = {vaoHorizCmStr} cm)
            </text>

            {/* Cota Geral de Altura Total */}
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

        {/* Technical Blueprint Footer Legend & Transportation Guide */}
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
          <div>
            <span className="font-bold text-slate-900 block mb-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
              Especificações de Montagem em Serralheria:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Colunas verticais com corte real de <strong>{vertCutLength.toFixed(2).replace('.', ',')} m</strong> (desconto de 2× {extFaceMm} mm).</li>
              <li>Linhas horizontais contínuas de <strong>{largura.toFixed(2).replace('.', ',')} m</strong> no plano de fachada.</li>
              <li>Ponteamento estrutural/solda completa em todos os <strong>{weldsCountHorizTopology} nós demarcados em vermelho</strong>.</li>
            </ul>
          </div>
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">Gabarito de Caminhão (4,30 m × 2,00 m):</span>
            <p className="text-slate-600 leading-snug">
              {transportLogistics.jointDetailsText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
