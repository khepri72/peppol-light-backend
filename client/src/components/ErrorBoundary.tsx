import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Log détaillé pour identifier la source de l'erreur
    console.error('🔴 [ErrorBoundary] Error caught:', error.name, '-', error.message);
    console.error('🔴 [ErrorBoundary] Stack:', error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log détaillé avec le component stack
    console.error('🔴 [ErrorBoundary] Full error details:');
    console.error('  Name:', error.name);
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
    console.error('  Component Stack:', errorInfo.componentStack);
    
    // Stocker errorInfo pour affichage optionnel
    this.setState({ errorInfo });
    
    // Identifier les erreurs DOM courantes
    if (error.message.includes('insertBefore') || error.message.includes('removeChild')) {
      console.error('🔴 [ErrorBoundary] DOM manipulation error detected!');
      console.error('  This usually happens when external code modifies the DOM');
      console.error('  Check for: document.createElement, appendChild, removeChild');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center bg-gray-50">
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            Oups ! Quelque chose s'est mal passé.
          </h1>
          <p className="text-gray-600 mb-6 max-w-md">
            {this.state.error?.message || 'Une erreur inattendue s\'est produite'}
          </p>
          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#1E5AA8] text-white rounded-lg font-semibold hover:bg-[#2A6EC1] transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
