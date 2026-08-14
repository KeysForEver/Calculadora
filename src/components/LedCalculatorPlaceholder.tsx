import React from 'react';
import { Zap, Sparkles, Cpu, BatteryCharging, ShieldAlert, ArrowLeft } from 'lucide-react';

interface LedCalculatorPlaceholderProps {
  onBackToPainel: () => void;
}

export function LedCalculatorPlaceholder({ onBackToPainel }: LedCalculatorPlaceholderProps) {
  return (
    <section className="no-print bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-slate-200/80 mb-8 md:w-3/4 mx-auto w-full">
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 mb-5 ring-8 ring-amber-500/5">
          <Zap className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Em Breve
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Calculadora de LED
        </h2>

        <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
          Esta página está reservada para o módulo de dimensionamento de iluminação, módulos e painéis de LED para comunicação visual e fachadas.
        </p>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 text-left">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Módulos & Fitas</h3>
            <p className="text-xs text-slate-500 mt-1">Cálculo de quantidade por metro quadrado e espaçamento ideal.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Dimensionamento de Fontes</h3>
            <p className="text-xs text-slate-500 mt-1">Potência total em Watts (W) e margem de segurança de 20%.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Bitola de Cabos</h3>
            <p className="text-xs text-slate-500 mt-1">Indicação de espessura de condutores e queda de tensão.</p>
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
