import { describe, it, expect, vi } from 'vitest';
import { handleNextStep, DEFAULT_NEXT_STEP_HANDLER } from '../nextStepActions';

describe('nextStepActions', () => {
  it('calls openSheet with correct view for allocate_emergency', () => {
    const openSheet = vi.fn();
    const navigate = vi.fn();
    const payload = { transfer: { amount: 100, transferTarget: 'emergency', transferDirection: 'deposit' } };
    handleNextStep('allocate_emergency', { openSheet, navigate }, payload);
    expect(openSheet).toHaveBeenCalledWith('transfer', payload);
  });

  it('passes payload for build_savings action', () => {
    const openSheet = vi.fn();
    const navigate = vi.fn();
    const payload = { transfer: { amount: 200, transferTarget: 'savings', transferDirection: 'deposit' } };
    handleNextStep('build_savings', { openSheet, navigate }, payload);
    expect(openSheet).toHaveBeenCalledWith('transfer', payload);
  });

  it('falls back to menu for unknown action', () => {
    const openSheet = vi.fn();
    const navigate = vi.fn();
    handleNextStep('unknown_action' as any, { openSheet, navigate });
    expect(openSheet).toHaveBeenCalledWith('menu', undefined);
  });
});
