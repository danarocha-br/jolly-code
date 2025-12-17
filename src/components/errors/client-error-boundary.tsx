"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { analytics } from "@/lib/services/tracking";
import { ERROR_EVENTS } from "@/lib/services/tracking/events";

import { FriendlyError } from "./friendly-error";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    Sentry.captureException(error, { extra: errorInfo });
    analytics.trackError(ERROR_EVENTS.CLIENT_ERROR_OCCURRED, error, {
      component_stack: errorInfo?.componentStack,
      error_boundary: true,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <FriendlyError
          title={this.props.title}
          description={this.props.description}
          actionLabel={this.props.actionLabel}
          reset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
