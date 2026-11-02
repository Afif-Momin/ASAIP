const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const compactInr = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat('en-IN');

export const formatINR = (value: number) => inr.format(value || 0);
export const formatCompactINR = (value: number) => compactInr.format(value || 0);
export const formatNumber = (value: number) => number.format(value || 0);
export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
};
export const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date);
};
export const averageScore = (scores: object) => {
  const values = Object.values(scores) as number[];
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};
