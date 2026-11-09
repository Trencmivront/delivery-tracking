// Utility: format a MySQL datetime string to a human-readable locale string
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// Map status_code to a readable badge class
export function badgeClass(code) {
  const map = {
    pending:      'badge-pending',
    in_warehouse: 'badge-in_warehouse',
    in_transit:   'badge-in_transit',
    out_delivery: 'badge-out_delivery',
    delivered:    'badge-delivered',
  };
  return `status-badge ${map[code] || ''}`;
}

// Status icons
export function statusIcon(code) {
  const map = {
    pending:      '🕐',
    in_warehouse: '🏭',
    in_transit:   '🚚',
    out_delivery: '📦',
    delivered:    '✅',
  };
  return map[code] || '📋';
}
