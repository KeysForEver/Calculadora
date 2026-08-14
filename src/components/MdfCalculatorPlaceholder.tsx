import React from 'react';
import { Layers, Sparkles, Scissors, Box, ShieldCheck, ArrowLeft } from 'lucide-react';

interface MdfCalculatorPlaceholderProps {
  onBackToPainel: () => void;
}

export function MdfCalculatorPlaceholder({ onBackToPainel }: MdfCalculatorPlaceholderProps) {
  return (
    <section className="no-print bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-slate-200/80 mb-8 md:w-3/4 mx-auto w-full">
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-5 ring-8 ring-emerald-500/5">
          <Layers className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Em Breve
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Calculadora de MDF
        </h2>

        <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
          Esta página está reservada para o módulo de cálculo de chapas de MDF, plano de corte otimizado e fita de borda para marcenaria e comunicação visual.
        </p>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 text-left">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2.5">
              <Box className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Chapas Padrão</h3>
            <p className="text-xs text-slate-500 mt-1">Cálculo baseado no padrão 2,75m x 1,83m e espessuras (6, 15, 18mm).</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2.5">
              <Scissors className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Plano de Corte</h3>
            <p className="text-xs text-slate-500 mt-1">Aproveitamento máximo com cálculo de perda/sobra e sentido do veio.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Fita de Borda</h3>
            <p className="text-xs text-slate-500 mt-1">Metragem linear total de fita de borda necessária por peça.</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
          <button
            type="button"
            onClick={onBackToPainel}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel & Front Light
          </button>
        </div>
      </div>
    </section>
  );
}
