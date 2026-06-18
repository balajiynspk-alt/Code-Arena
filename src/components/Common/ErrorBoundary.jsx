import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div 
          style={{ 
            padding: '16px', 
            background: '#1A0F15', 
            border: '1px solid #FF2D78', 
            borderRadius: '4px', 
            color: '#FF2D78', 
            fontFamily: 'Share Tech Mono' 
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontFamily: 'Orbitron' }}>⚠️ WIDGET CRASH DETECTED</h4>
          <p style={{ fontSize: '0.72rem', color: '#AAA', margin: '0 0 12px 0' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ 
              background: 'transparent', 
              border: '1px solid #FF2D78', 
              color: '#FF2D78', 
              padding: '4px 8px', 
              fontSize: '0.65rem', 
              cursor: 'pointer', 
              fontFamily: 'Orbitron',
              letterSpacing: '1px'
            }}
          >
            REBOOT SECTION
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
