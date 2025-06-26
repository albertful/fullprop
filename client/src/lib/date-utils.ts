export function getDaysUntilExpiry(endDate: Date | string): number {
  const now = new Date();
  const leaseEndDate = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const timeDiff = leaseEndDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

export function getLeaseProgress(startDate: Date | string, endDate: Date | string): number {
  const now = new Date();
  const leaseStartDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const leaseEndDate = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const totalDuration = leaseEndDate.getTime() - leaseStartDate.getTime();
  const elapsedDuration = now.getTime() - leaseStartDate.getTime();
  
  if (elapsedDuration < 0) return 0; // Lease hasn't started yet
  if (elapsedDuration > totalDuration) return 100; // Lease has ended
  
  return Math.round((elapsedDuration / totalDuration) * 100);
}

export function getLeaseStatus(startDate: Date | null, endDate: Date | null): "active" | "expiring-soon" | "critical" | "expired" | "not-started" {
  if (!startDate || !endDate) return "active";
  
  const now = new Date();
  const daysUntilExpiry = getDaysUntilExpiry(endDate);
  
  if (now < startDate) return "not-started";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 30) return "critical";
  if (daysUntilExpiry <= 60) return "expiring-soon";
  return "active";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatCurrency(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(numAmount);
}
