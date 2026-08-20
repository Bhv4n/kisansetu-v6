"use client";

import { useState } from "react";
import { getProductImageSrc, getDefaultProductImageSrc } from "@/lib/product-images";

/**
 * Renders a product's image with the shared KISANSETU illustrated-icon
 * treatment. Every image already carries its own circular cream/tan
 * backdrop and soft shadow (baked into the SVG), so this component just
 * needs to size and center it — no extra decorative wrapper box.
 *
 * Falls back to the generic default icon if the mapped image ever fails
 * to load (e.g. a future product added without a matching asset).
 */
export function ProductImage({
  name,
  className = "",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const [src, setSrc] = useState(() => getProductImageSrc(name));

  return (
    <img
      src={src}
      alt={name || "Product"}
      loading="lazy"
      className={`object-contain ${className}`}
      onError={() => setSrc(getDefaultProductImageSrc())}
    />
  );
}
