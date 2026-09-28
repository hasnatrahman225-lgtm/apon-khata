// Safe number formatting helper for Hermes / Android React Native
export function formatTk(amount) {
  const num = Number(amount || 0);
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  
  // Format with commas: 1234567.89 -> 1,234,567.89
  const parts = absVal.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Clean trailing .00 if whole number
  const formatted = parts[1] === '00' ? parts[0] : `${parts[0]}.${parts[1]}`;
  return `${isNegative ? '-' : ''}৳ ${formatted}`;
}

export function formatDate(isoString) {
  if (!isoString) return '';
  try {
    return String(isoString).split('T')[0];
  } catch (e) {
    return String(isoString);
  }
}
