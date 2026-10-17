// Decides whether a hostname or resolved address may be fetched on behalf of a user.
// Private, loopback, link-local and special-purpose ranges are refused so the preview
// action cannot be used to reach internal services (SSRF).

export function parseIPv4(value: string): number[] | undefined {
  const parts = value.split(".");
  if (parts.length !== 4) return undefined;
  const octets = parts.map(part => /^\d{1,3}$/.test(part) ? Number(part) : -1);
  return octets.every(octet => octet >= 0 && octet <= 255) ? octets : undefined;
}

export function isBlockedIPv4(octets: number[]) {
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && octets[2] === 0)
    || (a === 192 && b === 0 && octets[2] === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && octets[2] === 100)
    || (a === 203 && b === 0 && octets[2] === 113);
}

export function expandIPv6(value: string): number[] | undefined {
  let address = value.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  let tail: number[] = [];
  const embedded = address.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) {
    const octets = parseIPv4(embedded[1]);
    if (!octets) return undefined;
    tail = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    address = address.slice(0, -embedded[1].length);
    if (address.endsWith(":") && !address.endsWith("::")) address = address.slice(0, -1);
  }
  const halves = address.split("::");
  if (halves.length > 2) return undefined;
  const parse = (part: string) => part === "" ? [] : part.split(":").map(group => /^[0-9a-f]{1,4}$/.test(group) ? Number.parseInt(group, 16) : NaN);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  if ([...head, ...rest].some(Number.isNaN)) return undefined;
  const known = head.length + rest.length + tail.length;
  if (halves.length === 1 && known !== 8) return undefined;
  if (halves.length === 2 && known > 7) return undefined;
  return [...head, ...new Array(8 - known).fill(0), ...rest, ...tail];
}

export function isBlockedIPv6(groups: number[]) {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  if (groups.slice(0, 7).every(group => group === 0) && (g7 === 0 || g7 === 1)) return true; // :: and ::1
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((g0 & 0xff00) === 0xff00) return true; // multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
  if ([g0, g1, g2, g3, g4].every(group => group === 0) && g5 === 0xffff) return isBlockedIPv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]); // IPv4-mapped
  if (g0 === 0x0064 && g1 === 0xff9b && [g2, g3, g4, g5].every(group => group === 0)) return isBlockedIPv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]); // NAT64
  if (g0 === 0x2002) return isBlockedIPv4([g1 >> 8, g1 & 0xff, g2 >> 8, g2 & 0xff]); // 6to4
  return false;
}

export function isBlockedAddress(address: string) {
  const ipv4 = parseIPv4(address);
  if (ipv4) return isBlockedIPv4(ipv4);
  if (address.includes(":")) {
    const ipv6 = expandIPv6(address);
    return !ipv6 || isBlockedIPv6(ipv6);
  }
  return false;
}

export function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost") return true;
  if (/\.(localhost|local|internal|intranet|home|lan|arpa|test|invalid|example)$/.test(host)) return true;
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return true; // numeric shorthands such as 2130706433 or 0x7f000001
  if (parseIPv4(host) || host.includes(":")) return isBlockedAddress(host);
  return !host.includes(".");
}
