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

export const ReportViewer: React.FC<ReportViewerProps> = ({
  markdown,
  input,
  dateStr,
  source,
  reportRef,
}) => {
  return (
    <div
      ref={reportRef}
      id="printable-report"
      className="report-card bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto my-4 transition-all"
    >
      {/* Header Documento */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">
          SkyMídia
        </h1>
      </div>

      {/* Visual Diagram Included in Report */}
      <div className="mb-8">
        <StructureVisualizer input={input} />
      </div>

      {/* Markdown Content */}
      <div className="report-content prose prose-slate max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      </div>

      {/* Document Footer */}
      <div className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-600 flex flex-col items-center justify-center gap-1.5 text-center">
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
    </div>
  );
};
