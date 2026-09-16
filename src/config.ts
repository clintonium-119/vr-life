// Dev flags parsed from the URL query string, e.g. `?dev=1` (all) or
// `?dev=perf,tools` (individual). Frozen export. The flag is the URL, in
// every build: the tools ship in the Pages artifact so it can be measured.

export interface DevFlags {
  /** Performance readout / harness UI. */
  perf: boolean;
  /** Developer tools (teleport rig, normals, hand rays). */
  tools: boolean;
}

const KNOWN_FLAGS: ReadonlySet<keyof DevFlags> = new Set(['perf', 'tools']);

export function parseDevFlags(query: string): DevFlags {
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

export const devFlags: Readonly<DevFlags> = Object.freeze(parseDevFlags(window.location.search));
