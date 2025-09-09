import { z } from "zod";

export const cubicacionCreateSchema = z.object({
  code: z.string().optional(),
  descripcion: z.string().min(3),
  unidad: z.string().optional(),
  cantidad: z.number().nonnegative().optional(),
  precioUnitario: z.number().nonnegative().optional(),
});

export const paymentCreateSchema = z.object({
  amount: z.number().positive(),
  date: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});

export const overviewPatchSchema = z.object({
  scope: z.string().optional(),
  initialBudget: z
    .object({ amount: z.number().nonnegative(), currency: z.string().optional() })
    .optional(),
  estado: z
    .enum(["PLANIFICADO", "EN_PROGRESO", "EN_PAUSA", "COMPLETADO", "CANCELADO"]) // same as model
    .optional(),
});
