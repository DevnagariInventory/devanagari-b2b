// EAN-13 (ISBN-13) barcode encoding.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Returns 95 modules as a string of 0/1 (1 = black bar). Caller must validate first. */
export function ean13Modules(code: string): string {
  const parity = PARITY[Number(code[0])];
  let bits = "101";
  for (let i = 0; i < 6; i++) {
    const d = Number(code[i + 1]);
    bits += parity[i] === "L" ? L[d] : G[d];
  }
  bits += "01010";
  for (let i = 7; i < 13; i++) bits += R[Number(code[i])];
  return bits + "101";
}
