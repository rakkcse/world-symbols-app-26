import React, { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isQuotaError = false;
      try {
        const errorText = this.state.error?.message || "";
        if (errorText.includes('Quota limit exceeded') || errorText.includes('Quota exceeded')) {
          isQuotaError = true;
          errorMessage = "The daily free database limit has been reached. This quota will automatically reset tomorrow. Please try again then.";
        } else {
          const parsedError = JSON.parse(errorText);
          if (parsedError.error) {
            errorMessage = `Database Error: ${parsedError.error}`;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className={`min-h-screen ${isQuotaError ? 'bg-blue-50' : 'bg-red-50'} flex items-center justify-center p-4`}>
          <div className={`bg-white p-8 rounded-[32px] shadow-xl max-w-md w-full text-center border ${isQuotaError ? 'border-blue-100' : 'border-red-100'}`}>
            <div className={`w-16 h-16 ${isQuotaError ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isQuotaError ? "Daily Limit Reached" : "Something went wrong"}
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className={`w-full flex items-center justify-center px-6 py-4 ${isQuotaError ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'} text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg`}
            >
              <RefreshCcw className="w-5 h-5 mr-2" />
              {isQuotaError ? "Refresh Page" : "Try Again"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
