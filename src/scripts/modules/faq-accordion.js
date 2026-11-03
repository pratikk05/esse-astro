// FAQ accordion: GSAP height tweens + a pixel-dissolve +/− icon drawn on a 16×16 canvas.
// Icon colour: nearest data-ink (defaults to black).
import gsap from "gsap";
import { inkOf } from "../lib/particles.js";

(() => {
  function initFAQAccordion() {

    document.querySelectorAll(".faq-wrapper").forEach((wrapper) => {
      if (wrapper.dataset.faqInitialized === "true") return;
      wrapper.dataset.faqInitialized = "true";

      const items = [...wrapper.querySelectorAll(".faq-block")];
      const states = new Map();

      const OPEN_DURATION = 0.45;
      const ICON_DURATION = 0.3;
      const EASE = "power3.inOut";

      function createDitherIcon(iconWrapper, initialOpen) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.setAttribute("aria-hidden", "true");

        Object.assign(canvas.style, {
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
          imageRendering: "pixelated"
        });

        iconWrapper.appendChild(canvas);

        const GRID = 16;
        const plus = [];
        const minus = [];
        const thresholds = [];

        for (let y = 0; y < GRID; y++) {
          for (let x = 0; x < GRID; x++) {
            plus.push(
              (y === 7 || y === 8) || (x === 7 || x === 8)
            );
            minus.push(y === 7 || y === 8);
            thresholds.push(Math.random());
          }
        }

        const ink = inkOf(iconWrapper);
        let progress = initialOpen ? 1 : 0;
        let animation = null;

        function draw(value) {
          progress = value;
          ctx.clearRect(0, 0, GRID, GRID);
          ctx.fillStyle = ink;

          for (let i = 0; i < GRID * GRID; i++) {
            const oldPixel = plus[i];
            const newPixel = minus[i];

            let visible = false;

            if (oldPixel && newPixel) {
              visible = true;
            } else if (oldPixel && !newPixel) {
              visible = value < thresholds[i];
            } else if (!oldPixel && newPixel) {
              visible = value >= thresholds[i];
            }

            if (visible) ctx.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
          }
        }

        function resize() {
          const rect = iconWrapper.getBoundingClientRect();
          if (!rect.width || !rect.height) return;

          const dpr = Math.min(window.devicePixelRatio || 1, 2);

          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);

          ctx.setTransform(
            canvas.width / GRID,
            0,
            0,
            canvas.height / GRID,
            0,
            0
          );

          ctx.imageSmoothingEnabled = false;
          draw(progress);
        }

        function setOpen(open) {
          if (animation) animation.kill();

          // Randomize pixel order for each transition.
          for (let i = thresholds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [thresholds[i], thresholds[j]] = [thresholds[j], thresholds[i]];
          }

          animation = gsap.to({ value: progress },
          {
            value: open ? 1 : 0,
            duration: ICON_DURATION,
            ease: "power2.inOut",
            onUpdate: function () {
              draw(this.targets()[0].value);
            }
          });
        }

        resize();

        const observer = new ResizeObserver(resize);
        observer.observe(iconWrapper);

        return {
          setOpen,
          destroy() {
            observer.disconnect();
            if (animation) animation.kill();
            canvas.remove();
          }
        };
      }

      // Initialize each accordion.
      items.forEach((item, index) => {
        const head = item.querySelector(".faq-block-head");
        const answer = item.querySelector(".faq-hidden-block");
        const iconWrapper = item.querySelector(".faq-icon-wrapper");
        const plusSVG = item.querySelector(".svg-ab-open");
        const minusSVG = item.querySelector(".svg-ab-close");

        if (!head || !answer || !iconWrapper) return;

        const isOpen = index === 0;

        head.setAttribute("role", "button");
        head.setAttribute("tabindex", "0");
        head.setAttribute("aria-expanded", String(isOpen));

        if (!answer.id) {
          answer.id =
            "faq-answer-" + Math.random().toString(36).slice(2, 10);
        }

        head.setAttribute("aria-controls", answer.id);

        // Hide original SVGs; the canvas replaces them.
        if (plusSVG) gsap.set(plusSVG, { display: "none" });
        if (minusSVG) gsap.set(minusSVG, { display: "none" });

        gsap.set(iconWrapper, { position: "relative" });

        gsap.set(answer, {
          height: isOpen ? "auto" : 0,
          autoAlpha: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          overflow: isOpen ? "visible" : "hidden"
        });

        const icon = createDitherIcon(iconWrapper, isOpen);

        states.set(item, {
          head,
          answer,
          icon,
          isOpen,
          tween: null
        });

        item.style.cursor = "pointer";
      });

      function animateItem(item, opening) {
        const state = states.get(item);
        if (!state) return;

        const answer = state.answer;

        if (state.tween) state.tween.kill();

        state.isOpen = opening;
        state.head.setAttribute("aria-expanded", String(opening));

        gsap.killTweensOf(answer);

        if (opening) {
          gsap.set(answer, {
            visibility: "visible",
            overflow: "hidden",
            autoAlpha: 1
          });

          state.tween = gsap.fromTo(
            answer,
            {
              height: answer.getBoundingClientRect().height
            },
            {
              height: "auto",
              duration: OPEN_DURATION,
              ease: EASE,
              overwrite: true,
              onComplete: () => {
                if (!state.isOpen) return;

                gsap.set(answer, {
                  height: "auto",
                  overflow: "visible"
                });
              }
            }
          );
        } else {
          const currentHeight = answer.getBoundingClientRect().height;

          state.tween = gsap.fromTo(
            answer,
            {
              height: currentHeight,
              autoAlpha: 1,
              visibility: "visible",
              overflow: "hidden"
            },
            {
              height: 0,
              autoAlpha: 0,
              duration: OPEN_DURATION,
              ease: EASE,
              overwrite: true,
              onComplete: () => {
                if (state.isOpen) return;

                gsap.set(answer, {
                  height: 0,
                  autoAlpha: 0,
                  visibility: "hidden",
                  overflow: "hidden"
                });
              }
            }
          );
        }

        state.icon.setOpen(opening);
      }

      function toggleItem(selectedItem) {
        const selectedState = states.get(selectedItem);
        if (!selectedState) return;

        const shouldOpen = !selectedState.isOpen;

        items.forEach((item) => {
          const state = states.get(item);
          if (!state) return;

          if (item === selectedItem) {
            animateItem(item, shouldOpen);
          } else if (state.isOpen) {
            animateItem(item, false);
          }
        });
      }

      // Clicking anywhere inside a FAQ toggles it.
      items.forEach((item) => {
        const state = states.get(item);
        if (!state) return;

        item.addEventListener("click", (event) => {
          if (
            event.target.closest(
              "a, button, input, textarea, select, label"
            )
          ) {
            return;
          }

          toggleItem(item);
        });

        state.head.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleItem(item);
          }
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFAQAccordion, {
      once: true
    });
  } else {
    initFAQAccordion();
  }
})();


