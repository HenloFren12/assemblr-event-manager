// src/components/board/TaskCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mk } from '../../../shared/testUtils';
import TaskCard from './TaskCard';

describe('TaskCard', () => {
  it('shows a blocked notice and disables Doing and Done', () => {
    render(<TaskCard task={mk('t2', ['t1'])} ownerName="Asha" blockedBy={['Get sound permit']} atRisk={false} onStatusChange={vi.fn()} />);
    expect(screen.getByTestId('blocked-t2')).toHaveTextContent('Get sound permit');
    expect(screen.getByRole('option', { name: 'Doing' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Done' })).toBeDisabled();
  });

  it('shows Unassigned when there is no owner', () => {
    render(<TaskCard task={mk('t1')} ownerName={null} blockedBy={[]} atRisk={false} onStatusChange={vi.fn()} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('calls onStatusChange with the chosen status', async () => {
    const onChange = vi.fn();
    render(<TaskCard task={mk('t1')} ownerName="Asha" blockedBy={[]} atRisk={false} onStatusChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'done');
    expect(onChange).toHaveBeenCalledWith('t1', 'done');
  });

  it('flags at-risk tasks in text', () => {
    render(<TaskCard task={mk('t1')} ownerName="Asha" blockedBy={[]} atRisk onStatusChange={vi.fn()} />);
    expect(screen.getByText(/At risk/)).toBeInTheDocument();
  });

  it('renders hostile titles as plain text, not HTML', () => {
    render(<TaskCard task={mk('t1', [], 1, { title: '<img src=x onerror=alert(1)>' })} ownerName={null} blockedBy={[]} atRisk={false} onStatusChange={vi.fn()} />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading')).toHaveTextContent('<img src=x onerror=alert(1)>');
  });
});
