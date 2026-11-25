// The services list: rendered by components/sections/Services.astro (desktop list + mobile accordion)
// and driven by uniflow-services/index.js. `model` picks the live 3D scene (service-models.js);
// `image` is that scene's still render (fallback, reduced motion, and the mobile accordion's first frame).
export const services = [
  {
    key: "branding",
    model: "website",
    title: "Branding & Website Design",
    description: "From logo to launch, one look that feels unmistakably yours, carried across your brand, website and marketing.",
    tags: ["Logo & Identity", "Brand Guidelines", "UI/UX Design", "Marketing Assets"],
    image: "/uniflow/img/service-website.webp",
    alt: "3D browser window building itself block by block while a pixel cursor clicks its button",
  },
  {
    key: "development",
    model: "design",
    title: "Web Development",
    description: "Hand over the designs. You'll get back a fast, responsive site in Webflow, Framer or Astro that your team can update without calling us.",
    tags: ["Webflow", "Framer", "Astro", "CMS Setup"],
    image: "/uniflow/img/service-design.webp",
    alt: "3D design frame with a blue selection turning from wireframe into a built component",
  },
  {
    key: "migration",
    model: "migration",
    title: "Website Migration",
    description: "Outgrown WordPress or Wix? Switch to a better platform and keep your content, rankings and momentum.",
    tags: ["Site Audit", "Content Migration", "SEO Redirects", "Launch Support"],
    image: "/uniflow/img/service-migration.webp",
    alt: "3D content blocks hopping from an old grey website window into a new one, with a ranking arrow staying on top",
  },
  {
    key: "retainers",
    model: "support",
    title: "Design & Website Retainers",
    description: "An on-call design and development team for one fixed monthly fee. Send requests as they come up, and we'll keep shipping.",
    tags: ["Ongoing Design", "Development", "Updates", "Priority Support"],
    image: "/uniflow/img/service-support.webp",
    alt: "3D dial filling up around a pixel lightning bolt",
  },
  {
    key: "ecommerce",
    model: "ecommerce",
    title: "Ecommerce Stores",
    description: "Product pages people linger on, and a checkout they actually finish. Built on Shopify or Webflow.",
    tags: ["Shopify", "Webflow Ecommerce", "Checkout UX", "Integrations"],
    image: "/uniflow/img/service-ecommerce.webp",
    alt: "Frosted-glass shopping cart with products dropping into its basket",
  },
  {
    key: "webapps",
    model: "webapp",
    title: "Web Applications",
    description: "Portals, dashboards and custom tools that feel simple to the people using them every day.",
    tags: ["Product Scoping", "UX for Complex Flows", "MVP Builds", "APIs"],
    image: "/uniflow/img/service-webapp.webp",
    alt: "3D dashboard with a sidebar, stat tiles and a live bar chart",
  },
  {
    key: "immersive",
    model: "immersive",
    title: "3D & Immersive Experiences",
    description: "For ideas a flat page can't hold: 3D product views, scroll-driven stories and interactions people want to explore.",
    tags: ["Three.js", "WebGL", "GSAP", "3D Product Views"],
    image: "/uniflow/img/service-immersive.webp",
    alt: "3D voxel planet with ripples across its surface and an orbiting blue moon",
  },
];

/** Mobile accordion: the row that starts open. */
export const MOBILE_OPEN = 0;
