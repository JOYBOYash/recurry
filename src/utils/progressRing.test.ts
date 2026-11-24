import assert from 'node:assert/strict';
import test from 'node:test';
import { computeProgressRingGeometry } from './progressRing';

test('computeProgressRingGeometry computes exact circumference and offsets across 0%, 50%, 100%', () => {
  const zero = computeProgressRingGeometry({ percent: 0, size: 52, strokeWidth: 4 });
  assert.equal(zero.center, 26);
  assert.equal(zero.radius, 24);
  assert.ok(Math.abs(zero.circumference - 2 * Math.PI * 24) < 1e-6);
  assert.ok(Math.abs(zero.dashOffset - zero.circumference) < 1e-6);

  const half = computeProgressRingGeometry({ percent: 50, size: 52, strokeWidth: 4 });
  assert.ok(Math.abs(half.dashOffset - half.circumference / 2) < 1e-6);

  const full = computeProgressRingGeometry({ percent: 100, size: 52, strokeWidth: 4 });
  assert.equal(full.clampedPercent, 100);
  assert.ok(Math.abs(full.dashOffset) < 1e-6);
});

test('computeProgressRingGeometry clamps out-of-bounds and non-finite percentages safely', () => {
  const negative = computeProgressRingGeometry({ percent: -25, size: 48, strokeWidth: 4 });
  assert.equal(negative.clampedPercent, 0);
  assert.ok(Math.abs(negative.dashOffset - negative.circumference) < 1e-6);

  const overflow = computeProgressRingGeometry({ percent: 140, size: 48, strokeWidth: 4 });
  assert.equal(overflow.clampedPercent, 100);
  assert.ok(Math.abs(overflow.dashOffset) < 1e-6);

  const invalid = computeProgressRingGeometry({
    percent: Number.NaN,
    size: 48,
    strokeWidth: 4,
  });
  assert.equal(invalid.clampedPercent, 0);
});
