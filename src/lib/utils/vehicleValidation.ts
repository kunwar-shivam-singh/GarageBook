/**
 * Utility functions for Indian Vehicle Registration Number validation and formatting,
 * including standard state plates and Bharat (BH) Series plates.
 */

// Matches standard state plates (MH12AB1234, DL3C1234, KA011234),
// temporary plates (MH12345678), and Bharat Series (26BH1234AB, 21BH5678C).
export const INDIAN_VEHICLE_REG_REGEX = /^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[A-Z]{2}[0-9]{6,8}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;

/**
 * Normalizes a raw registration input string by stripping whitespace and dashes and converting to uppercase.
 */
export function normalizeVehicleNumber(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase();
}

/**
 * Validates whether the normalized vehicle registration string matches valid Indian formats (State or BH series).
 */
export function isValidIndianRegistration(raw: string): boolean {
  const clean = normalizeVehicleNumber(raw);
  return INDIAN_VEHICLE_REG_REGEX.test(clean);
}

/**
 * Formats a clean vehicle registration string into standard human-readable display formats:
 * - BH Series: 26BH1234AB -> 26 BH 1234 AB
 * - State Series: MH12AB1234 -> MH 12 AB 1234
 */
export function formatVehicleNumberDisplay(raw: string): string {
  const clean = normalizeVehicleNumber(raw);
  if (!clean) return '';

  // Check BH series: YY BH #### XX
  const bhMatch = clean.match(/^([0-9]{2})(BH)([0-9]{4})([A-Z]{1,2})$/);
  if (bhMatch) {
    return `${bhMatch[1]} ${bhMatch[2]} ${bhMatch[3]} ${bhMatch[4]}`;
  }

  // Check Standard state series: ST ## XX ####
  const stateMatch = clean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/);
  if (stateMatch) {
    return `${stateMatch[1]}${stateMatch[2]} ${stateMatch[3]} ${stateMatch[4]}`;
  }

  return clean;
}
