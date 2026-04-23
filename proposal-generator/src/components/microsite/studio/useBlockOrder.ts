import { useMemo } from 'react';
import { resolveBlockOrder } from './SubBlock';

interface UseBlockOrderArgs<T extends string> {
  defaults: readonly T[];
  persisted: string[] | undefined;
  setOrder: (next: string[]) => void;
}

interface UseBlockOrderResult<T extends string> {
  order: T[];
  isFirst: (id: T) => boolean;
  isLast: (id: T) => boolean;
  moveUp: (id: T) => void;
  moveDown: (id: T) => void;
}

// Given a fixed catalog of block ids + a persisted order (possibly partial),
// resolves the effective order and returns move-up/move-down helpers that
// push the new order back via `setOrder`.
export function useBlockOrder<T extends string>({
  defaults,
  persisted,
  setOrder,
}: UseBlockOrderArgs<T>): UseBlockOrderResult<T> {
  const order = useMemo(() => resolveBlockOrder(persisted, defaults) as T[], [persisted, defaults]);

  function move(id: T, direction: -1 | 1) {
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setOrder(next);
  }

  return {
    order,
    isFirst: (id) => order[0] === id,
    isLast: (id) => order[order.length - 1] === id,
    moveUp: (id) => move(id, -1),
    moveDown: (id) => move(id, 1),
  };
}
