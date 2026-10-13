import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error in Wolf Night', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center neo-border neo-shadow-lg">
            <h2 className="mb-2 inline-block rounded-xl bg-primary px-4 py-2 text-lg font-black text-primary-foreground uppercase neo-border neo-shadow">
              Terjadi Kesalahan
            </h2>
            <p className="mb-4 text-sm font-semibold text-muted-foreground">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-black text-primary-foreground uppercase neo-border neo-shadow"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
