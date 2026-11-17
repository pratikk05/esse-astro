// Cinematic section overlap (Hero → logos, FAQ → CTA).
//  • [data-overlap-under] (="plain": no pixel edge, just blur + dim — used by the hero): pins when its bottom reaches the viewport bottom and sinks back
//    (scale down, drift up, dim, blur) while the next section slides over it.
//  • [data-overlap-over]: rides above with a dithered pixel edge in its own colour that
//    fills in as it covers the section underneath (same look as About → Stats).
// Reduced motion: nothing here runs; sections simply scroll.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REST_PROPS = "transform,filter,opacity,transformOrigin,translate,rotate,scale";
const CELL = 8; // px per dither cell
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const clamp = (v) => Math.min(1, Math.max(0, v));
const hash = (x) => {
  const s = Math.sin(x * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
// Smooth 1D value noise for the wavy edge
const wave = (x) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};

function pixelEdge(over) {
  const canvas = document.createElement("canvas");
  canvas.className = "overlap-edge";
  canvas.setAttribute("aria-hidden", "true");
  over.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, color = "#fff", last = -1;

  const resize = () => {
    dpr = Math.min(devicePixelRatio, 2);
    w = over.clientWidth;
    h = Math.round(canvas.clientHeight);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    color = getComputedStyle(over).backgroundColor;
    last = -1;
  };

  const draw = (p) => {
    if (Math.abs(p - last) < 0.002) return;
    last = p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    const front = p * 1.35; // how far up the band the pixels have climbed
    for (let c = 0; c < cols; c++) {
      const bump = wave(c * 0.045) * 0.28 + wave(c * 0.13 + 9) * 0.1;
      for (let r = 0; r < rows; r++) {
        const fromBottom = 1 - (r + 0.5) / rows; // 0 at the section edge, 1 at the top of the band
        const density = clamp((front - fromBottom - bump + 0.15) * 2.6);
        if (density <= BAYER[(r & 3) * 4 + (c & 3)]) continue;
        // Sparse: small 3px dots. Dense: cells grow until they merge into a solid fill.
        const grow = clamp((density - 0.55) / 0.4);
        const size = grow >= 1 ? CELL : Math.round(3 + (CELL - 3) * grow * grow);
        const off = Math.floor((CELL - size) / 2);
        ctx.fillRect(c * CELL + off, r * CELL + off, size, size);
      }
    }
  };

  resize();
  addEventListener("resize", resize);
  return { draw, resize };
}

function initPair(under) {
  const over = under.nextElementSibling;
  if (!over) return;
  over.classList.add("overlap-over");
  under.classList.add("overlap-under");
  if (under.dataset.overlapUnder === "plain") under.classList.add("overlap-sticky");
  // Animate the children, not the section, so its own background never shrinks to show the page behind.
  const plain = under.dataset.overlapUnder === "plain";
  // Hero ("plain"): nothing on the section is transformed or filtered (any filter on the copy makes Chrome
  // composite it translucent over the WebGL gradient). The copy blurs via stacked text-shadows
  // (--overlap-blur) while its sharp core fades (--overlap-core), staying white; the background stays sharp.
  const inner = plain ? [] : [...under.children];
  const edge = plain ? null : pixelEdge(over);

  // Pin the outgoing section for one viewport; the next one slides over it.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: under,
      start: () => (under.offsetHeight > innerHeight ? "bottom bottom" : "top top"),
      end: "+=100%",
      // The hero (fits the viewport) just sticks via CSS; GSAP's fixed-position pin washed out its copy.
      pin: !plain,
      pinSpacing: false,
      scrub: true,
      invalidateOnRefresh: true,
      // At rest, drop the inline transform/filter/opacity entirely: even neutral values create stacking
      // contexts that wash out the hero copy over its gradient.
      onLeaveBack: () => gsap.set(inner, { clearProps: REST_PROPS }),
      // A sticky hero stays stuck behind the rest of <main>; hide it once fully covered so it never
      // shows through transparent sections further down (Process).
      onLeave: () => plain && (under.style.visibility = "hidden"),
      onEnterBack: () => plain && (under.style.visibility = ""),
      onUpdate: (st) => {
        if (!plain) return;
        const b = Math.sqrt(st.progress) * 16; // builds fast, up to 16px
        under.style.setProperty("--overlap-blur", `${b.toFixed(2)}px`);
        // Sharp glyph core fades out over the first ~1.5px of blur, so what's left is the blurred copy.
        under.style.setProperty("--overlap-core", Math.max(0, 1 - b / 2).toFixed(3));
      },
      onRefresh: (st) => st.progress === 0 && gsap.set(inner, { clearProps: REST_PROPS }),
    },
  });
  // fromTo with explicit start values: tweening from `filter: none` makes GSAP start at brightness(0),
  // and the preloader's opacity:0 must not be captured as the start.
  if (inner.length) tl.fromTo(inner, { scale: 1, y: 0, filter: "blur(0px) brightness(1)", opacity: 1 }, {
    scale: 0.9,
    y: () => -innerHeight * 0.08,
    filter: "blur(6px) brightness(1)",
    opacity: 0.55,
    transformOrigin: "50% 100%",
    ease: "none",
  }, 0);
  else tl.to({}, { duration: 1 }); // keeps the scrubbed trigger alive for onUpdate

  if (!edge) return;
  // Pixel edge: fills while the incoming section travels from the viewport bottom to the top.
  ScrollTrigger.create({
    trigger: over,
    start: "top bottom",
    end: "top top",
    onUpdate: (st) => edge.draw(st.progress),
    onRefresh: (st) => {
      edge.resize();
      edge.draw(st.progress);
    },
  });
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("[data-overlap-under]").forEach(initPair);
  // Content above (fonts, lazy sections, iframes) shifts heights — keep pin positions true.
  let t;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.body);
}
