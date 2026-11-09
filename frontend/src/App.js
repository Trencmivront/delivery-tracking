import React, { useState } from 'react';
import './App.css';
import { TrackingResult } from './components/TrackingResult';

const API_BASE = 'http://localhost:4000/api';

const SAMPLE_CODES = [
  { code: 'TRK-001001', status: 'In Transit' },
  { code: 'TRK-001002', status: 'Out for Delivery' },
  { code: 'TRK-001003', status: 'Delivered' },
  { code: 'TRK-001004', status: 'In Warehouse' },
  { code: 'TRK-001005', status: 'Pending' },
];

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [inputCode, setInputCode]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [orderData, setOrderData]   = useState(null);
  const [searched, setSearched]     = useState('');

  const handleSearch = async (code) => {
    const query = (code || inputCode).trim().toUpperCase();
    if (!query) return;

    setLoading(true);
    setError('');
    setOrderData(null);
    setSearched(query);

    try {
      const res = await fetch(`${API_BASE}/order/${query}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Order not found.');
      } else {
        setOrderData(json);
      }
    } catch (e) {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleHintClick = (code) => {
    setInputCode(code);
    handleSearch(code);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-icon">📦</div>
        <div>
          <h1>Delivery Tracker</h1>
          <p>Real-time cargo tracking with live driver location</p>
        </div>
      </header>

      <main className="main">
        {/* Search */}
        <section className="search-section">
          <h2>🔍 Track Your Shipment</h2>
          <form className="search-form" onSubmit={handleSubmit}>
            <input
              className="search-input"
              type="text"
              placeholder="Enter order code (e.g. TRK-001001)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              autoFocus
            />
            <button className="search-btn" type="submit" disabled={loading || !inputCode.trim()}>
              {loading ? '🔄 Searching…' : '🔎 Track'}
            </button>
          </form>

          {/* Sample codes hint */}
          <div className="hint-box">
            <strong>💡 Try a sample order code:</strong>
            <div className="hint-codes">
              {SAMPLE_CODES.map(({ code, status }) => (
                <button
                  key={code}
                  className="hint-code"
                  onClick={() => handleHintClick(code)}
                  title={status}
                >
                  {code} <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({status})</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="error-banner">
            ❌ <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {orderData && <TrackingResult data={orderData} key={searched} />}

        {/* Empty state */}
        {!orderData && !error && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🚚</div>
            <div style={{ fontSize: '1.1rem' }}>Enter an order code above to start tracking</div>
          </div>
        )}
      </main>

      <footer className="footer">
        Delivery Tracker — Real-time cargo tracking system &nbsp;|&nbsp; WebSocket powered 🔌
      </footer>
    </div>
  );
}
