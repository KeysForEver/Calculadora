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
        <span className="text-[11px] uppercase tracking-wider text-slate-600 font-serif hidden sm:inline">
          — Projetos e Estruturas Metálicas
        </span>
      </div>
      <span className="text-[10px] text-slate-500 font-serif tracking-normal">
        Memorial Descritivo e Plano de Produção
      </span>
    </div>
    {dateStr && (
      <div className="text-right flex flex-col items-end">
        <span className="text-xs font-medium text-slate-700 font-serif block">
          {dateStr}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-serif">
          Norma ABNT / NBR
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
 * without restricting text or truncating content, ensuring Table 4 matches Table 7.
 */
function splitMarkdownIntoPages(markdown: string, calcResult: ReturnType<typeof calculateMetalonStructure>): string[] {
  // 1. Clean markdown from trailing metadata
  let cleaned = markdown
    .replace(/---\s*\n*\s*Data:.*$/si, '')
    .replace(/\n\s*Data:.*$/si, '')
    .trim();

  // 2. Remove "Considerações Técnicas do Perfil" heading and introductory paragraph
  cleaned = cleaned
    .replace(/(?:^|\n)#*\s*Considera[çc][õo]es\s+T[ée]cnicas[^\n]*(?:\n[\s\S]*?)?(?=\n#*\s*1[\.\s])/si, '')
    .trim();

  // 3. Strip sections 5, 6, 7 if present in text, as they are rendered via dedicated visual components
  let textWithout567 = cleaned.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();

  // 4. Enforce canonical Table 4 exactly matching Table 7
  const canonicalSection4Table = calcResult.isSameProfile
    ? `| Cenário / Método de Corte | Pontos de Solda / Emendas | Total de Barras (6m) |
| :------------------------ | :-----------------------: | :------------------: |
| **Cenário 1: "Sem Emenda e Sem Otimização"** | ${calcResult.weldsCountScenario1} solda(s) | **${calcResult.totalSemEmendaSemOpt} barras** |
| **Cenário 2: "Sem Emenda com Otimização de Corte"** | ${calcResult.weldsCountScenario2} solda(s) | **${calcResult.totalSemEmendaComOpt} barras** |
| **Cenário 3: "Com Emenda e Otimização Total"** | ${calcResult.weldsCountScenario3} solda(s) | **${calcResult.totalComEmendaComOpt} barras** |`
    : `| Cenário / Método de Corte | Perfil Externo (${calcResult.profileExt.name}) | Perfil Interno (${calcResult.profileInt.name}) | Total de Barras (6m) |
| :------------------------ | :---------------------------------: | :---------------------------------: | :------------------: |
| **Cenário 1: "Sem Emenda e Sem Otimização"** | ${calcResult.extScenario1} barra(s) | ${calcResult.intScenario1} barra(s) | **${calcResult.totalSemEmendaSemOpt} barras** |
| **Cenário 2: "Sem Emenda com Otimização de Corte"** | ${calcResult.extScenario2} barra(s) | ${calcResult.intScenario2} barra(s) | **${calcResult.totalSemEmendaComOpt} barras** |
| **Cenário 3: "Com Emenda e Otimização Total"** | ${calcResult.extScenario3} barra(s) | ${calcResult.intScenario3} barra(s) | **${calcResult.totalComEmendaComOpt} barras** |`;

  if (textWithout567.search(/(?:^|\n)##\s*4[\.\s]/i) >= 0) {
    textWithout567 = textWithout567.replace(
      /(?:^|\n)(##\s*4[\.\s][^\n]*\n+)[\s\S]*$/i,
      `\n\n## 4. Resultado e Quadro Comparativo de Consumo\n\n${canonicalSection4Table}`
    ).trim();
  }

  // 5. Search for Section 3 heading (## 3. Plano de Corte Otimizado)
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

  const totalTableChunks = Math.ceil(calcResult.allocatedBarsDetailed.length / TABLE_ROWS_PER_PAGE) || 1;
  const markdownPages = React.useMemo(() => splitMarkdownIntoPages(markdown, calcResult), [markdown, calcResult]);

  const markdownPagesCount = markdownPages.length;
  const section5PageNumber = markdownPagesCount + 1;
  const section6PageNumber = markdownPagesCount + 2;
  const tableStartPageNumber = markdownPagesCount + 3;
  const totalPages = markdownPagesCount + 2 + totalTableChunks;

  return (
    <div
      ref={reportRef}
      id="printable-report"
      className="report-card latex-document font-serif bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto my-4 transition-all"
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
