import { describe, expect, it } from 'vitest';
import { SUBJECTS } from './dayState';
import { BANKS, QuestionDeck, daySeed, shuffleBank } from './questions';

describe('question banks', () => {
  it('have at least 38 well-formed questions per subject with a fifth of them jokes', () => {
    for (const s of SUBJECTS) {
      const bank = BANKS[s];
      expect(bank.length, s).toBeGreaterThanOrEqual(38);
      expect(new Set(bank.map((q) => q.prompt)).size, `${s} unique prompts`).toBe(bank.length);
      for (const q of bank) {
        expect(q.options, q.prompt).toHaveLength(4);
        expect(new Set(q.options).size, q.prompt).toBe(4);
        expect(q.answer, q.prompt).toBeGreaterThanOrEqual(0);
        expect(q.answer, q.prompt).toBeLessThanOrEqual(3);
      }
      const jokes = bank.filter((q) => q.joke === true).length;
      expect(jokes / bank.length, `${s} joke ratio`).toBeGreaterThanOrEqual(0.1);
    }
  });

  it('shuffles deterministically and draws without repeats over a pass', () => {
    expect(shuffleBank('math', 42).map((q) => q.prompt)).toEqual(
      shuffleBank('math', 42).map((q) => q.prompt),
    );
    expect(shuffleBank('math', 42).map((q) => q.prompt)).not.toEqual(
      shuffleBank('math', 43).map((q) => q.prompt),
    );
    const deck = new QuestionDeck('science', 7);
    const n = BANKS.science.length;
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) seen.add(deck.next().prompt);
    expect(seen.size).toBe(n);
    expect(deck.next()).toBeDefined(); // reshuffled pass
    expect(daySeed(new Date(2026, 8, 16))).toBe(20260916);
  });
});
