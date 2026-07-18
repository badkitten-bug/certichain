/**
 * Puerto para obtener la hora actual. Abstraerlo permite probar
 * reglas dependientes del tiempo (¿la elección está abierta?)
 * con fechas controladas.
 */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('Clock');
