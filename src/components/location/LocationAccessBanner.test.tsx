import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationAccessBanner } from './LocationAccessBanner';

describe('LocationAccessBanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true,
    });
  });

  it('shows iOS instructions when denied', () => {
    render(
      <LocationAccessBanner
        loading={false}
        coords={null}
        error="Location access was denied."
        errorType="denied"
        permission="denied"
        onRequest={vi.fn()}
      />
    );

    expect(screen.getByText(/location access is off/i)).toBeInTheDocument();
    expect(screen.getByText(/iOS: Settings/i)).toBeInTheDocument();
  });
});

