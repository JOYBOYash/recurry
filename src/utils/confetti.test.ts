import test from 'node:test';
import assert from 'node:assert/strict';
import type { Options as ConfettiOptions } from 'canvas-confetti';
import {
  CELEBRATION_CONFETTI_COLORS,
  triggerTrackCompletionConfetti,
} from './confetti';

function installWindowTimersMock() {
  let nextId = 1;
  const scheduled = new Map<number, () => void>();
  const prevWindow = (globalThis as { window?: unknown }).window;

  (globalThis as { window: unknown }).window = {
    setTimeout(fn: () => void) {
      const id = nextId++;
      scheduled.set(id, fn);
      return id;
    },
    clearTimeout(id: number) {
      scheduled.delete(id);
    },
  };

  return {
    scheduled,
    flushAll() {
      for (const [id, fn] of Array.from(scheduled.entries())) {
        scheduled.delete(id);
        fn();
      }
    },
    restore() {
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = prevWindow;
      }
    },
  };
}

test('triggerTrackCompletionConfetti fires immediate center burst and two staggered side bursts with reduced-motion enabled', () => {
  const env = installWindowTimersMock();
  const calls: Array<ConfettiOptions | undefined> = [];

  try {
    const cleanup = triggerTrackCompletionConfetti({
      runner: (opts) => {
        calls.push(opts);
        return null;
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.disableForReducedMotion, true);
    assert.deepEqual(calls[0]?.colors, [...CELEBRATION_CONFETTI_COLORS]);
    assert.equal(calls[0]?.particleCount, 75);
    assert.equal(env.scheduled.size, 2);

    env.flushAll();
    assert.equal(calls.length, 3);
    assert.equal(calls[1]?.angle, 60);
    assert.equal(calls[2]?.angle, 120);

    cleanup();
  } finally {
    env.restore();
  }
});

test('triggerTrackCompletionConfetti cleanup cancels pending staggered bursts before they fire', () => {
  const env = installWindowTimersMock();
  const calls: Array<ConfettiOptions | undefined> = [];

  try {
    const cleanup = triggerTrackCompletionConfetti({
      runner: (opts) => {
        calls.push(opts);
        return null;
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(env.scheduled.size, 2);

    cleanup();
    assert.equal(env.scheduled.size, 0);

    env.flushAll();
    assert.equal(calls.length, 1);
  } finally {
    env.restore();
  }
});
