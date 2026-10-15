import { useId } from "react";

export function GiftMark() {
  const goldId = useId();

  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={goldId} x1="9" y1="4" x2="41" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f0dfbd" />
        <stop offset=".45" stopColor="#dfc58e" />
        <stop offset="1" stopColor="#b39560" />
      </linearGradient>
    </defs>
    <g fill={`url(#${goldId})`} stroke="#f5e8cd" strokeOpacity=".25" strokeWidth=".5">
      <rect x="8" y="15" width="14" height="14" rx="1" />
      <rect x="8" y="32" width="14" height="14" rx="1" />
      <rect x="25" y="32" width="14" height="14" rx="1" />
      <rect x="28" y="12" width="14" height="14" rx="1" transform="rotate(24 35 19)" />
    </g>
    <g stroke="#f0dfbd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill={`url(#${goldId})`} fillOpacity=".18">
      <path d="M23.5 12C18 1 8 0 10 6C11 10 18 12 23.5 12Z" />
      <path d="M23.5 12C26 1 35 0 35 5C35 8 28 11 23.5 12Z" />
    </g>
    <circle cx="23.5" cy="12" r="2" fill="#f0dfbd" />
  </svg>;
}
