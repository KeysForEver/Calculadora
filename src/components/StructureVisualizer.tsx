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

  // Canvas / SVG view dimensions
  const padding = 40;
  const svgWidth = 400;
  const svgHeight = 260;

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
    <div className="bg-slate-50 text-slate-800 rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#707579]"></span>
          Visualização da Estrutura Metálica
        </h4>
        <span className="text-xs font-mono bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300">
          Perfil: {perfil}
        </span>
      </div>

      <div className="relative flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
        <svg width={svgWidth} height={svgHeight} className="max-w-full h-auto">
          {/* Main Frame Background */}
          <rect
            x={startX}
            y={startY}
            width={drawWidth}
            height={drawHeight}
            fill="#f8fafc"
            stroke="#707579"
            strokeWidth="3"
            rx="2"
          />

          {/* Horizontal Lines */}
          {Array.from({ length: linhasHorizontais }).map((_, i) => {
            const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
            return (
              <line
                key={`h-${i}`}
                x1={startX}
                y1={y}
                x2={startX + drawWidth}
                y2={y}
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray={i > 0 && i < linhasHorizontais - 1 ? "4 2" : undefined}
              />
            );
          })}

          {/* Vertical Columns */}
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
                strokeWidth="2"
                strokeDasharray={i > 0 && i < colunasVerticais - 1 ? "4 2" : undefined}
              />
            );
          })}

          {/* Dimension Labels */}
          {/* Width Label Top */}
          <text
            x={startX + drawWidth / 2}
            y={Math.max(16, startY - 8)}
            fill="#475569"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            Largura: {largura.toFixed(2)} m ({vaosHorizontais} vãos de ~{espacamentoHorizCm} cm)
          </text>

          {/* Height Label Right */}
          <text
            x={startX + drawWidth + 12}
            y={startY + drawHeight / 2}
            fill="#475569"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(90, ${startX + drawWidth + 12}, ${startY + drawHeight / 2})`}
          >
            Altura: {altura.toFixed(2)} m ({vaosVerticais} vãos de ~{espacamentoVertCm} cm)
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-slate-600">
        <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500">Linhas Horizontais</span>
          <span className="font-mono font-bold text-slate-800 text-sm">{linhasHorizontais} linhas</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500">Colunas Verticais</span>
          <span className="font-mono font-bold text-amber-600 text-sm">{colunasVerticais} colunas</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500">Vãos Verticais</span>
          <span className="font-mono font-bold text-slate-800 text-sm">{vaosVerticais} vãos</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500">Vãos Horizontais</span>
          <span className="font-mono font-bold text-slate-800 text-sm">{vaosHorizontais} vãos</span>
        </div>
      </div>
    </div>
  );
};
