import { z } from 'zod';

export const RegistrarVendaSchema = z.object({
  caixaId: z.string().uuid(),
  metodoPgto: z.enum(['CASH', 'CARD', 'PIX']),
  itens: z.array(
    z.object({
      produtoId: z.string().uuid(),
      quantidade: z.number().int().positive(),
      precoUnit: z.number().positive(),
    })
  ),
});

export const AbrirCaixaSchema = z.object({
  saldoInicial: z.number().min(0),
});
