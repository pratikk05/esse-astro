// Image parallax via Ukiyo (from Webflow body embed)
import Ukiyo from "ukiyojs";

const images = document.querySelectorAll(".parallax-img");
new Ukiyo(images, {
  scale: 1.2, // 1~2 is recommended
  speed: 1.5, // 1~2 is recommended
  wrapperClass: "ukiyo-wrapper",
  externalRAF: false,
});
