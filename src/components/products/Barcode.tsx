import { ean13Modules } from "@/lib/barcode";

const QUIET = 9;
const BAR_H = 50;
const GUARD_H = 56;

/** EAN-13 barcode as SVG. `code` must be a valid 13-digit EAN/ISBN. */
export default function Barcode({ code }: { code: string }) {
  const bits = ean13Modules(code);
  const isGuard = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;

  return (
    <svg
      viewBox={`0 0 ${95 + QUIET * 2} ${GUARD_H + 10}`}
      className="w-full max-w-[320px]"
      role="img"
      aria-label={"Barcode " + code}
    >
      <rect width="100%" height="100%" fill="#fff" />
      {[...bits].map((b, i) =>
        b === "1" ? (
          <rect key={i} x={QUIET + i} y={2} width={1} height={isGuard(i) ? GUARD_H : BAR_H} fill="#000" />
        ) : null
      )}
      <g fontSize="7" textAnchor="middle" fill="#000" fontFamily="monospace">
        <text x={QUIET - 4} y={GUARD_H + 8}>{code[0]}</text>
        {[...code.slice(1, 7)].map((d, i) => (
          <text key={"l" + i} x={QUIET + 3 + i * 7 + 3.5} y={GUARD_H + 8}>{d}</text>
        ))}
        {[...code.slice(7)].map((d, i) => (
          <text key={"r" + i} x={QUIET + 50 + i * 7 + 3.5} y={GUARD_H + 8}>{d}</text>
        ))}
      </g>
    </svg>
  );
}
