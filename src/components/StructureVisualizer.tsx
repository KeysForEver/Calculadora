import React from 'react';
import { MetalonInput } from '../types';

interface VisualizerProps {
  input: MetalonInput;
}

export const StructureVisualizer: React.FC<VisualizerProps> = ({ input }) => {
  const { largura, altura, perfil } = input;

  const vaosVerticais = Math.ceil(altura / 0.80);
  const linhasHorizontais = vaosVerticais + 1;

  const vaosHorizontais = Math.ceil(largura / 0.80);
  const colunasVerticais = vaosHorizontais + 1;

  // Calculate actual spacing in cm
  const espacamentoHorizCm = ((largura / vaosHorizontais) * 100).toFixed(1);
  const espacamentoVertCm = ((altura / vaosVerticais) * 100).toFixed(1);

  // SVG dimensions for each diagram
  const padding = 36;
  const svgWidth = 520;
  const svgHeight = 220;

  const availWidth = svgWidth - padding * 2;
  const availHeight = svgHeight - padding * 2;

  const aspectRatio = largura / altura;
  let drawWidth = availWidth;
  let drawHeight = drawWidth / aspectRatio;

  if (drawHeight > availHeight) {
    drawHeight = availHeight;
    drawWidth = drawHeight * aspectRatio;
  }

  const startX = (svgWidth - drawWidth) / 2;
  const startY = (svgHeight - drawHeight) / 2;

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="text-[#707579]">4.</span>
          Visualização da Estrutura Metálica
        </h3>
      </div>

      <div className="flex flex-col gap-6">
        {/* 4.1 Desenho da Estrutura Horizontal */}
        <div className="bg-slate-50 text-slate-800 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                4.1 Estrutura Horizontal
              </h4>
              <span className="text-[11px] font-medium text-slate-500">
                {linhasHorizontais} linhas
              </span>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                {/* Outer Frame Bounding Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  rx="2"
                />

                {/* Horizontal Lines Only */}
                {Array.from({ length: linhasHorizontais }).map((_, i) => {
                  const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
                  return (
                    <line
                      key={`h-${i}`}
                      x1={startX}
                      y1={y}
                      x2={startX + drawWidth}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="2.5"
                    />
                  );
                })}

                {/* Dimension Label Top */}
                <text
                  x={startX + drawWidth / 2}
                  y={Math.max(14, startY - 8)}
                  fill="#475569"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Largura: {largura.toFixed(2)} m
                </text>

                {/* Dimension Label Right */}
                <text
                  x={startX + drawWidth + 12}
                  y={startY + drawHeight / 2}
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 12}, ${startY + drawHeight / 2})`}
                >
                  Altura: {altura.toFixed(2)} m
                </text>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-600">
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Linhas</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{linhasHorizontais}</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Vãos Vert.</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{vaosVerticais}</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Espaçamento</span>
              <span className="font-mono font-bold text-slate-800 text-sm">~{espacamentoVertCm} cm</span>
            </div>
          </div>
        </div>

        {/* 4.2 Desenho da Estrutura Vertical */}
        <div className="bg-slate-50 text-slate-800 rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                4.2 Estrutura Vertical
              </h4>
              <span className="text-[11px] font-medium text-amber-700">
                {colunasVerticais} colunas
              </span>
            </div>

            <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
              <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
                {/* Outer Frame Bounding Box */}
                <rect
                  x={startX}
                  y={startY}
                  width={drawWidth}
                  height={drawHeight}
                  fill="#f8fafc"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  rx="2"
                />

                {/* Vertical Columns Only */}
                {Array.from({ length: colunasVerticais }).map((_, i) => {
                  const x = startX + (i * drawWidth) / (colunasVerticais - 1 || 1);
                  return (
                    <line
                      key={`v-${i}`}
                      x1={x}
                      y1={startY}
                      x2={x}
                      y2={startY + drawHeight}
                      stroke="#d97706"
                      strokeWidth="2.5"
                    />
                  );
                })}

                {/* Dimension Label Top */}
                <text
                  x={startX + drawWidth / 2}
                  y={Math.max(14, startY - 8)}
                  fill="#475569"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Largura: {largura.toFixed(2)} m
                </text>

                {/* Dimension Label Right */}
                <text
                  x={startX + drawWidth + 12}
                  y={startY + drawHeight / 2}
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(90, ${startX + drawWidth + 12}, ${startY + drawHeight / 2})`}
                >
                  Altura: {altura.toFixed(2)} m
                </text>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-600">
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Colunas</span>
              <span className="font-mono font-bold text-amber-600 text-sm">{colunasVerticais}</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Vãos Horiz.</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{vaosHorizontais}</span>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Espaçamento</span>
              <span className="font-mono font-bold text-slate-800 text-sm">~{espacamentoHorizCm} cm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

