import { useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:4000';

/**
 * useDeliverySocket
 * Opens a WebSocket, subscribes to orderCode updates, and calls
 * onInit / onLocation / onError with incoming messages.
 */
export function useDeliverySocket({ orderCode, onInit, onLocation, onError }) {
  const wsRef    = useRef(null);
  const activeRef = useRef(orderCode);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', orderCode: activeRef.current }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init')     onInit?.(msg);
        if (msg.type === 'location') onLocation?.(msg);
        if (msg.type === 'error')    onError?.(msg.message);
      } catch (_) {}
    };

    ws.onerror = () => onError?.('WebSocket connection error.');

    ws.onclose = () => {
      // Attempt reconnect after 3s if component still mounted
      setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, 3000);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!orderCode) return;
    activeRef.current = orderCode;
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [orderCode, connect]);
}
