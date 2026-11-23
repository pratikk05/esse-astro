import { defineQuery } from "groq";

/** Selected Works, in the order set in the Studio (`order`, then oldest first). */
export const WORKS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(coalesce(order, 999) asc, _createdAt asc){
    _id,
    name,
    "slug": slug.current,
    industry,
    platform,
    website,
    cover,
    gallery
  }
`);

/** Journal posts, newest first. */
export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    category,
    excerpt,
    publishedAt,
    readTime,
    theme,
    coverImage,
    body
  }
`);
