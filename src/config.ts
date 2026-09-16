// Dev flags parsed from the URL query string, e.g. `?dev=1` (all) or
// `?dev=perf,tools` (individual). Frozen export; force-off in production.

export interface DevFlags {
  /** Performance readout / harness UI. */
  perf: boolean;
  /** Developer tools (teleport rig, normals, hand rays). */
  tools: boolean;
}

const KNOWN_FLAGS: ReadonlySet<keyof DevFlags> = new Set(['perf', 'tools']);

function parseDevFlags(query: string): DevFlags {
  const params = new URLSearchParams(query);
  const raw = params.get('dev');
  const flags: DevFlags = { perf: false, tools: false };
  if (!raw) return flags;

  if (raw === '1' || raw.toLowerCase() === 'all') {
    for (const key of KNOWN_FLAGS) flags[key] = true;
    return flags;
  }

  for (const token of raw.split(',')) {
    const key = token.trim() as keyof DevFlags;
    if (KNOWN_FLAGS.has(key)) flags[key] = true;
  }
  return flags;
}

function resolve(): DevFlags {
  if (import.meta.env.PROD) {
    // Dev flags are meaningless in a production build; force everything off.
    return { perf: false, tools: false };
  }
  return parseDevFlags(window.location.search);
}

export const devFlags: Readonly<DevFlags> = Object.freeze(resolve());
