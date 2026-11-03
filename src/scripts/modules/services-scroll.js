// Service list ↔ image crossfade driven by scroll, with a soft click sound on change.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function initServices() {
  const wrapper = document.querySelector(".s-t-wrapper");
  const services = [...document.querySelectorAll(".service_block")];
  const imageBlocks = [...document.querySelectorAll(".s-image-block")];

  if (!wrapper || !services.length || !imageBlocks.length) return;

  const items = imageBlocks.map(block => ({
    image: block.querySelector(".s-image-wrapper .image-full"),
    content: block.querySelector(".s-conten-wrap")
  }));

  // Native <audio> instead of Howler: one short click sound doesn't need a library.
  const VOLUME = 0.18;
  const sound = new Audio("/audio/mixkit-modern-technology-select-3124.mp3");
  sound.preload = "auto";
  sound.volume = VOLUME;

  let audioUnlocked = false;
  let activeIndex = -1;
  let targetIndex = 0;
  let resistanceTween = null;

  // Browsers block audio until a user gesture; play once muted to unlock it.
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    sound.muted = true;
    sound.play().then(() => {
      sound.pause();
      sound.currentTime = 0;
      sound.muted = false;
    }).catch(() => (audioUnlocked = false));
  }

  document.addEventListener("click", unlockAudio, { once: true });

  document.addEventListener("touchstart", unlockAudio, {
    once: true,
    passive: true
  });

  items.forEach((item, i) => {

    if (item.image) {
      gsap.set(item.image, {
        autoAlpha: i === 0 ? 1 : 0,
        scale: i === 0 ? 1 : 1.025,
        transformOrigin: "50% 50%",
        force3D: true
      });
    }

    if (item.content) {
      gsap.set(item.content, {
        autoAlpha: i === 0 ? 1 : 0
      });
    }

  });

  function setActive(index) {
    if (index === activeIndex) return;

    const previous = activeIndex;
    activeIndex = index;

    services.forEach((service, i) => {

      const active = i === index;

      service.classList.toggle(
        "is-active",
        active
      );

      gsap.to(service, {
        y: 0,
        opacity: active ? 1 : 0.55,
        duration: active ? 0.7 : 0.5,
        ease: active ?
          "power3.out" : "power2.out",
        overwrite: true
      });

    });

    items.forEach((item, i) => {

      const active = i === index;

      if (item.image) {

        gsap.to(item.image, {
          autoAlpha: active ? 1 : 0,
          scale: active ? 1 : 1.025,
          duration: active ? 0.55 : 0.4,
          ease: active ?
            "power3.out" : "power2.inOut",
          overwrite: true,
          force3D: true
        });

      }

      if (item.content) {

        gsap.to(item.content, {
          autoAlpha: active ? 1 : 0,
          duration: active ? 0.45 : 0.3,
          ease: "power2.out",
          overwrite: true
        });

      }

    });

    if (previous !== -1 && audioUnlocked) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function updateActive() {

    const center =
      window.innerHeight / 2;

    let closest = 0;
    let distance = Infinity;

    services.forEach((service, i) => {

      const rect =
        service.getBoundingClientRect();

      const d = Math.abs(
        rect.top +
        rect.height / 2 -
        center
      );

      if (d < distance) {
        distance = d;
        closest = i;
      }

    });

    if (closest === targetIndex) return;

    targetIndex = closest;

    if (resistanceTween) {
      resistanceTween.kill();
    }

    resistanceTween = gsap.to({ value: activeIndex },
    {
      value: targetIndex,
      duration: 0.12,
      ease: "power2.out",
      overwrite: true,
      onUpdate: function () {
        const value =
          Math.round(this.targets()[0].value);

        if (value !== activeIndex) {
          setActive(value);
        }
      }
    });
  }

  ScrollTrigger.create({
    trigger: wrapper,
    start: "top bottom",
    end: "bottom top",
    onEnter: updateActive,
    onEnterBack: updateActive,
    onUpdate: updateActive,
    onLeave: updateActive,
    onLeaveBack: updateActive
  });

  updateActive();

  ScrollTrigger.refresh();
}

initServices();


