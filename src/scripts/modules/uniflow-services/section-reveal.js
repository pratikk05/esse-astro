import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";

// Mechanically copied destination-hero exit from captured runtime-0.js.
// Root/trigger bindings are adapted. Artwork scale is fixed at 1 by user request.
function applyRedDotExit(root,exitTrigger){
 const o=gsap;
  const e = root;
  if (e) {
    const t = e.querySelector(".destinationsHero__images"),
      n = e.querySelector(".hero__main");
    o.to(e, {
      backgroundColor: "#efeeed",
      ease: "none",
      scrollTrigger: {
        trigger: exitTrigger,
        start: "top top",
        end: "bottom top",
        scrub: !0
      }
    }), o.to(t, {
      yPercent: 100,
      autoAlpha: 0,
      scale: 1,
      filter: "blur(16px)",
      backgroundColor: "#efeeed",
      ease: "none",
      scrollTrigger: {
        trigger: exitTrigger,
        start: "top top",
        end: "bottom top",
        scrub: !0
      }
    }), o.to(n, {
      autoAlpha: 0,
      filter: "blur(10px)",
      ease: "none",
      scrollTrigger: {
        trigger: exitTrigger,
        start: "top top",
        end: "bottom 50%",
        scrub: !0
      }
    })
  }
}


export function createSectionReveal(root,camera){
 const trigger=root.querySelector('.red-dot-exit-trigger');
 if(!trigger)throw Error('Red Dot exit trigger missing');
  gsap.registerPlugin(ScrollTrigger);
 let context=null,key='';
 function resize(offset,on){
  trigger.style.top=offset+'px';
  const next=[offset,innerWidth,innerHeight,on].join(':');
  if(next===key)return;key=next;
  context?.revert();context=null;
  if(on){context=gsap.context(()=>applyRedDotExit(camera,trigger),root);ScrollTrigger.refresh();}
 }
 return {resize,update(){ScrollTrigger.update();},destroy(){context?.revert();trigger.style.removeProperty('top');}};
}
