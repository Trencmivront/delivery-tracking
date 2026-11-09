import { OrderCard } from './OrderCard';
import DeliveryMap from './DeliveryMap';
import { useDeliverySocket } from '../useDeliverySocket'; 
import { useCallback, useState } from 'react';
import { LiveLocationLabel } from './LiveLocationLabel';

// ─── TrackingResult ───────────────────────────────────────────────────────────
export function TrackingResult({ data }) {
  const [driverPos, setDriverPos]     = useState(null);
  const [waypoints, setWaypoints]     = useState(data.waypoints || []);

  const handleInit     = useCallback((msg) => {
    setWaypoints(msg.waypoints || []);
  }, []);

  const handleLocation = useCallback((msg) => {
    setDriverPos(msg);
  }, []);

  useDeliverySocket({
    orderCode:  data.order.order_code,
    onInit:     handleInit,
    onLocation: handleLocation,
  });

  return (
    <>
      {/* Map spanning full width */}
      <div className="card map-section">
        <OrderCard data={data} />

        <div className="card-body" style={{ padding: '16px' }}>
            <div className="card-header">🗺️ Live Driver Map</div>
            <LiveLocationLabel
                orderCard={<OrderCard data={data} />}
                driverPos={driverPos}
                waypoints={waypoints}
                allStatuses={data.allStatuses}
                status={data.order.status_code}
            />
          <div className="map-wrapper">
            <DeliveryMap
              waypoints={waypoints}
              driverPos={driverPos}
              status={data.order.status_code}
            />
          </div>
        </div>
      </div>
    </>
  );
}