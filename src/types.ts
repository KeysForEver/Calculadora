export interface MetalonInput {
  altura: number; // em metros
  largura: number; // em metros
  perfil: string; // ex: "30 x 30 mm"
  vaoMaximo?: number; // em centímetros (padrão 80 cm)
}

export interface CalculationResult {
  id: string;
  input: MetalonInput;
  markdown: string;
  createdAt: string;
  dateStr: string;
  source: 'gemini' | 'calculator';
}
