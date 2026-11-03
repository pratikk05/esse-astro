// Logo marquee — GSAP ticker driven, infinite, draggable.
//  • Scroll down → moves left, scroll up → moves right (direction follows the last scroll)
//  • Scroll velocity boosts speed, then eases back to the cruising speed
//  • Drag with mouse/touch; release keeps the throw momentum
//  • Subtle velocity skew, slows on hover, pauses when off-screen
import gsap from "gsap";

const BASE_SPEED = 55; // px per second (cruising)
const SCROLL_BOOST = 0.15; // px/s added per px/frame of scroll velocity (kept subtle)
const MAX_BOOST = BASE_SPEED * 3; // scroll can add at most 3× cruising speed (~220px/s total)
const MAX_SPEED = 2400; // px/s cap for drag throws
const HOVER_FACTOR = 0.35; // cruising speed multiplier while hovered
const MAX_SKEW = 2; // degrees

function initMarquee(root) {
  const track = root.querySelector("[data-marquee-track]");
  const set = root.querySelector("[data-marquee-set]");
  if (!track || !set || root.dataset.marqueeReady) return;
  root.dataset.marqueeReady = "true";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let setWidth = 0;

  // Clone the logo set until the track covers the viewport twice over (seamless wrap at any width).
  function fill() {
    track.querySelectorAll("[data-marquee-clone]").forEach((n) => n.remove());
    setWidth = set.getBoundingClientRect().width;
    if (!setWidth) return;
    const needed = Math.ceil((window.innerWidth * 2) / setWidth) + 1;
    for (let i = 1; i < needed; i++) {
      const clone = set.cloneNode(true);
      clone.setAttribute("data-marquee-clone", "");
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
  }
  fill();

  const wrap = () => gsap.utils.wrap(-setWidth, 0);
  let wrapX = wrap();
  const setX = gsap.quickSetter(track, "x", "px");
  const setSkew = gsap.quickSetter(track, "skewX", "deg");

  let x = 0;
  let direction = -1; // -1 = left, 1 = right
  let boost = 0; // extra px/s from scroll (eased toward boostTarget)
  let boostTarget = 0; // decays every frame
  let hoverFactor = 1;
  let visible = true;

  // Drag state
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerT = 0;
  let throwVelocity = 0; // px/s from drag release (decays)

  // ---- Scroll: direction + velocity boost ----
  const onScroll = (velocity, dir) => {
    if (dir) direction = dir > 0 ? -1 : 1;
    boostTarget = Math.min(MAX_BOOST, Math.max(boostTarget, Math.abs(velocity) * SCROLL_BOOST * 60));
  };
  if (window.lenis) {
    window.lenis.on("scroll", ({ velocity, direction: dir }) => onScroll(velocity, dir));
  } else {
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      onScroll(dy, Math.sign(dy));
    }, { passive: true });
  }

  // ---- Drag ----
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    throwVelocity = 0;
    lastPointerX = e.clientX;
    lastPointerT = performance.now();
    root.setPointerCapture(e.pointerId);
    root.classList.add("is-dragging");
  });
  root.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastPointerX;
    const dt = Math.max(1, now - lastPointerT);
    x += dx;
    // Smoothed pointer velocity (px/s) for the release throw
    throwVelocity = gsap.utils.interpolate(throwVelocity, (dx / dt) * 1000, 0.6);
    if (Math.abs(dx) > 0.5) direction = dx < 0 ? -1 : 1;
    lastPointerX = e.clientX;
    lastPointerT = now;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove("is-dragging");
    if (root.hasPointerCapture?.(e.pointerId)) root.releasePointerCapture(e.pointerId);
    // Drop stale velocity if the pointer paused before release
    if (performance.now() - lastPointerT > 80) throwVelocity = 0;
    throwVelocity = gsap.utils.clamp(-MAX_SPEED, MAX_SPEED, throwVelocity);
  };
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);
  root.addEventListener("dragstart", (e) => e.preventDefault());

  // ---- Hover slow-down (eased) ----
  root.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && gsap.to({ v: hoverFactor }, { v: HOVER_FACTOR, duration: 0.8, ease: "power3.out", onUpdate() { hoverFactor = this.targets()[0].v; } }));
  root.addEventListener("pointerleave", () => gsap.to({ v: hoverFactor }, { v: 1, duration: 0.8, ease: "power3.out", onUpdate() { hoverFactor = this.targets()[0].v; } }));

  // ---- Pause off-screen ----
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: "100px" }).observe(root);

  // ---- Main loop ----
  let skew = 0;
  gsap.ticker.add((_time, deltaMs) => {
    if (!visible || !setWidth) return;
    const dt = Math.min(deltaMs, 50) / 1000; // clamp long frames (tab switches)
    const frameDecay = Math.pow(0.04, dt); // ~96% decay per second

    let velocity = 0; // px/s this frame
    if (!dragging) {
      const cruise = reduced ? 0 : BASE_SPEED * hoverFactor;
      velocity = direction * (cruise + (reduced ? 0 : boost)) + throwVelocity;
      x += velocity * dt;
      throwVelocity *= frameDecay;
      if (Math.abs(throwVelocity) < 1) throwVelocity = 0;
    } else {
      velocity = throwVelocity;
    }
    // Ease the boost in/out so speed changes feel gradual, not jumpy
    boostTarget *= Math.pow(0.25, dt);
    boost += (boostTarget - boost) * Math.min(1, dt * 3);

    x = wrapX(x);
    setX(x);

    // Velocity skew (eased), off for reduced motion
    const targetSkew = reduced ? 0 : gsap.utils.clamp(-MAX_SKEW, MAX_SKEW, (velocity / (BASE_SPEED + MAX_BOOST)) * MAX_SKEW);
    skew += (targetSkew - skew) * Math.min(1, dt * 8);
    setSkew(skew);
  });

  // Rebuild clones on resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fill();
      wrapX = wrap();
    }, 150);
  });
}

document.querySelectorAll("[data-logo-marquee]").forEach(initMarquee);
