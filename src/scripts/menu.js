// Site menu — GSAP open/close timeline for the navbar menu (Navbar.astro).
// Desktop (>= 992px): card reveals downward from behind the CTA buttons.
// Mobile: full-screen white panel reveals from the top; logo + toggle swap to the dark versions.
import gsap from "gsap";

const DESKTOP = "(min-width: 62rem)";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initMenu(root) {
  const toggle = root.querySelector("[data-menu-toggle]");
  const panel = root.querySelector("[data-menu-panel]");
  if (!toggle || !panel || root.dataset.menuReady) return;
  root.dataset.menuReady = "true";

  const q = (sel) => [...root.querySelectorAll(sel)];
  const iconClosed = root.querySelector("[data-menu-icon-closed]");
  const iconOpen = root.querySelector("[data-menu-icon-open]");
  const cta = root.querySelector("[data-menu-cta]");
  const logoDark = root.querySelector(".menu-logo");
  const logoLight = root.querySelector(".nav-logo-light");
  const items = q("[data-menu-item]");
  const dividers = q("[data-menu-divider]");
  const socials = q("[data-menu-social]");
  const mobileCta = root.querySelector("[data-menu-mobile-cta]");
  const main = document.querySelector("main");

  let isOpen = false;
  let tl = null;

  // Build the timeline for the current breakpoint (rebuilt on breakpoint change).
  function build() {
    const desktop = window.matchMedia(DESKTOP).matches;
    tl?.kill();
    gsap.set([panel, iconOpen, iconClosed, logoDark, logoLight, cta, items, dividers, socials, mobileCta].flat().filter(Boolean), {
      clearProps: "all",
    });

    tl = gsap.timeline({
      paused: true,
      defaults: { ease: "expo.out" },
      onReverseComplete: () => gsap.set(panel, { visibility: "hidden" }),
    });

    tl.set(panel, { visibility: "visible" })
      // Panel reveal
      .fromTo(
        panel,
        { clipPath: desktop ? "inset(0% 0% 100% 0% round 4px)" : "inset(0% 0% 100% 0%)" },
        { clipPath: desktop ? "inset(0% 0% 0% 0% round 4px)" : "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" },
        0,
      )
      // Toggle: hamburger → X
      .to(iconClosed, { opacity: 0, rotate: 90, scale: 0.6, duration: 0.35, ease: "power2.in" }, 0)
      .fromTo(iconOpen, { opacity: 0, rotate: -90, scale: 0.6 }, { opacity: 1, rotate: 0, scale: 1, duration: 0.6 }, 0.25);

    if (desktop && cta) {
      // START A PROJECT: white → black (Figma open state)
      tl.to(cta, { backgroundColor: "#000", borderColor: "#000", color: "#fff", borderRadius: 4, duration: 0.5, ease: "power2.out" }, 0.1);
    }
    if (!desktop) {
      // Logo: light → dark over the white panel
      tl.to(logoLight, { opacity: 0, duration: 0.3, ease: "power1.out" }, 0.35).fromTo(logoDark, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0.35);
    }

    // Content: masked line reveal, dividers draw in, socials pop
    tl.fromTo(items, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.045 }, 0.35)
      .fromTo(dividers, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.9, stagger: 0.08, ease: "expo.inOut" }, 0.4)
      .fromTo(socials, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06 }, 0.6);
    if (!desktop && mobileCta) {
      tl.fromTo(mobileCta, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.55);
    }

    if (reducedMotion.matches) tl.timeScale(20);
    if (isOpen) tl.progress(1);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.inert = false;
    if (main) main.inert = true;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    document.documentElement.classList.add("is-menu-open");
    window.lenis?.stop();
    tl.timeScale(reducedMotion.matches ? 20 : 1).play();
    // Move focus into the menu once the first links are visible
    gsap.delayedCall(reducedMotion.matches ? 0 : 0.4, () => panel.querySelector("[data-menu-link]")?.focus({ preventScroll: true }));
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return Promise.resolve();
    isOpen = false;
    panel.inert = true;
    if (main) main.inert = false;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    document.documentElement.classList.remove("is-menu-open");
    window.lenis?.start();
    if (restoreFocus) toggle.focus({ preventScroll: true });
    // Close a bit faster than open
    tl.timeScale(reducedMotion.matches ? 20 : 1.6).reverse();
    return new Promise((resolve) => gsap.delayedCall(tl.time() / tl.timeScale(), resolve));
  }

  toggle.addEventListener("click", () => (isOpen ? close() : open()));

  // Links: close first, then smooth-scroll to in-page targets
  root.querySelectorAll("[data-menu-link]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      const href = link.getAttribute("href") ?? "";
      if (!href.startsWith("#")) return;
      event.preventDefault();
      if (href === "#") {
        await close();
        return;
      }
      await close({ restoreFocus: false });
      const target = href === "#top" ? 0 : document.querySelector(href);
      if (target === null) return;
      if (window.lenis) window.lenis.scrollTo(target, { duration: 1.4 });
      else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Escape closes; click outside the desktop card closes
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) close();
  });
  document.addEventListener("pointerdown", (event) => {
    if (isOpen && !panel.contains(event.target) && !toggle.contains(event.target) && window.matchMedia(DESKTOP).matches) {
      close({ restoreFocus: false });
    }
  });

  window.matchMedia(DESKTOP).addEventListener("change", build);
  build();
}

// Live IST clock in the navbar: "[ 2.30PM ]"
function initClock() {
  const el = document.querySelector("[data-ist-clock]");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
  const tick = () => {
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    el.textContent = `[ ${parts.hour}.${parts.minute}${parts.dayPeriod} ]`;
    el.setAttribute("datetime", new Date().toISOString());
  };
  tick();
  setInterval(tick, 15_000);
}

document.querySelectorAll("[data-menu-root]").forEach(initMenu);
initClock();
