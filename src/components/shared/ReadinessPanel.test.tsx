// src/components/shared/ReadinessPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReadinessPanel from './ReadinessPanel';

describe('ReadinessPanel', () => {
  const breakdown = { ownership: 50, schedule: 100, budget: 80, progress: 10, score: 73 };

  it('shows the meter and every component of the score', () => {
    render(<ReadinessPanel breakdown={breakdown} />);
    expect(screen.getByRole('meter', { name: 'Event readiness' })).toHaveAttribute('aria-valuenow', '73');
    expect(screen.getByText('Tasks owned').nextElementSibling).toHaveTextContent('50%');
    expect(screen.getByText('On schedule').nextElementSibling).toHaveTextContent('100%');
    expect(screen.getByText('Budget fit').nextElementSibling).toHaveTextContent('80%');
    expect(screen.getByText('Completed').nextElementSibling).toHaveTextContent('10%');
  });

  it('is exposed as a labelled region', () => {
    render(<ReadinessPanel breakdown={breakdown} />);
    expect(screen.getByRole('region', { name: 'Event readiness summary' })).toBeInTheDocument();
  });
});
