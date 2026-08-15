export type CalculatorPage = 'painel' | 'led' | 'mdf';

export interface MetalonInput {
  altura: number; // em metros
  largura: number; // em metros
  perfilExterno: string; // ex: "50 x 30 mm" (Borda/Contorno)
  perfilInterno: string; // ex: "30 x 30 mm" (Travessas Internas)
  perfil?: string; // fallback retrocompatível
  posicaoExterno?: string; // ex: "Face 50 mm (Frente) × 30 mm (Profundidade)" ou "Face 30 mm (Frente) × 50 mm (Profundidade)"
  posicaoInterno?: string;
  faceExternoMm?: number; // dimensão da face no plano do painel em mm
  profundidadeExternoMm?: number; // dimensão da profundidade em mm
  faceInternoMm?: number;
  profundidadeInternoMm?: number;
  vaoMaximo?: number; // em centímetros (padrão 80 cm) - fallback
  vaoMaxHoriz?: number; // Vão Máximo Horizontal em cm (entre colunas verticais)
  vaoMaxVert?: number; // Vão Máximo Vertical em cm (entre linhas horizontais)
}

export interface CalculationResult {
  id: string;
  input: MetalonInput;
  markdown: string;
  createdAt: string;
  dateStr: string;
  source: 'gemini' | 'calculator';
  doubleCheckVerified?: boolean;
}
