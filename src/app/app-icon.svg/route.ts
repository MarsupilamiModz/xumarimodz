import { colors } from "@/styles/tokens";

/** Standard-Favicon: flache Akzentfläche mit „X“, wie die Logo-Komponente. */
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${colors.violet}"/><text x="64" y="90" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="76" font-weight="800" fill="${colors.onViolet}">X</text></svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
