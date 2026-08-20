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
  } = calc;

  const extFaceMm = Math.round(profileExt.faceSizeM * 1000);

  // High-precision Blueprint dimensions
  const svgWidth = 720;
  const svgHeight = 240;

  const padLeft = 75;
  const padRight = 55;
  const padTop = 36;
  const padBottom = 30;

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
          <span className="text-[11px] font-serif text-slate-700">
            {weldsCountHorizTopology} Nós Estruturais • {transportLogistics.totalModulesCount} Módulo(s)
          </span>
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

                  {/* Horizontal Line */}
                  <line
                    x1={startX}
                    y1={y}
                    x2={startX + drawWidth}
                    y2={y}
                    stroke="#2563eb"
                    strokeWidth={isBorder ? '2.5' : '1.8'}
                  />
                </g>
              );
            })}

            {/* Vertical Columns */}
            {verticalElements.map((elem, j) => {
              const x = startX + (j * drawWidth) / numVaosHoriz;
              const isOuter = j === 0 || j === colunasVerticais - 1;

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

                  {/* Top Column Tag */}
                  <text
                    x={x}
                    y={startY - 6}
                    fill="#92400e"
                    fontSize="7"
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

            {/* Transport Modular Boundary Lines (Dashed Pink/Purple lines if split is needed) */}
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

            {/* Cotas Técnicas Gerais */}
            {/* Cota Geral de Largura Total */}
            <line x1={startX} y1={startY - 22} x2={startX + drawWidth} y2={startY - 22} stroke="#0f172a" strokeWidth="1" />
            <line x1={startX} y1={startY - 27} x2={startX} y2={startY - 17} stroke="#0f172a" strokeWidth="1" />
            <line x1={startX + drawWidth} y1={startY - 27} x2={startX + drawWidth} y2={startY - 17} stroke="#0f172a" strokeWidth="1" />
            <rect x={startX + drawWidth / 2 - 45} y={startY - 29} width="90" height="13" fill="#ffffff" rx="2" />
            <text x={startX + drawWidth / 2} y={startY - 20} fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">
              Largura Total: {largura.toFixed(2).replace('.', ',')} m
            </text>

            {/* Cota Geral de Altura Total */}
            <line x1={startX + drawWidth + 22} y1={startY} x2={startX + drawWidth + 22} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
            <line x1={startX + drawWidth + 17} y1={startY} x2={startX + drawWidth + 27} y2={startY} stroke="#0f172a" strokeWidth="1" />
            <line x1={startX + drawWidth + 17} y1={startY + drawHeight} x2={startX + drawWidth + 27} y2={startY + drawHeight} stroke="#0f172a" strokeWidth="1" />
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
              Altura Total: {altura.toFixed(2).replace('.', ',')} m
            </text>
          </svg>
        </div>

        {/* Technical Blueprint Footer Legend & Transportation Guide */}
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">Especificações de Montagem em Serralheria:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Colunas verticais com corte real de <strong>{vertCutLength.toFixed(2).replace('.', ',')} m</strong> (desconto de 2× {extFaceMm} mm).</li>
              <li>Linhas horizontais contínuas de <strong>{largura.toFixed(2).replace('.', ',')} m</strong> no plano de fachada.</li>
              <li>Cordão de solda contínuo ou ponteamento estrutural em todos os <strong>{weldsCountHorizTopology} nós</strong>.</li>
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
