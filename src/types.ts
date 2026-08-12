export interface MetalonInput {
  altura: number; // em metros
  largura: number; // em metros
  perfilExterno: string; // ex: "50 x 30 mm" (Borda/Contorno)
  perfilInterno: string; // ex: "30 x 30 mm" (Travessas Internas)
  perfil?: string; // fallback retrocompatível
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
}
