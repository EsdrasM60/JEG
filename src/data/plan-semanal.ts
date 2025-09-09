export type SemanaKey = 1 | 2 | 3 | 4 | 5;

export type PlanSemanalTarea = {
  area: string;
  descripcion: string;
};

export type PlanSemanalSemana = {
  semana: SemanaKey;
  titulo: string;
  subtitulo?: string;
  tareas: PlanSemanalTarea[];
};

// Tareas por semana según guía de limpieza
export const PLAN_SEMANAL: PlanSemanalSemana[] = [
  {
    semana: 1,
    titulo: "1ra SEMANA DEL MES - INTERIOR",
    tareas: [
      { area: "Ventanas", descripcion: "Limpiar con agua y un poco de detergente empezando por el exterior incluyendo los protectores de ventanas. Enjuagar con agua limpia cuidando de no mojar los muebles. Limpiar suavemente con papel toalla los cristales. Usar limpiador de cristal o solución de agua con vinagre." },
      { area: "Paredes", descripcion: "Limpiar con un paño limpio y húmedo para quitar el polvo. En manchas o suciedad marcada, lavar con detergente y cuidar la pintura. Limpiar cerámicas de paredes y puertas de cubículos de baños." },
      { area: "Sillas", descripcion: "Limpiar la estructura con paño húmedo. Para sillas acolchadas, aspirar y quitar manchas con producto apropiado." },
      { area: "Pisos", descripcion: "Barrer y trapear con poca agua. No usar cloro. El desinfectante debe disolverse en agua, nunca directamente al piso. Incluir la acera frente a las entradas." },
    ],
  },
  {
    semana: 2,
    titulo: "2da SEMANA DEL MES - EXTERIOR",
    tareas: [
      { area: "Área verde", descripcion: "Podar arbustos y cortar grama. Eliminar partes secas y maleza en áreas de grava. Quitar maleza que venga de vecinos." },
      { area: "Estacionamiento", descripcion: "Incluye aceras y contenes. Limpiar toda el área profundamente. Eliminar manchas de humedad en las aceras." },
      { area: "Portones", descripcion: "Incluir portón vehicular y peatonal. Limpiar con agua y detergente. Enjuagar con agua limpia." },
      { area: "Cuarto de Limpieza", descripcion: "Sacar todo, limpiar y organizar. Desechar equipos y productos inservibles; organizar materiales (escobas, suapers, cubos, papel toalla, etc.)." },
    ],
  },
  {
    semana: 3,
    titulo: "3ra SEMANA DEL MES - INTERIOR",
    tareas: [
      { area: "Techo", descripcion: "Con escobillón para techos, retirar polvo, telarañas e insectos." },
      { area: "Ventiladores", descripcion: "Con escalera, limpiar aspas con paño mojado y seco. Limpiar base del abanico. No trabajar a más de 1.8m de altura." },
      { area: "Muebles", descripcion: "Incluir muebles de plataforma, literatura, tablero y biblioteca. Retirar publicaciones y limpiar con paño húmedo y seco. Retirar artículos inservibles o abandonados." },
      { area: "Cristales", descripcion: "Limpiar espejos de baños, cristales de la Sala B y puertas. Usar limpiador de cristal o agua con vinagre." },
      { area: "Pisos", descripcion: "Barrer y trapear con poca agua. No usar cloro. Desinfectante diluido en agua. Incluir acera frente a entradas." },
    ],
  },
  {
    semana: 4,
    titulo: "4ta SEMANA DEL MES - EXTERIOR/INTERIOR",
    tareas: [
      { area: "Área verde", descripcion: "Podar arbustos y cortar grama. Eliminar partes secas y maleza." },
      { area: "Lámparas", descripcion: "Remover difusores y limpiar suavemente con paño húmedo y seco. Revisar insectos y polvo. Colocar difusores con cuidado." },
      { area: "Cuarto de Máquina", descripcion: "Sacar todo, limpiar y organizar. No dejar nada que pueda causar o alimentar incendio." },
    ],
  },
  {
    semana: 5,
    titulo: "5ta SEMANA DEL MES",
    subtitulo: "Si hay quinta semana entre los dos meses, se pueden usar para tareas que no se completaron.",
    tareas: [],
  },
];
