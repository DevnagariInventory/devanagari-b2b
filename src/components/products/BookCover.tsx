import { productImageUrl } from "@/lib/media";

const HUES = [222, 262, 152, 24, 340, 190, 45];

/** The book's photo, or a coloured placeholder with its title when there is none. Size it from outside. */
export default function BookCover({
  name,
  cover,
  className = "",
}: {
  name: string;
  cover: string | null;
  className?: string;
}) {
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={productImageUrl(cover, 400)} alt={name} className={`object-cover ${className}`} />;
  }
  const hue = HUES[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % HUES.length];
  return (
    <div
      role="img"
      aria-label={name}
      className={`flex items-center justify-center overflow-hidden p-2 text-center font-serif font-semibold leading-tight text-white ${className}`}
      style={{ background: `linear-gradient(145deg, hsl(${hue} 60% 42%), hsl(${(hue + 40) % 360} 65% 30%))` }}
    >
      <span className="line-clamp-4 text-[11px] sm:text-xs">{name}</span>
    </div>
  );
}
