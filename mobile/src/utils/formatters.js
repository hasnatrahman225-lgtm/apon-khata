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
    const raw = String(isoString).trim();
    // Extract date portion whether space or T separated
    const datePart = raw.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD -> DD-MM-YYYY
      const y = parts[0];
      const m = parts[1];
      const d = parts[2];
      return `${d}/${m}/${y}`;
    }
    return datePart;
  } catch (e) {
    return String(isoString);
  }
}
