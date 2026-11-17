// Text animations on view.
//  • [data-split]: words rise out of a mask with a slight tilt and blur, staggered.
//  • [data-fade]:  lifts and fades in.
// Both play once when the element reaches 85% down the viewport. Nested markup (<br>, coloured
// <span>s) is preserved; screen readers get the plain text via aria-label.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function split(el) {
  el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  const inners = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName !== "BR") walk(child);
        return;
      }
      if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(" ");
        const word = document.createElement("span");
        word.className = "tr-word";
        word.setAttribute("aria-hidden", "true");
        const inner = document.createElement("span");
        inner.className = "tr-inner";
        inner.textContent = part;
        word.append(inner);
        frag.append(word);
        inners.push(inner);
      });
      child.replaceWith(frag);
    });
  };
  walk(el);
  return inners;
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = split(el);
    gsap.fromTo(
      words,
      { yPercent: 115, rotate: 4, filter: "blur(6px)" },
      {
        yPercent: 0,
        rotate: 0,
        filter: "blur(0px)",
        duration: 1.15,
        ease: "expo.out",
        stagger: 0.045,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      },
    );
  });

  document.querySelectorAll("[data-fade]").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 24, filter: "blur(4px)" },
      {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.1,
        delay: (parseFloat(el.dataset.fade) || 0) * 0.12,
        ease: "power3.out",
        clearProps: "filter,transform",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      },
    );
  });
}
