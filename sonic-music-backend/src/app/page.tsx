'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean; user?: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthStatus({ authenticated: false });
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎵 Sonic Music API</h1>
      
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Spotify Authentication</h3>
        {loading ? (
          <p>Checking auth status...</p>
        ) : authStatus?.authenticated ? (
          <div>
            <p style={{ color: 'green' }}>✓ Logged in as {authStatus.user?.display_name || 'Spotify User'}</p>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#e74c3c', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666' }}>Not logged in. Login to access India trending playlists.</p>
            <button 
              onClick={handleLogin}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#1DB954', 
                color: 'white', 
                border: 'none', 
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Login with Spotify
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: '1.5rem' }}>Use the API endpoints:</p>
      <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
        <li><code>GET /api/trending</code> - Get trending songs</li>
        <li><code>GET /api/search?q=query</code> - Search songs</li>
        <li><code>GET /api/song/:id</code> - Get song details</li>
        <li><code>GET /api/stream/:id</code> - Get stream URL</li>
      </ul>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px' }}>
        <h4>💡 Note</h4>
        <p>Login with Spotify to access India-specific trending playlists. Without login, the API falls back to mock data.</p>
      </div>
    </div>
  );
}