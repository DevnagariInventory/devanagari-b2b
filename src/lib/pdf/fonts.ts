import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Outfit has no Devanagari or ₹ glyphs, so Noto Sans Devanagari is listed as the fallback in every fontFamily.
const fontDir = path.join(process.cwd(), "assets", "fonts");
const f = (file: string) => path.join(fontDir, file);

Font.register({
  family: "Outfit",
  fonts: [
    { src: f("Outfit_400Regular.ttf"), fontWeight: 400 },
    { src: f("Outfit_500Medium.ttf"), fontWeight: 500 },
    { src: f("Outfit_600SemiBold.ttf"), fontWeight: 600 },
    { src: f("Outfit_700Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({ family: "Playfair", src: f("PlayfairDisplay_700Bold.ttf"), fontWeight: 700 });
Font.register({
  family: "NotoDeva",
  fonts: [
    { src: f("NotoSansDevanagari_400Regular.ttf"), fontWeight: 400 },
    { src: f("NotoSansDevanagari_700Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]); // never split words across lines

export const SANS = ["Outfit", "NotoDeva"];
export const SERIF = ["Playfair", "NotoDeva"];
