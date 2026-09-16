import { describe, expect, it } from 'vitest';
import { parseDevFlags } from './config';

describe('parseDevFlags', () => {
  it('defaults every flag off with no query string', () => {
    expect(parseDevFlags('')).toEqual({ perf: false, tools: false, crowd: false });
    expect(parseDevFlags('?other=1')).toEqual({ perf: false, tools: false, crowd: false });
  });

  it('enables all flags for dev=1 and dev=all', () => {
    expect(parseDevFlags('?dev=1')).toEqual({ perf: true, tools: true, crowd: true });
    expect(parseDevFlags('?dev=ALL')).toEqual({ perf: true, tools: true, crowd: true });
  });

  it('enables individual flags', () => {
    expect(parseDevFlags('?dev=perf')).toEqual({ perf: true, tools: false, crowd: false });
    expect(parseDevFlags('?dev=tools')).toEqual({ perf: false, tools: true, crowd: false });
    expect(parseDevFlags('?dev=perf, tools')).toEqual({ perf: true, tools: true, crowd: false });
  });

  it('ignores unknown tokens', () => {
    expect(parseDevFlags('?dev=bogus,perf')).toEqual({ perf: true, tools: false, crowd: false });
    expect(parseDevFlags('?dev=nope')).toEqual({ perf: false, tools: false, crowd: false });
  });
});
