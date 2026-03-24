/**
 * Smooth-scroll so `element` aligns near the top of the viewport while leaving
 * `offsetPx` room (nav / tabs). Avoids `scrollIntoView({ block: "start" })`
 * clipping headers or tab bars.
 */
export function scrollToElementWithOffset(element: HTMLElement | null, offsetPx: number) {
  if (typeof window === "undefined" || !element) return
  const rect = element.getBoundingClientRect()
  const top = rect.top + window.scrollY - offsetPx
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
}
