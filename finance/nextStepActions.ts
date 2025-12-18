import type { SheetView } from './storage';
import type { NextStepActionType } from './selectors';

type Handlers = {
  openSheet: (view?: SheetView, payload?: any) => void;
  navigate: (path: string) => void;
};

export const NEXT_STEP_ACTIONS: Record<NextStepActionType, (h: Handlers, payload?: any) => void> = {
  allocate_emergency: ({ openSheet }, payload) => openSheet('transfer', payload),
  reduce_spending: ({ openSheet }, payload) => openSheet('expense', payload),
  increase_income: ({ openSheet }, payload) => openSheet('income', payload),
  build_savings: ({ openSheet }, payload) => openSheet('transfer', payload),
  pay_bills: ({ openSheet }, payload) => openSheet('regular', payload),
};

export const DEFAULT_NEXT_STEP_HANDLER = ({ openSheet }: Handlers, payload?: any) => openSheet('menu', payload);

export const handleNextStep = (action: NextStepActionType | string, handlers: Handlers, payload?: any) => {
  if (action && (NEXT_STEP_ACTIONS as any)[action]) {
    return (NEXT_STEP_ACTIONS as any)[action](handlers, payload);
  }
  return DEFAULT_NEXT_STEP_HANDLER(handlers, payload);
};

export default NEXT_STEP_ACTIONS;
