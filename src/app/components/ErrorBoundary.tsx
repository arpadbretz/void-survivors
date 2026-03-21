'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Game crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0a14',
            color: '#e0e0f0',
            fontFamily: 'monospace',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
          <h1 style={{ fontSize: '1.5rem', color: '#ff4466', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '400px' }}>
            The game encountered an unexpected error. Your progress has been saved.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #00f0ff, #aa44ff)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            Reload Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
