export const formatMoney = (n, cur = '$') => {
  const v = Number(n) || 0;
  const r = Math.round(v * 100) / 100;
  const whole = Math.abs(r % 1) < 0.005;
  const body = Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return `${cur}${body}`;
};

export const formatCompact = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v), sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(abs % 1e9 === 0 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs % 1e6 === 0 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(abs % 1e3 === 0 ? 0 : 1)}k`;
  return `${sign}${Math.round(abs)}`;
};

export const clampPct = (n) => (!isFinite(n) ? 0 : Math.max(0, Math.min(100, n)));
