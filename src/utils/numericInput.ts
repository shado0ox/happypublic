// Text inputs preserve Arabic keyboard digits before the browser can discard
// them (type="number" discards non-ASCII digits on some mobile browsers).
export function normalizeNumericInput(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, '');
}
