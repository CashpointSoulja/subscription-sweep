import { Component, type ReactNode } from 'react';

/** If a page ever throws, show a calm message instead of a blank screen. Resets when the route changes. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  // Clear the error when the route changes, without remounting the page on every route change.
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  componentDidCatch(error: Error) { console.warn('Sweep page error:', error.message); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="wrap">
        <div className="page-head"><h1>Something went wrong on this page</h1></div>
        <div className="report" role="alert">
          <span>Nothing was uploaded, and nothing you dropped in has left this device.</span>
          <span><a href="#/sweep/priya">Open the sample sweep</a> · <button type="button" className="linklike" onClick={() => location.reload()}>Reload</button></span>
        </div>
      </div>
    );
  }
}
