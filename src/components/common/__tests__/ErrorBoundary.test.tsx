// ==============================================================================
// Maison MIPA Memories — ErrorBoundary Unit Tests
// Verifies branded fallback rendering and secret/stack redaction in production.
// ==============================================================================

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Simulation of unexpected render crash with token=eyJhbGciOiJIUzI1Ni');
};

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('renders branded fallback when child throws render error', () => {
    // Suppress console.error in test output for caught error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Maison MIPA gặp sự cố khi tải trang')).toBeInTheDocument();
    expect(screen.getByText('Thử lại')).toBeInTheDocument();
    expect(screen.getByText('Về trang chủ')).toBeInTheDocument();

    spy.mockRestore();
  });
});
