export function formatNotificationBadgeCount(count: number): string {
  if (count <= 0) return '';
  if (count > 9) return '9+';
  return String(count);
}

export function shouldShowNotificationBadge(count: number): boolean {
  return count > 0;
}
