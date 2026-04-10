import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Inject <link rel="preload"> tags for the bundled .woff2 files into
// index.html during build. The browser then fetches fonts in parallel with
// HTML parsing, well before the CSS is evaluated, so font-display: block
// has nothing to wait for in practice.
function preloadFonts() {
  return {
    name: 'preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const fontFiles = Object.keys(ctx.bundle || {})
          .filter((k) => k.endsWith('.woff2'));
        if (fontFiles.length === 0) return html;
        const tags = fontFiles
          .map((f) => `    <link rel="preload" href="/dnd-stat-simulator/${f}" as="font" type="font/woff2" crossorigin>`)
          .join('\n');
        return html.replace('</title>', `</title>\n${tags}`);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadFonts()],
  base: '/dnd-stat-simulator/', // For GitHub Pages deployment
})
