import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MetalonInput } from '../types';
import { StructureVisualizer } from './StructureVisualizer';

interface ReportViewerProps {
  markdown: string;
  input: MetalonInput;
  dateStr: string;
  source?: 'gemini' | 'calculator';
  reportRef: React.RefObject<HTMLDivElement | null>;
}

const ReportHeader: React.FC<{ dateStr?: string }> = ({ dateStr }) => (
  <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-end justify-between">
    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">
      SKYMÍDIA
    </h1>
    {dateStr && (
      <div className="text-right">
        <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
          {dateStr}
        </span>
      </div>
    )}
  </div>
);

const ReportFooter: React.FC = () => (
  <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-600 flex flex-col items-center justify-center gap-1.5 text-center">
    <a
      href="https://skymidiabh.com.br/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#707579] hover:text-slate-900 hover:underline font-medium"
    >
      https://skymidiabh.com.br/
    </a>
    <a
      href="https://www.instagram.com/skymidiabh/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#707579] hover:text-slate-900 hover:underline font-medium"
    >
      https://www.instagram.com/skymidiabh/
    </a>
  </div>
);

export const ReportViewer: React.FC<ReportViewerProps> = ({
  markdown,
  input,
  dateStr,
  source,
  reportRef,
}) => {
  // Clean markdown by removing any trailing Data: line to avoid duplication
  const cleanedMarkdown = React.useMemo(() => {
    return markdown
      .replace(/---\s*\n*\s*Data:.*$/si, '')
      .replace(/\n\s*Data:.*$/si, '')
      .trim();
  }, [markdown]);

  return (
    <div
      ref={reportRef}
      id="printable-report"
      className="report-card bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto my-4 transition-all"
    >
      {/* Page 1: Header + Sections 1, 2, 3 + Footer */}
      <div className="pdf-page bg-white flex flex-col justify-between min-h-[960px] sm:min-h-[1000px]">
        <div>
          <ReportHeader dateStr={dateStr} />
          {/* Markdown Content (Sections 1, 2, 3) */}
          <div className="report-content prose prose-slate max-w-none my-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {cleanedMarkdown}
            </ReactMarkdown>
          </div>
        </div>
        <ReportFooter />
      </div>

      {/* Page 2: Header + Section 4 (Visual Diagram) + Footer */}
      <div
        className="pdf-page bg-white pt-8 mt-10 border-t border-slate-200 flex flex-col justify-between min-h-[960px] sm:min-h-[1000px] break-before-page page-break-before-always"
        style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
      >
        <div>
          <ReportHeader dateStr={dateStr} />
          <div className="my-2">
            <StructureVisualizer input={input} />
          </div>
        </div>
        <ReportFooter />
      </div>
    </div>
  );
};
