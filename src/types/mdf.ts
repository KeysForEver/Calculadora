export type MdfMode = 'revestimento' | 'pecas';

export type MdfFitaBorda = 'nenhuma' | '1C' | '2C' | '1L' | '2L' | '4L';

export interface MdfSheetPreset {
  id: string;
  nome: string;
  larguraMm: number;
  alturaMm: number;
  espessurasPadrao: number[]; // em mm (ex: [6, 15, 18])
}

export interface MdfSheetConfig {
  larguraMm: number; // ex: 2750 mm
  alturaMm: number; // ex: 1830 mm
  espessuraMm: number; // ex: 15 mm
  refiloMm: number; // refilo de borda em cada lado (ex: 10 mm)
  kerfMm: number; // espessura do disco de serra (ex: 3 mm ou 4 mm)
  precoChapa?: number; // valor monetário por chapa (opcional)
  precoMetroFita?: number; // valor monetário por metro de fita (opcional)
}

// ==========================================
// MODO 1: REVESTIMENTO DE PAINEL / FACHADA
// ==========================================
export interface MdfPanelCoveringInput {
  larguraPainelM: number; // em metros
  alturaPainelM: number; // em metros
  orientacaoChapa: 'horizontal' | 'vertical'; // sentido principal das chapas
  juntaDilatacaoMm: number; // friso/junta entre chapas (0 a 10 mm)
  alinhamento: 'inicio' | 'centro'; // alinhamento das emendas
  sheetConfig: MdfSheetConfig;
}

export interface MdfPanelPiece {
  id: string;
  col: number;
  row: number;
  xMm: number;
  yMm: number;
  larguraMm: number;
  alturaMm: number;
  isFullSheet: boolean;
}

export interface MdfPanelCoveringResult {
  areaTotalPainelM2: number;
  areaChapaBrutaM2: number;
  areaChapaUtilM2: number;
  chapasInteirasCount: number;
  recortesCount: number;
  totalChapasComprar: number;
  aproveitamentoPercent: number;
  areaSobraM2: number;
  fitaPerimetroM: number;
  fitaJuntasM: number;
  piecesGrid: MdfPanelPiece[];
  colunasCount: number;
  linhasCount: number;
  dimensoesColunasMm: number[];
  dimensoesLinhasMm: number[];
}

// ==========================================
// MODO 2: LISTA DE PEÇAS & PLANO DE CORTE
// ==========================================
export interface MdfPieceItem {
  id: string;
  descricao: string;
  comprimentoMm: number;
  larguraMm: number;
  quantidade: number;
  fitaBorda: MdfFitaBorda;
  respeitarVeio: boolean; // se true, não pode rotacionar
}

export interface MdfPlacedPiece {
  pieceId: string;
  descricao: string;
  xMm: number;
  yMm: number;
  comprimentoMm: number;
  larguraMm: number;
  rotated: boolean;
  fitaBorda: MdfFitaBorda;
}

export interface MdfFreeRect {
  xMm: number;
  yMm: number;
  larguraMm: number;
  alturaMm: number;
}

export interface MdfOptimizedSheet {
  sheetIndex: number;
  larguraUtilMm: number;
  alturaUtilMm: number;
  placedPieces: MdfPlacedPiece[];
  freeRects: MdfFreeRect[];
  areaUsadaM2: number;
  aproveitamentoPercent: number;
  areaSobraM2: number;
}

export interface MdfCuttingPlanResult {
  sheets: MdfOptimizedSheet[];
  totalChapas: number;
  totalPecasCortadas: number;
  areaPecasTotalM2: number;
  areaChapasCompradasM2: number;
  aproveitamentoGeralPercent: number;
  areaPerdaTotalM2: number;
  fitaBordaTotalMetros: number;
  unplacedPieces: { piece: MdfPieceItem; remaining: number }[];
}
