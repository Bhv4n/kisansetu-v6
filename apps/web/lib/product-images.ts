/**
 * Product → image mapping.
 *
 * This is the single source of truth for product imagery. Adding a new
 * product image later means: (1) drop a new /public/products/<slug>.svg
 * file, (2) add one line here. No component should ever branch on a
 * product name directly (no `if (name === "Cabbage")` anywhere in the UI) —
 * everything goes through getProductImageSrc().
 */

const PRODUCT_IMAGE_SLUGS: Record<string, string> = {
  "Cotton": "cotton",
  "Mustard": "mustard",
  "Sugarcane": "sugarcane",
  "Sunflower": "sunflower",
  "Alphonso Mango": "alphonso-mango",
  "Banana": "banana",
  "Grapes": "grapes",
  "Guava": "guava",
  "Orange": "orange",
  "Papaya": "papaya",
  "Pomegranate": "pomegranate",
  "Bajra": "bajra",
  "Barley": "barley",
  "Basmati Rice": "basmati-rice",
  "Jowar": "jowar",
  "Maize": "maize",
  "Soybean": "soybean",
  "Wheat": "wheat",
  "Chana Dal": "chana-dal",
  "Masoor Dal": "masoor-dal",
  "Toor Dal (Arhar)": "toor-dal-arhar",
  "Urad Dal": "urad-dal",
  "Black Pepper": "black-pepper",
  "Cardamom": "cardamom",
  "Ginger": "ginger",
  "Turmeric": "turmeric",
  "Beetroot": "beetroot",
  "Bitter Gourd": "bitter-gourd",
  "Bottle Gourd": "bottle-gourd",
  "Brinjal": "brinjal",
  "Cabbage": "cabbage",
  "Capsicum": "capsicum",
  "Carrot": "carrot",
  "Cauliflower": "cauliflower",
  "Green Chilli": "green-chilli",
  "Okra": "okra",
  "Potato": "potato",
  "Spinach": "spinach",
  "Tomato": "tomato",
};

const DEFAULT_SLUG = "_default";

// Case-insensitive lookup index, built once from PRODUCT_IMAGE_SLUGS above.
const LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(PRODUCT_IMAGE_SLUGS).map(([name, slug]) => [name.trim().toLowerCase(), slug])
);

/**
 * Returns the local image path for a product name. Falls back to a generic
 * (but still on-brand) sprout icon for any product not yet mapped, so the
 * UI never shows a broken image or an empty box.
 */
export function getProductImageSrc(productName: string | null | undefined): string {
  if (!productName) return `/products/${DEFAULT_SLUG}.svg`;
  const slug = LOOKUP[productName.trim().toLowerCase()];
  return `/products/${slug || DEFAULT_SLUG}.svg`;
}

export function getDefaultProductImageSrc(): string {
  return `/products/${DEFAULT_SLUG}.svg`;
}
