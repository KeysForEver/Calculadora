import React from 'react';
import { MetalonInput } from '../types';

interface TechnicalProjectDrawingProps {
  input: MetalonInput;
}

function parseFaceSizeM(profileStr: string): number {
  if (!profileStr) return 0.03;
  const match = profileStr.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    return parseFloat(match[1]) / 1000 || 0.03;
  }
  return 0.03;
}

export const TechnicalProjectDrawing: React.FC<TechnicalProjectDrawingProps> = ({ input }) => {
  const { largura, altura, perfilExterno, perfilInterno, perfil, vaoMaximo, vaoMaxHoriz, vaoMaxVert } = input;

  const extProfile = perfilExterno || perfil || '30 x 30 mm';
  const intProfile = perfilInterno || perfilExterno || perfil || '30 x 30 mm';

  const extFaceM = parseFaceSizeM(extProfile);
  const intFaceM = parseFaceSizeM(intProfile);

  const extFaceMm = Math.round(extFaceM * 1000);
  const intFaceMm = Math.round(intFaceM * 1000);

  const vaoHorizCm = vaoMaxHoriz || vaoMaximo || 80;
  const vaoVertCm = vaoMaxVert || vaoMaximo || 80;

  const vaoHorizM = vaoHorizCm / 100;
  const vaoVertM = vaoVertCm / 100;

  // Vertical spans (rows down the height)
  const vaosVerticais = Math.ceil(altura / vaoVertM) || 1;
  const linhasHorizontais = vaosVerticais + 1;

  // Horizontal spans (columns across the width)
  const vaosHorizontais = Math.ceil(largura / vaoHorizM) || 1;
  const colunasVerticais = vaosHorizontais + 1;

  // Cut lengths
  const horizCutM = largura;
  const vertCutM = Math.max(0.1, altura - 2 * extFaceM);

  // Clear spans inside deduction
  const vaoLivreHorizCm = (((largura - 2 * extFaceM - Math.max(0, colunasVerticais - 2) * intFaceM) / vaosHorizontais) * 100).toFixed(1);
  const vaoLivreVertCm = (((altura - 2 * extFaceM - Math.max(0, linhasHorizontais - 2) * intFaceM) / vaosVerticais) * 100).toFixed(1);

  // Check if pieces require splices (>6m)
  const needsHorizontalSplice = largura > 6.0;
  const needsVerticalSplice = vertCutM > 6.0;

  // Canvas setup for drawing
  const svgWidth = 540;
  const svgHeight = 175;

  const padLeft = 60;
  const padRight = 30;
  const padTop = 28;
  const padBottom = 22;

  const availWidth = svgWidth - padLeft - padRight;
  const availHeight = svgHeight - padTop - padBottom;

  const aspectRatio = largura / altura;
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
        <rect width={svgWidth} height={svgHeight} fill={`url(#grid-${scenario})`} />

        {/* Outer Frame */}
        <rect
          x={startX}
          y={startY}
          width={drawWidth}
          height={drawHeight}
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth="3"
          rx="2"
        />

        {/* Horizontal Lines */}
        {Array.from({ length: linhasHorizontais }).map((_, i) => {
          const y = startY + (i * drawHeight) / (linhasHorizontais - 1 || 1);
          return (
            <g key={`h-line-${scenario}-${i}`}>
              <line
                x1={startX}
                y1={y}
                x2={startX + drawWidth}
                y2={y}
                stroke="#2563eb"
                strokeWidth="2"
              />
              {/* If scenario 3 and line length > 6m, draw splice marker */}
              {scenario === 3 && needsHorizontalSplice && (
                <g>
                  <circle cx={startX + (6.0 / largura) * drawWidth} cy={y} r="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <line
                    x1={startX + (6.0 / largura) * drawWidth}
                    y1={y - 6}
                    x2={startX + (6.0 / largura) * drawWidth}
                    y2={y + 6}
                    stroke="#dc2626"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Vertical Columns */}
        {Array.from({ length: colunasVerticais }).map((_, i) => {
          const x = startX + (i * drawWidth) / (colunasVerticais - 1 || 1);
          return (
            <g key={`v-col-${scenario}-${i}`}>
              <line
                x1={x}
                y1={startY}
                x2={x}
                y2={startY + drawHeight}
                stroke="#d97706"
                strokeWidth="2"
              />
              {/* If scenario 3 and column length > 6m, draw splice marker */}
              {scenario === 3 && needsVerticalSplice && (
                <g>
                  <circle cx={x} cy={startY + (6.0 / vertCutM) * drawHeight} r="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <line
                    x1={x - 6}
                    y1={startY + (6.0 / vertCutM) * drawHeight}
                    x2={x + 6}
                    y2={startY + (6.0 / vertCutM) * drawHeight}
                    stroke="#dc2626"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Splice Indicators for Scenario 3 when remnants are spliced */}
        {scenario === 3 && !needsHorizontalSplice && (
          <g>
            {linhasHorizontais > 2 && (
              <g>
                <circle cx={startX + drawWidth * 0.65} cy={startY + drawHeight / (linhasHorizontais - 1)} r="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
                <text x={startX + drawWidth * 0.65} y={startY + drawHeight / (linhasHorizontais - 1) - 6} fill="#dc2626" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Solda/Emenda
                </text>
              </g>
            )}
          </g>
        )}

        {/* Top Cota Line - Width */}
        <line x1={startX} y1={startY - 12} x2={startX + drawWidth} y2={startY - 12} stroke="#475569" strokeWidth="1.2" />
        <line x1={startX} y1={startY - 16} x2={startX} y2={startY - 8} stroke="#475569" strokeWidth="1" />
        <line x1={startX + drawWidth} y1={startY - 16} x2={startX + drawWidth} y2={startY - 8} stroke="#475569" strokeWidth="1" />
        <text
          x={startX + drawWidth / 2}
          y={startY - 15}
          fill="#0f172a"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
        >
          Largura Total: {largura.toFixed(2)} m
        </text>

        {/* Left Cota Line - Height */}
        <line x1={startX - 16} y1={startY} x2={startX - 16} y2={startY + drawHeight} stroke="#475569" strokeWidth="1.2" />
        <line x1={startX - 20} y1={startY} x2={startX - 12} y2={startY} stroke="#475569" strokeWidth="1" />
        <line x1={startX - 20} y1={startY + drawHeight} x2={startX - 12} y2={startY + drawHeight} stroke="#475569" strokeWidth="1" />
        <text
          x={startX - 20}
          y={startY + drawHeight / 2}
          fill="#0f172a"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          transform={`rotate(-90, ${startX - 20}, ${startY + drawHeight / 2})`}
        >
          Altura: {altura.toFixed(2)} m
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-4">
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
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
          <p className="text-[11px] text-slate-600 mb-2 leading-tight">
            • <strong>Gabarito de Montagem:</strong> Cada elemento da estrutura é cortado de uma barra nova de 6m exclusiva. Nenhuma sobra é compartilhada com outras peças. Peças 100% inteiras sem emendas.
          </p>
          <div className="flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
            {renderBlueprintSVG(1)}
          </div>
        </div>

        {/* Scenario 2 Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
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
          <p className="text-[11px] text-slate-600 mb-2 leading-tight">
            • <strong>Gabarito de Montagem:</strong> As peças são mantidas 100% inteiras (<strong>sem nenhuma solda ou emenda no meio da barra</strong>), porém sobras de uma barra de 6m são utilizadas para cortar outras peças inteiras menores do projeto.
          </p>
          <div className="flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
            {renderBlueprintSVG(2)}
          </div>
        </div>

        {/* Scenario 3 Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Cenário 3: Com Emenda e Otimização Total (Reaproveitamento Máximo)
              </h4>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Com Emenda / Solda
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 leading-tight">
            • <strong>Gabarito de Montagem:</strong> Permite soldas/emendas de retalhos para montar trechos de barras ou cobrir metragens fracionadas, gerando o <strong>menor consumo de barras de 6m</strong>. Os marcadores em vermelho representam os pontos de emenda.
          </p>
          <div className="flex justify-center items-center bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
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
            <strong className="text-slate-900">{horizCutM.toFixed(2)} m</strong> ({linhasHorizontais}x)
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Corte Verticais (-{2 * extFaceMm}mm):</span>
            <strong className="text-slate-900">{vertCutM.toFixed(3)} m</strong> ({colunasVerticais}x)
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Vão Livre Horizontal:</span>
            <strong className="text-slate-900">~{vaoLivreHorizCm} cm</strong>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-slate-500 block">Vão Livre Vertical:</span>
            <strong className="text-slate-900">~{vaoLivreVertCm} cm</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
