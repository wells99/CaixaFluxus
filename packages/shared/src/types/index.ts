import { MetodoPagamento, StatusCaixa, StatusSync } from '../constants';

export interface ProdutoDTO {
  id: string;
  codigoBarras?: string | null;
  nome: string;
  precoVenta: number;
  estoque: number;
  updatedAt: Date;
}

export interface CaixaDTO {
  id: string;
  saldoInicial: number;
  saldoFinal?: number | null;
  status: StatusCaixa;
  openedAt: Date;
  closedAt?: Date | null;
}

export interface VendaDTO {
  id: string;
  caixaId: string;
  valorTotal: number;
  metodoPgto: MetodoPagamento;
  createdAt: Date;
  itens: ItemVendaDTO[];
}

export interface ItemVendaDTO {
  id: string;
  vendaId: string;
  produtoId: string;
  quantidade: number;
  precoUnit: number;
}

export interface SyncQueueDTO {
  id: string;
  entity: string;
  payload: string;
  status: StatusSync;
  attempts: number;
  createdAt: Date;
}
