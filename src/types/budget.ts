export type BudgetUnit = 'm2' | 'linear' | 'un' | 'minuto' | 'placa';

export interface BudgetCatalogSubItem {
  id: string;
  code: string;
  nome: string;
  defaultUnit: BudgetUnit;
  hasSpecificUnit?: boolean;
  rawUnitText?: string;
  suggestedPrice?: number;
  minimo?: number;
  maximo?: number;
  descricaoSugestao?: string;
}

export interface BudgetCatalogGroup {
  id: string;
  code: string;
  nome: string;
  descricao?: string;
  defaultUnit?: BudgetUnit;
  hasSpecificUnit?: boolean;
  rawUnitText?: string;
  suggestedPrice?: number;
  minimo?: number;
  maximo?: number;
  subItems: BudgetCatalogSubItem[];
}

export interface BudgetItem {
  id: string;
  groupId: string;
  groupName: string;
  subItemId: string;
  itemCode: string;
  itemName: string;
  unit: BudgetUnit;
  // Dimensões
  larguraM?: number; // Para m²
  alturaM?: number; // Para m²
  comprimentoM?: number; // Para metro linear
  areaM2?: number; // Calculado
  quantidade: number;
  precoUnitario: number;
  total: number;
  observacoes?: string;
}

export interface BudgetClientInfo {
  clienteNome: string;
  empresa?: string;
  telefone: string;
  email?: string;
  vendedor: string;
  prazoEntregaDias: number;
  validadeDias: number;
  condicoesPagamento: string;
  observacoesGerais?: string;
}
