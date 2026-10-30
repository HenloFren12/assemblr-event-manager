// src/components/shared/ReadinessMeter.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReadinessMeter from './ReadinessMeter';

describe('ReadinessMeter', () => {
  it('exposes the score to assistive tech', () => {
    render(<ReadinessMeter score={82.4} />);
    const meter = screen.getByRole('meter', { name: 'Event readiness' });
    expect(meter).toHaveAttribute('aria-valuenow', '82');
    expect(meter).toHaveAttribute('aria-valuetext', '82 percent, On track');
  });
  it('clamps out-of-range scores', () => {
    const { rerender } = render(<ReadinessMeter score={250} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
    rerender(<ReadinessMeter score={-5} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
  });
  it('labels low scores as at risk in text, not only colour', () => {
    render(<ReadinessMeter score={30} />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
  });
});
