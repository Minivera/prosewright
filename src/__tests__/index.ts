import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Skipped test', () => {
  it('Will be skipped', () => {
    assert.strictEqual(1, 1);
  });
});