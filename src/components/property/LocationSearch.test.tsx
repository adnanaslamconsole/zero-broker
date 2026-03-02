import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LocationSearch } from './LocationSearch';
import type React from 'react';
import * as React from 'react';

vi.mock('framer-motion', () => {
  const passthrough = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: () => passthrough,
      }
    ),
  };
});

vi.mock('@/lib/locationSearchService', () => ({
  searchLocations: vi.fn(async () => ({
    results: [{ place_id: 1, lat: '1', lon: '2', display_name: 'Kanpur, India', type: 'city' }],
    meta: { strategy: 'primary', queryUsed: 'kanpur' },
  })),
}));

const Wrapper = () => {
  const [value, setValue] = React.useState('');
  return (
    <LocationSearch
      value={value}
      onChange={setValue}
      onLocationSelect={vi.fn()}
      placeholder="Search"
    />
  );
};

describe('LocationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('does not open results panel immediately on typing (prevents double-open feel)', async () => {
    render(<Wrapper />);

    const input = screen.getByPlaceholderText('Search');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kanpur' } });

    expect(screen.queryByText(/suggested locations/i)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(360);
      await Promise.resolve();
    });

    expect(screen.getByText(/suggested locations/i)).toBeInTheDocument();
  });

  it('debounces rapid input changes into a single search call', async () => {
    const { searchLocations } = await import('@/lib/locationSearchService');
    render(<Wrapper />);

    const input = screen.getByPlaceholderText('Search');
    fireEvent.focus(input);

    fireEvent.change(input, { target: { value: 'kan' } });
    fireEvent.change(input, { target: { value: 'kanp' } });
    fireEvent.change(input, { target: { value: 'kanpu' } });
    fireEvent.change(input, { target: { value: 'kanpur' } });

    await act(async () => {
      vi.advanceTimersByTime(360);
    });

    expect(vi.mocked(searchLocations)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(searchLocations).mock.calls[0]?.[0]).toBe('kanpur');
  });
});
