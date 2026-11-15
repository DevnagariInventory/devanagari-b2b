"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BookCover from "./BookCover";
import { productImageUrl } from "@/lib/media";

/** Large photo with thumbnails and arrows, like a shop product page. */
export default function ProductGallery({ name, images }: { name: string; images: string[] }) {
  const [active, setActive] = useState(0);
  const count = images.length;
  const go = (d: number) => setActive((i) => (i + d + count) % count);

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse lg:justify-end">
      {/* On desktop the photo's height follows the window so the whole photo is visible without scrolling. */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-muted sm:flex-1 lg:h-[clamp(320px,calc(100dvh-15rem),640px)] lg:w-auto lg:flex-none">
        {count > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={productImageUrl(images[active], 900)} alt={`${name} — photo ${active + 1}`} className="h-full w-full object-contain bg-white" />
            {count > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow hover:bg-card"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow hover:bg-card"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </>
        ) : (
          <BookCover name={name} cover={null} className="h-full w-full !text-lg" />
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto sm:w-[72px] sm:flex-col sm:overflow-x-visible lg:max-h-[clamp(320px,calc(100dvh-15rem),640px)] lg:overflow-y-auto">
          {images.map((f, i) => (
            <button
              key={f}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg border-2 sm:w-full ${
                i === active ? "border-primary" : "border-border opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageUrl(f, 200)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
