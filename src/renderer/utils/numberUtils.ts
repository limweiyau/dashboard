/**
 * Number utilities for consistent chart data processing
 */

/**
 * Round a number to a maximum of 3 decimal places, removing floating point precision errors
 * @param value The number to round
 * @returns The rounded number with max 3 decimal places
 */
export function roundToMaxDecimals(value: number): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return Math.round(value * 1000) / 1000;
}

/**
 * Safely convert a value to a number and round it to max 3 decimal places
 * @param value The value to convert and round
 * @returns The safely converted and rounded number
 */
export function safeNumber(value: any): number {
  const num = Number(value) || 0;
  return roundToMaxDecimals(num);
}

/**
 * Round all numeric values in an array to max 3 decimal places
 * @param values Array of numbers to round
 * @returns Array with all values rounded to max 3 decimal places
 */
export function roundArray(values: number[]): number[] {
  return values.map(v => roundToMaxDecimals(v));
}