import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MetalonInput } from '../types';
import { StructureVisualizer } from './StructureVisualizer';
import { TechnicalProjectDrawing } from './TechnicalProjectDrawing';
import { ProductionCutTable } from './ProductionCutTable';
import { calculateMetalonStructure, TABLE_ROWS_PER_PAGE } from '../utils/calculator';

interface ReportViewerProps {
  markdown: string;
  input: MetalonInput;
  dateStr: string;
  source?: 'gemini' | 'calculator';
  reportRef: React.RefObject<HTMLDivElement | null>;
}

export const ReportHeader: React.FC<{ dateStr?: string; source?: 'gemini' | 'calculator' }> = ({ dateStr }) => (
  <div className="border-b border-slate-700 pb-2 mb-4 flex items-end justify-between w-full font-serif">
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          SKYMÍDIA
        </h1>
      </div>
    </div>
    {dateStr && (
      <div className="text-right flex flex-col items-end">
        <span className="text-xs font-medium text-slate-700 font-serif block">
          {dateStr}
        </span>
      </div>
    )}
  </div>
);

export const ReportFooter: React.FC<{ pageNum?: number; totalPages?: number }> = ({ pageNum, totalPages }) => (
  <div className="mt-auto pt-2 border-t border-slate-700 text-xs text-slate-700 font-serif relative flex items-center justify-center w-full min-h-[28px]">
    <div className="flex flex-wrap items-center justify-center gap-3 text-center px-4">
      <a
        href="https://skymidiabh.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-700 hover:text-slate-900 hover:underline font-serif text-[11px]"
      >
        https://skymidiabh.com.br/
      </a>
      <span className="text-slate-400 hidden sm:inline">•</span>
      <a
        href="https://www.instagram.com/skymidiabh/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-700 hover:text-slate-900 hover:underline font-serif text-[11px]"
      >
        https://www.instagram.com/skymidiabh/
      </a>
    </div>
    {pageNum && totalPages && (
      <span className="absolute right-0 text-[11px] font-semibold text-slate-800 font-serif whitespace-nowrap">
        Página {pageNum} de {totalPages}
      </span>
    )}
  </div>
);

/**
 * Parses markdown dynamically into sequential, beautifully proportioned A4 pages
 * without restricting text or truncating content.
 */
function splitMarkdownIntoPages(markdown: string, calcResult: ReturnType<typeof calculateMetalonStructure>): string[] {
  // 1. Clean markdown from trailing metadata
  let cleaned = markdown
    .replace(/---\s*\n*\s*Data:.*$/si, '')
    .replace(/\n\s*Data:.*$/si, '')
    .trim();

  // 2. Remove "Considerações Técnicas do Perfil" heading if present
  cleaned = cleaned
    .replace(/(?:^|\n)#*\s*Considera[çc][õo]es\s+T[ée]cnicas[^\n]*(?:\n[\s\S]*?)?(?=\n#*\s*1[\.\s])/si, '')
    .trim();

  // 3. Strip sections 5, 6, 7 if present in text, as they are rendered via dedicated visual components
  let textWithout567 = cleaned.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();

  // 4. Enforce Section 4 with only the 4-Diagram Summary Table
  const canonicalSection4Table = `| Diagrama / Modelo Construtivo | Topologia Estrutural | Barras (6,00m) | Metragem Linear | Aproveitamento | Pontos de Solda | Classificação |
| :---------------------------- | :------------------: | :------------: | :-------------: | :------------: | :-------------: | :-----------: |
${calcResult.diagrams.map(d => `| **${d.shortTitle}** | ${d.topologyName} | **${d.totalBars} barras** | ${d.totalMetragemLinear.toLocaleString('pt-BR')} m | ${d.aproveitamentoPct.toLocaleString('pt-BR')}% | **${d.weldsCount} soldas** | ${d.isWinner ? '**★ MODELO VITORIOSO**' : 'Alternativa'} |`).join('\n')}`;

  if (textWithout567.search(/(?:^|\n)##\s*4[\.\s]/i) >= 0) {
    textWithout567 = textWithout567.replace(
      /(?:^|\n)(##\s*4[\.\s][^\n]*\n+)[\s\S]*$/i,
      `\n\n## 4. Comparativo dos 4 Diagramas\n\n${canonicalSection4Table}`
    ).trim();
  }

  // 5. Search for Section 3 heading
  const regexSection3 = /(?:^|\n)(?=##\s*3[\.\s])/i;
  const matchIndex = textWithout567.search(regexSection3);

  if (matchIndex > 0) {
    const part1 = textWithout567.slice(0, matchIndex).trim().replace(/---\s*$/, '').trim();
    const part2 = textWithout567.slice(matchIndex).trim();

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

  const totalTableChunks = Math.ceil(calcResult.allocatedBarsDetailed.length / TABLE_ROWS_PER_PAGE) || 1;
  const markdownPages = React.useMemo(() => splitMarkdownIntoPages(markdown, calcResult), [markdown, calcResult]);

  const markdownPagesCount = markdownPages.length;
  const section5Part1PageNumber = markdownPagesCount + 1;
  const section5Part2PageNumber = markdownPagesCount + 2;
  const section6PageNumber = markdownPagesCount + 3;
  const tableStartPageNumber = markdownPagesCount + 4;
  const totalPages = markdownPagesCount + 3 + totalTableChunks;

  return (
    <div
      ref={reportRef}
      id="printable-report"
      className="report-card latex-document font-serif bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto my-4 transition-all"
    >
      {/* Markdown Sequential Text Pages (Sections 1, 2, 3, 4) */}
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
                      <a {...props} target="_blank" rel="noopener noreferrer" className="text-slate-900 underline font-medium" />
                    ),
                    h2: ({ node, children, ...props }) => (
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 font-serif pb-1.5 mb-2 mt-4 border-b border-slate-700 flex items-center gap-2 tracking-tight" {...props}>
                        {children}
                      </h2>
                    ),
                    h3: ({ node, children, ...props }) => (
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-serif mt-3 mb-1.5 flex items-center gap-1.5" {...props}>
                        <span className="w-1.5 h-3 bg-slate-700 rounded-xs inline-block mr-0.5"></span>
                        {children}
                      </h3>
                    ),
                    h4: ({ node, children, ...props }) => (
                      <h4 className="text-xs font-bold text-slate-800 font-serif mt-2 mb-1" {...props}>
                        {children}
                      </h4>
                    ),
                    ul: ({ node, children, ...props }) => (
                      <ul className="my-2 space-y-1.5 pl-0.5 list-none font-serif text-slate-800" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ node, children, ...props }) => (
                      <ol className="my-2 space-y-1.5 pl-4 list-decimal font-serif text-slate-800 text-xs sm:text-[13px]" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ node, children, ...props }) => (
                      <li className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed py-0.5" {...props}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0"></span>
                        <div className="flex-1">{children}</div>
                      </li>
                    ),
                    table: ({ node, children, ...props }) => (
                      <div className="my-3 overflow-x-auto rounded-lg border border-slate-300 shadow-xs">
                        <table className="w-full text-xs text-left border-collapse font-serif" {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ node, children, ...props }) => (
                      <thead className="bg-slate-100/90 text-slate-900 border-b border-slate-300 uppercase tracking-wider text-[10.5px] font-bold" {...props}>
                        {children}
                      </thead>
                    ),
                    th: ({ node, children, ...props }) => (
                      <th className="py-2.5 px-3 border-r border-slate-200 last:border-r-0 text-center font-bold text-slate-900" {...props}>
                        {children}
                      </th>
                    ),
                    tr: ({ node, children, ...props }) => (
                      <tr className="hover:bg-slate-50/60 transition-colors" {...props}>
                        {children}
                      </tr>
                    ),
                    td: ({ node, children, ...props }) => {
                      const textContent = typeof children === 'string' 
                        ? children 
                        : Array.isArray(children) 
                          ? children.map(c => (typeof c === 'string' ? c : '')).join('') 
                          : '';
                      const isWinnerRow = textContent.includes('★') || textContent.includes('VITORIOSO');
                      return (
                        <td
                          className={`py-2 px-3 border-b border-r border-slate-200 last:border-r-0 text-center ${
                            isWinnerRow ? 'bg-emerald-50/80 font-bold text-emerald-950 border-l-2 border-l-emerald-600' : 'text-slate-800'
                          }`}
                          {...props}
                        >
                          {children}
                        </td>
                      );
                    },
                    blockquote: ({ node, children, ...props }) => (
                      <blockquote className="border-l-4 border-slate-700 bg-slate-50 p-2.5 my-2.5 rounded-r text-xs sm:text-[13px] text-slate-700 italic font-serif" {...props}>
                        {children}
                      </blockquote>
                    ),
                    p: ({ node, children, ...props }) => (
                      <p className="text-xs sm:text-[13.5px] leading-relaxed text-slate-800 my-1 font-serif" {...props}>
                        {children}
                      </p>
                    ),
                    strong: ({ node, children, ...props }) => (
                      <strong className="font-bold text-slate-950 font-serif" {...props}>
                        {children}
                      </strong>
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="my-3 border-t border-slate-300" {...props} />
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

      {/* Section 5.1: Esquemas Estruturais Detalhados (Diagramas 1 e 2) */}
      <div
        className="pdf-page bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
        style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
      >
        <div className="flex-1 flex flex-col justify-start">
          <ReportHeader dateStr={dateStr} source={source} />
          <div className="my-1">
            <StructureVisualizer input={input} part="part1" />
          </div>
        </div>
        <ReportFooter pageNum={section5Part1PageNumber} totalPages={totalPages} />
      </div>

      {/* Section 5.2: Esquemas Estruturais Detalhados (Diagramas 3 e 4) */}
      <div
        className="pdf-page bg-white pt-6 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
        style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
      >
        <div className="flex-1 flex flex-col justify-start">
          <ReportHeader dateStr={dateStr} source={source} />
          <div className="my-1">
            <StructureVisualizer input={input} part="part2" />
          </div>
        </div>
        <ReportFooter pageNum={section5Part2PageNumber} totalPages={totalPages} />
      </div>

      {/* Section 6: Gabarito Técnico Geral de Montagem e Logística de Transporte */}
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

      {/* Section 7: Tabela de Corte de Barras para a Produção */}
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
