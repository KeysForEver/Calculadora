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
  <div className="mt-auto pt-3 border-t border-slate-200 text-xs text-slate-600 relative flex items-center justify-center w-full min-h-[32px]">
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-center px-4">
      <a
        href="https://skymidiabh.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#707579] hover:text-slate-900 hover:underline font-medium text-[11px]"
      >
        https://skymidiabh.com.br/
      </a>
      <span className="text-slate-300 hidden sm:inline">•</span>
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
      <span className="absolute right-0 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
        Página {pageNum} de {totalPages}
      </span>
    )}
  </div>
);

/**
 * Parses markdown dynamically into sequential, beautifully proportioned A4 pages
 * without restricting text or truncating content.
 */
function splitMarkdownIntoPages(markdown: string): string[] {
  // 1. Clean markdown from trailing metadata
  const cleaned = markdown
    .replace(/---\s*\n*\s*Data:.*$/si, '')
    .replace(/\n\s*Data:.*$/si, '')
    .trim();

  // 2. Strip sections 5, 6, 7 if present in text, as they are rendered via interactive components
  const textWithout567 = cleaned.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();

  // 3. Search for Section 3 heading (## 3. Plano de Corte Otimizado)
  const regexSection3 = /(?:^|\n)(?=##\s*3[\.\s])/i;
  const matchIndex = textWithout567.search(regexSection3);

  if (matchIndex > 0) {
    const part1 = textWithout567.slice(0, matchIndex).trim().replace(/---\s*$/, '').trim();
    const part2 = textWithout567.slice(matchIndex).trim();

    // If either part is still excessively long, split further to guarantee perfect readability
    const pages: string[] = [part1];

    if (part2.length > 2800) {
      const splitSec4 = part2.search(/(?:^|\n)(?=##\s*4[\.\s])/i);
      if (splitSec4 > 0) {
        pages.push(part2.slice(0, splitSec4).trim());
        pages.push(part2.slice(splitSec4).trim());
      } else {
        pages.push(part2);
      }
    } else {
      pages.push(part2);
    }

    return pages;
  }

  // 4. Flexible fallback based on section headers or length
  const sections = textWithout567.split(/(?=\n##\s+)/g).map(s => s.trim()).filter(Boolean);
  if (sections.length > 1) {
    const mid = Math.ceil(sections.length / 2);
    return [
      sections.slice(0, mid).join('\n\n---\n\n'),
      sections.slice(mid).join('\n\n---\n\n')
    ];
  }

  return [textWithout567];
}

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
  const markdownPages = React.useMemo(() => splitMarkdownIntoPages(markdown), [markdown]);

  const markdownPagesCount = markdownPages.length;
  const section5PageNumber = markdownPagesCount + 1;
  const section6PageNumber = markdownPagesCount + 2;
  const tableStartPageNumber = markdownPagesCount + 3;
  const totalPages = markdownPagesCount + 2 + totalTableChunks;

  return (
    <div
      ref={reportRef}
      id="printable-report"
      className="report-card bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto my-4 transition-all"
    >
      {/* Markdown Sequential Text Pages (Technical Considerations, Sections 1, 2, 3, 4) */}
      {markdownPages.map((pageMarkdown, pIdx) => {
        const pageNumber = pIdx + 1;
        const isFirst = pIdx === 0;

        return (
          <div
            key={`md-page-${pIdx}`}
            className={`pdf-page bg-white flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] ${
              !isFirst ? 'pt-6 mt-10 border-t border-slate-200 break-before-page page-break-before-always' : ''
            }`}
            style={!isFirst ? { pageBreakBefore: 'always', breakBefore: 'page' } : undefined}
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
                  {pageMarkdown}
                </ReactMarkdown>
              </div>
            </div>
            <ReportFooter pageNum={pageNumber} totalPages={totalPages} />
          </div>
        );
      })}

      {/* Section 5: Esquemas Estruturais Individuais com Numeração de Barras */}
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
        <ReportFooter pageNum={section5PageNumber} totalPages={totalPages} />
      </div>

      {/* Section 6: Gabarito Técnico de Montagem e Solda da Estrutura */}
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
        <ReportFooter pageNum={section6PageNumber} totalPages={totalPages} />
      </div>

      {/* Section 7: Tabela de Corte de Barras para a Produção (Auto-paginada em blocos limpos) */}
      <ProductionCutTable
        input={input}
        dateStr={dateStr}
        source={source}
        startPageNum={tableStartPageNumber}
        totalPages={totalPages}
      />
    </div>
  );
};
