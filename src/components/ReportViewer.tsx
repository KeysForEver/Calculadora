import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MetalonInput } from '../types';
import { StructureVisualizer } from './StructureVisualizer';
import { TechnicalProjectDrawing } from './TechnicalProjectDrawing';
import { ProductionCutTable } from './ProductionCutTable';
import { calculateMetalonStructure } from '../utils/calculator';

interface ReportViewerProps {
  markdown: string;
  input: MetalonInput;
  dateStr: string;
  source?: 'gemini' | 'calculator';
  reportRef: React.RefObject<HTMLDivElement | null>;
}

export const ReportHeader: React.FC<{ dateStr?: string; source?: 'gemini' | 'calculator' }> = ({ dateStr }) => (
  <div className="border-b-2 border-slate-900 pb-2.5 mb-5 flex items-end justify-between w-full">
    <div className="flex items-baseline gap-3">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins tracking-tight">
        SKYMÍDIA
      </h1>
    </div>
    {dateStr && (
      <div className="text-right flex flex-col items-end">
        <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
          {dateStr}
        </span>
      </div>
    )}
  </div>
);

export const ReportFooter: React.FC<{ pageNum?: number; totalPages?: number }> = ({ pageNum, totalPages }) => (
  <div className="mt-auto pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between w-full">
    <div className="flex items-center gap-4">
      <a
        href="https://skymidiabh.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#707579] hover:text-slate-900 hover:underline font-medium text-[11px]"
      >
        https://skymidiabh.com.br/
      </a>
      <span className="text-slate-300">•</span>
      <a
        href="https://www.instagram.com/skymidiabh/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#707579] hover:text-slate-900 hover:underline font-medium text-[11px]"
      >
        https://www.instagram.com/skymidiabh/
      </a>
    </div>
    {pageNum && totalPages && (
      <span className="text-[11px] font-semibold text-slate-500">
        Página {pageNum} de {totalPages}
      </span>
    )}
  </div>
);

export const ReportViewer: React.FC<ReportViewerProps> = ({
  markdown,
  input,
  dateStr,
  source,
  reportRef,
}) => {
  // Calculate total pages dynamically across all document sections
  const calcResult = React.useMemo(() => {
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

  const totalTableChunks = Math.ceil(calcResult.allocatedBarsDetailed.length / 12) || 1;

  // Clean markdown and split into Page 1 (Sections 1 & 2) and Page 2 (Sections 3 & 4)
  const [markdownPart1, markdownPart2] = React.useMemo(() => {
    const cleaned = markdown
      .replace(/---\s*\n*\s*Data:.*$/si, '')
      .replace(/\n\s*Data:.*$/si, '')
      .trim();

    // Look for Section 3 heading (e.g. ## 3. Plano de Corte Otimizado)
    const regexSection3 = /(?:^|\n)(?=##\s*3[\.\s])/i;
    const matchIndex = cleaned.search(regexSection3);

    if (matchIndex > 0) {
      const part1 = cleaned.slice(0, matchIndex).trim().replace(/---\s*$/, '').trim();
      let part2 = cleaned.slice(matchIndex).trim();
      // Ensure part2 doesn't contain duplicated Sections 5, 6 or 7 since they are rendered as dedicated components on subsequent pages
      part2 = part2.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
      return [part1, part2];
    }

    const sanitizedCleaned = cleaned.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
    return [sanitizedCleaned, ''];
  }, [markdown]);

  const hasPage2 = Boolean(markdownPart2);
  const basePagesCount = hasPage2 ? 4 : 3;
  const totalPages = basePagesCount + totalTableChunks;

  return (
    <div
      ref={reportRef}
      id="printable-report"
      className="report-card bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto my-4 transition-all"
    >
      {/* Page 1: Header + Technical Considerations + Sections 1 & 2 + Footer */}
      <div className="pdf-page bg-white flex flex-col justify-between min-h-[960px] sm:min-h-[1000px]">
        <div className="flex-1 flex flex-col justify-start">
          <ReportHeader dateStr={dateStr} source={source} />
          <div className="report-content prose prose-slate max-w-none my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {markdownPart1}
            </ReactMarkdown>
          </div>
        </div>
        <ReportFooter pageNum={1} totalPages={totalPages} />
      </div>

      {/* Page 2: Header + Sections 3 & 4 (Plano de Corte & Comparativo) + Footer */}
      {hasPage2 ? (
        <div
          className="pdf-page bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
          style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
        >
          <div className="flex-1 flex flex-col justify-start">
            <ReportHeader dateStr={dateStr} source={source} />
            <div className="report-content prose prose-slate max-w-none my-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {markdownPart2}
              </ReactMarkdown>
            </div>
          </div>
          <ReportFooter pageNum={2} totalPages={totalPages} />
        </div>
      ) : null}

      {/* Page 3: Header + Section 5 (Esquemas Estruturais Individuais) + Footer */}
      <div
        className="pdf-page bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
        style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
      >
        <div className="flex-1 flex flex-col justify-start">
          <ReportHeader dateStr={dateStr} source={source} />
          <div className="my-1">
            <StructureVisualizer input={input} />
          </div>
        </div>
        <ReportFooter pageNum={hasPage2 ? 3 : 2} totalPages={totalPages} />
      </div>

      {/* Page 4: Header + Section 6 (Desenho Técnico do Projeto com Cotas e Gabarito de Montagem) + Footer */}
      <div
        className="pdf-page bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
        style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
      >
        <div className="flex-1 flex flex-col justify-start">
          <ReportHeader dateStr={dateStr} source={source} />
          <div className="my-1">
            <TechnicalProjectDrawing input={input} />
          </div>
        </div>
        <ReportFooter pageNum={hasPage2 ? 4 : 3} totalPages={totalPages} />
      </div>

      {/* Page 5+: Section 7 (Tabela de Corte de Barras para a Produção) - Auto-paginated */}
      <ProductionCutTable
        input={input}
        dateStr={dateStr}
        source={source}
        startPageNum={hasPage2 ? 5 : 4}
        totalPages={totalPages}
      />
    </div>
  );
};
