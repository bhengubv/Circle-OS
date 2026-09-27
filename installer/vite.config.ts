import { defineConfig } from 'vite';

// base: './'
//
// GitHub Pages serves this at https://bhengubv.github.io/Circle-OS/ - a
// subpath, not a domain root. Vite's default base of '/' would emit asset
// links like /assets/index-abc.js, which resolve to bhengubv.github.io/assets/
// and 404. The page loads, the script does not, and the installer is a blank
// screen with no error.
//
// Relative paths work at the root and at a subpath, so this also keeps
// `vite preview` and a custom domain working without a second config.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
