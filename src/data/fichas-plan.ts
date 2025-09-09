export type Categoria = "EDIFICIO" | "MECANICOS" | "ELECTRICOS" | "EQUIPOS";
export type PlanEntry = {
  titulo: string;
  categoria: Categoria;
  frecuencia: "1 mes" | "3 meses" | "6 meses" | "1 año";
  meses: number[]; // 1-12
  starred?: boolean; // marca *
};

// NOTA: Meses propuestos por defecto. Ajusta según su programa real.
//  - 1 mes: todos los meses
//  - 3 meses: Feb, May, Ago, Nov
//  - 6 meses: Abr, Oct
//  - 1 año: Oct
const M_1M = [1,2,3,4,5,6,7,8,9,10,11,12];
const M_3M = [2,5,8,11];
const M_6M = [4,10];
const M_1A = [10];

export const PLAN_FICHAS: PlanEntry[] = [
  // 1 - EDIFICIO
  { titulo: "Cerrajería", categoria: "EDIFICIO", frecuencia: "1 mes", meses: M_1M, starred: true },
  { titulo: "Control de plaga", categoria: "EDIFICIO", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Extintores", categoria: "EDIFICIO", frecuencia: "1 mes", meses: M_1M, starred: true },
  { titulo: "Inspección estructural", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A, starred: true },
  { titulo: "Inspección externa", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A },
  { titulo: "Inspección interna", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A },
  { titulo: "Jardines", categoria: "EDIFICIO", frecuencia: "6 meses", meses: M_6M },
  { titulo: "Muebles y accesorios", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A, starred: true },
  { titulo: "Prevención de riesgos", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A, starred: true },
  { titulo: "Puertas y ventanas", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A },
  { titulo: "Shutters", categoria: "EDIFICIO", frecuencia: "6 meses", meses: M_6M },
  { titulo: "Techos", categoria: "EDIFICIO", frecuencia: "1 año", meses: M_1A, starred: true },

  // 2 - MECÁNICOS
  { titulo: "Aguas residuales", categoria: "MECANICOS", frecuencia: "6 meses", meses: M_6M },
  { titulo: "Aire acondicionado - Cassett", categoria: "MECANICOS", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Aire acondicionado - Fan Coil", categoria: "MECANICOS", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Aire acondicionado - Manejadoras", categoria: "MECANICOS", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Aire acondicionado - Mini Split", categoria: "MECANICOS", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Almacenamiento de agua", categoria: "MECANICOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Bebederos", categoria: "MECANICOS", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Pozos", categoria: "MECANICOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Registros y válvulas", categoria: "MECANICOS", frecuencia: "1 año", meses: M_1A, starred: true },
  { titulo: "Sistema hidráulico", categoria: "MECANICOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Ventilación", categoria: "MECANICOS", frecuencia: "1 año", meses: M_1A, starred: true },

  // 3 - ELÉCTRICOS Y ELECTRÓNICOS
  { titulo: "Alarma", categoria: "ELECTRICOS", frecuencia: "1 año", meses: M_1A, starred: true },
  { titulo: "Baterías del inversor", categoria: "ELECTRICOS", frecuencia: "6 meses", meses: M_6M, starred: true },
  { titulo: "Inversor", categoria: "ELECTRICOS", frecuencia: "1 año", meses: M_1A, starred: true },
  { titulo: "Paneles eléctricos", categoria: "ELECTRICOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Sistema de video", categoria: "ELECTRICOS", frecuencia: "6 meses", meses: M_6M },
  { titulo: "Sistemas eléctricos", categoria: "ELECTRICOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Sistema de sonido", categoria: "ELECTRICOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Video vigilancia", categoria: "ELECTRICOS", frecuencia: "3 meses", meses: M_3M },
  { titulo: "Paneles solares", categoria: "ELECTRICOS", frecuencia: "6 meses", meses: M_6M },

  // 4 - EQUIPOS Y HERRAMIENTAS
  { titulo: "Escalera portátil", categoria: "EQUIPOS", frecuencia: "1 año", meses: M_1A },
  { titulo: "Kit de mantenimiento", categoria: "EQUIPOS", frecuencia: "1 año", meses: M_1A },
];
