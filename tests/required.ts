/** Наличие элемента fixture проверяется до его использования в предметном контроле. */
export function required<T>(value: T | undefined, message = "Отсутствует ожидаемый элемент fixture"): T {
  if (value === undefined) throw Error(message);
  return value;
}
