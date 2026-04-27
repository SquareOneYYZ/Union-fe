import React from 'react';
import { Alert } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  /* eslint-disable react/no-danger */
  render() {
    const { error } = this.state;
    if (error) {
      return (
        <Alert severity="error">
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error.stack}
          </pre>
        </Alert>
      );
    }
    const { children } = this.props;
    return children;
  }
}

export default ErrorBoundary;
