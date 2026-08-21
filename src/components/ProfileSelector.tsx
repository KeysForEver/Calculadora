import React from 'react';
import { Square, RectangleHorizontal } from 'lucide-react';

export interface ProfilePreset {
  value: string;
  label: string;
  isSquare: boolean;
}

export const PROFILE_PRESETS_ROW_1: ProfilePreset[] = [
  { value: '20 x 20 mm', label: '20x20', isSquare: true },
  { value: '30 x 30 mm', label: '30x30', isSquare: true },
  { value: '40 x 40 mm', label: '40x40', isSquare: true },
  { value: '50 x 50 mm', label: '50x50', isSquare: true },
];

export const PROFILE_PRESETS_ROW_2: ProfilePreset[] = [
  { value: '50 x 30 mm', label: '50x30', isSquare: false },
  { value: '40 x 20 mm', label: '40x20', isSquare: false },
  { value: '30 x 20 mm', label: '30x20', isSquare: false },
  { value: '70 x 90 mm', label: '70x90', isSquare: false },
];

export const ALL_PROFILE_PRESETS: ProfilePreset[] = [
  ...PROFILE_PRESETS_ROW_1,
  ...PROFILE_PRESETS_ROW_2,
];

interface ProfileSelectorProps {
  id?: string;
  label: string;
  sublabel?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  context?: 'borda' | 'travessa';
  icon?: React.ReactNode;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  id,
  label,
  sublabel,
  value,
  onChange,
  placeholder = 'Ex: 50 x 30 mm',
  required = false,
  icon,
}) => {
  // Normalize string for comparing against presets (removes spaces, mm, etc.)
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+|mm/g, '')
      .replace(/×/g, 'x');

  const normalizedCurrent = normalize(value);

  const handleSelect = (preset: ProfilePreset) => {
    const isSelected =
      normalizedCurrent === normalize(preset.value) ||
      normalizedCurrent === normalize(preset.label);

    if (isSelected) {
      onChange('');
    } else {
      onChange(preset.value);
    }
  };

  return (
    <div className="space-y-1.5" id={id ? `${id}-container` : undefined}>
      {/* Label and Sublabel */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
        >
          {icon || <Square className="w-4 h-4 text-[#707579]" />}
          <span>{label}</span>
        </label>
        {sublabel && (
          <span className="text-[10px] font-medium text-slate-400">
            {sublabel}
          </span>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        <input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#707579] focus:bg-white transition text-sm"
          required={required}
          autoComplete="off"
        />
      </div>

      {/* Preset Buttons: 4 per line */}
      <div className="pt-1 space-y-1.5">
        {/* Linha 1: 20x20, 30x30, 40x40, 50x50 */}
        <div className="grid grid-cols-4 gap-1.5">
          {PROFILE_PRESETS_ROW_1.map((preset) => {
            const isSelected = normalizedCurrent === normalize(preset.value) || normalizedCurrent === normalize(preset.label);
            return (
              <button
                key={preset.label}
                type="button"
                id={id ? `${id}-preset-${preset.label}` : undefined}
                onClick={() => handleSelect(preset)}
                className={`py-2 px-1 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400'
                }`}
                title={isSelected ? `Clique para desmarcar perfil ${preset.label}` : `Selecionar perfil ${preset.value}`}
              >
                <Square className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Linha 2: 50x30, 40x20, 30x20, 70x90 */}
        <div className="grid grid-cols-4 gap-1.5">
          {PROFILE_PRESETS_ROW_2.map((preset) => {
            const isSelected = normalizedCurrent === normalize(preset.value) || normalizedCurrent === normalize(preset.label);
            return (
              <button
                key={preset.label}
                type="button"
                id={id ? `${id}-preset-${preset.label}` : undefined}
                onClick={() => handleSelect(preset)}
                className={`py-2 px-1 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400'
                }`}
                title={isSelected ? `Clique para desmarcar perfil ${preset.label}` : `Selecionar perfil ${preset.value}`}
              >
                <RectangleHorizontal className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
