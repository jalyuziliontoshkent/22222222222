/**
 * Billable Area Calculation Logic:
 * - From 0.01 to 0.50 m² → 0.5 m²
 * - From 0.51 to 1.00 m² → 1.0 m²
 * - Above 1.00 m² → keep original value (no rounding)
 * - Invalid values (0, negative, NaN) → rejected (returns 0)
 */
export function calculateBillableArea(area: number): number {
  if (!area || isNaN(area) || area <= 0) return 0;
  if (area <= 0.5) return 0.5;
  if (area <= 1.0) return 1.0;
  return parseFloat(area.toFixed(2));
}

/**
 * Calculate raw area from width x height x quantity
 */
export function calculateRawArea(width: number, height: number, quantity: number = 1): number {
  if (!width || !height || width <= 0 || height <= 0) return 0;
  return parseFloat((width * height * quantity).toFixed(4));
}

/**
 * Calculate total price from billable area and price per sqm
 */
export function calculateItemPrice(width: number, height: number, pricePerSqm: number, quantity: number = 1): { rawArea: number; billableArea: number; price: number } {
  const rawArea = calculateRawArea(width, height, quantity);
  const billableArea = calculateBillableArea(rawArea);
  const price = parseFloat((billableArea * pricePerSqm).toFixed(2));
  return { rawArea, billableArea, price };
}
