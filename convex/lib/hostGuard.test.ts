import { describe, expect, test } from "vitest";
import { expandIPv6, isBlockedAddress, isBlockedHostname } from "./hostGuard";

describe("Protezione dagli indirizzi interni", () => {
  test("blocca indirizzi IPv4 privati, loopback e speciali", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255"]) expect(isBlockedAddress(address), address).toBe(true);
    for (const address of ["8.8.8.8", "172.32.0.1", "93.184.216.34", "1.1.1.1"]) expect(isBlockedAddress(address), address).toBe(false);
  });
  test("blocca indirizzi IPv6 locali, mappati e malformati", () => {
    for (const address of ["::1", "::", "fe80::1", "fd12:3456::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::7f00:1", "2002:7f00:1::", "ff02::1", "2001:db8::1", "not::an::ip"]) expect(isBlockedAddress(address), address).toBe(true);
    for (const address of ["2606:4700:4700::1111", "2a00:1450:4002:800::200e", "::ffff:8.8.8.8"]) expect(isBlockedAddress(address), address).toBe(false);
    expect(expandIPv6("2001:db8::1")).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6("1:2:3:4:5:6:7:8:9")).toBeUndefined();
  });
  test("blocca nomi host locali e scorciatoie numeriche", () => {
    for (const host of ["localhost", "LOCALHOST.", "db.internal", "printer.local", "intranet", "2130706433", "0x7f000001", "127.0.0.1", "[::1]", "foo.example"]) expect(isBlockedHostname(host), host).toBe(true);
    for (const host of ["www.amazon.it", "example.com", "shop.example-shop.it"]) expect(isBlockedHostname(host), host).toBe(false);
  });
});
