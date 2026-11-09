import { formatDate, statusIcon } from "../utils";

// ─── StatusTimeline ───────────────────────────────────────────────────────────
export function StatusTimeline({ allStatuses = [], currentStatus, history = [] }) {
  const historyMap = {};
  history.forEach((h) => { historyMap[h.status_code] = h; });

  const currentIndex = allStatuses.findIndex((s) => s.code === currentStatus);

  return (
    <div className="timeline">
      {allStatuses.map((s, i) => {
        const isDone   = i < currentIndex;
        const isActive = i === currentIndex;
        const isFuture = i > currentIndex;
        const cls      = isDone ? 'done' : isActive ? 'active' : 'future';
        const h        = historyMap[s.code];

        return (
          <div key={s.code} className={`timeline-step ${cls}`}>
            <div className={`step-dot ${cls}`}>
              {isDone   ? '✓' : statusIcon(s.code)}
            </div>
            <div className="step-content">
              <div className="step-label">{s.label}</div>
              {h && <div className="step-time">{formatDate(h.changed_at)}</div>}
              {h?.note && <div className="step-time" style={{ marginTop: 2 }}>📝 {h.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}