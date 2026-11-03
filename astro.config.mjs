// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * FlowScale style guide: available at /style-guide during `astro dev` only.
 * Set STYLE_GUIDE=true to include it in a production build on purpose.
 */
const flowscaleStyleGuide = () => ({
  name: 'flowscale-style-guide',
  hooks: {
    /** @param {{ command: string, injectRoute: (route: { pattern: string, entrypoint: string }) => void }} options */
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev' && process.env.STYLE_GUIDE !== 'true') return;
      injectRoute({ pattern: '/style-guide', entrypoint: './src/style-guide/StyleGuide.astro' });
      injectRoute({ pattern: '/style-guide/preview', entrypoint: './src/style-guide/Preview.astro' });
    },
  },
});

/**
 * `import src from "./x.frag"` (also .vert / .glsl) → the shader as a string, with comments and
 * extra whitespace stripped so the bundle doesn't ship formatting. `#` directives keep their own line.
 */
const glslMinify = () => ({
  name: 'glsl-minify',
  enforce: /** @type {const} */ ('pre'),
  /** @param {string} code @param {string} id */
  transform(code, id) {
    if (!/\.(frag|vert|glsl)$/.test(id)) return;
    const out = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .reduce((acc, l) => acc + (l.startsWith('#') ? `\n${l}\n` : `${l} `), '')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?([{}()\[\];,=*/<>!&|?:]) ?/g, '$1')
      .replace(/\n+/g, '\n')
      .trim();
    return { code: `export default ${JSON.stringify(out)};`, map: null };
  },
});

// https://astro.build/config
export default defineConfig({
  integrations: [flowscaleStyleGuide()],
  vite: {
    plugins: [glslMinify(), tailwindcss()],
  },
});
