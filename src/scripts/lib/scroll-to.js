// Smooth-scroll to an element (or 0 for the top): through Lenis when it's running, native otherwise.
// Shared by the menu links and the hero's "Scroll to explore".
export function scrollToTarget(target, { duration = 1.4 } = {}) {
  if (target == null) return;
  if (window.lenis) window.lenis.scrollTo(target, { duration });
  else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
  else target.scrollIntoView({ behavior: "smooth" });
}
