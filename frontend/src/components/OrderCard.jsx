import { formatDate, badgeClass, statusIcon } from '../utils';
import { StatusTimeline } from './StatusTimeline';


// ─── OrderCard ────────────────────────────────────────────────────────────────
export function OrderCard({ data }) {
  const { order, allStatuses, history } = data;
  if (!data.waypoints.length) return null;
  return (
    <div className="card">
      <div className="card-header">
        📋 Order Details
      </div>
      <div className="card-body">
        <div className="order-code">{order.order_code}</div>

        <span className={badgeClass(order.status_code)}>
          {statusIcon(order.status_code)} {order.status_label}
        </span>

        <div className="info-grid" style={{ marginTop: 20 }}>
          <div className="info-item">
            <label>Sender</label>
            <span>{order.sender_name}</span>
          </div>
          <div className="info-item">
            <label>Receiver</label>
            <span>{order.receiver_name}</span>
          </div>
          <div className="info-item">
            <label>Phone</label>
            <span>{order.receiver_phone || '—'}</span>
          </div>
          <div className="info-item">
            <label>Weight</label>
            <span>{order.weight_kg ? `${order.weight_kg} kg` : '—'}</span>
          </div>
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <span>{order.description || '—'}</span>
          </div>
          <div className="info-item">
            <label>Created</label>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="info-item">
            <label>Last Update</label>
            <span>{formatDate(order.updated_at)}</span>
          </div>
        </div>

        <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

      {/* ── Header ── */}
      <div className="mp-row mp-header-row">
        <div className="mp-label-col">
          <span className="mp-icon">🚚</span>
        </div>
        <div className="mp-bar-col">
          <span className="mp-title">Delivery Progress</span>
        </div>
        <div className="mp-value-col" />
      </div>

      <div className="mp-divider" />
        <StatusTimeline
          allStatuses={allStatuses}
          currentStatus={order.status_code}
          history={history}
        />

        {/* Status History */}
        {history.length > 0 && (
          <>
            <div style={{ fontWeight: 600, margin: '24px 0 12px', fontSize: '0.95rem' }}>
              🕐 History Log
            </div>
            <ul className="history-list">
              {[...history].reverse().map((h, i) => (
                <li key={i} className="history-item">
                  <div className="history-dot" />
                  <div>
                    <div className="history-label">
                      {statusIcon(h.status_code)} {h.status_label}
                    </div>
                    {h.note && <div className="history-note">{h.note}</div>}
                    <div className="history-time">{formatDate(h.changed_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}