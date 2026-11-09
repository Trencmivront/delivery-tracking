export function LiveLocationLabel({ orderCard, driverPos, waypoints, allStatuses, status }){

    const total       = waypoints.length;
    const step        = driverPos?.step ?? 0;
    // const pct         = Math.min(Math.round((step / Math.max(total - 1, 1)) * 100), 100);
    const isMoving    = status === 'in_transit' || status === 'out_delivery';
    const isDelivered = status === 'delivered';
    // const stageIndex  = allStatuses.findIndex((s) => s.code === status);

    return <div className="mp-row">
    <div className="mp-label-col">
        <span className="mp-icon">📍</span>
        <span className="mp-label">Location</span>
    </div>
    <div className="mp-bar-col mp-status-col">
        {isMoving && <span className="live-dot" />}
        <span className="mp-status-text">
        {isDelivered
            ? '✅ Package delivered successfully'
            : isMoving
            ? driverPos?.label || 'En route…'
            : status === 'pending'
            ? '⏳ Awaiting warehouse processing'
            : '🏭 Package is at the warehouse'}
        </span>
    </div>
    <div className="mp-value-col">
        {isMoving && (
        <span className="mp-step-badge">{step + 1}/{total}</span>
        )}
    </div>
</div>;
}