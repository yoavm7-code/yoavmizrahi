// ESLint for the whole repository: correctness rules only (unused and undefined names, unreachable
// code and the like), no formatting rules. Lives here so the site itself has no dependencies.
// Run from tests/:  npm run lint   (it lints from the repository root with this config)
import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  { ignores: ['**/node_modules/**', '_site/**', 'tests/test-results/**', 'tests/playwright-report/**'] },

  { files: ['**/*.js', '**/*.mjs'], ...js.configs.recommended },

  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      // `_` and catch bindings mark values left unused on purpose.
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-var': 'off',
      eqeqeq: ['error', 'smart'],
      'no-implicit-globals': 'error'
    }
  },

  // The site's two classic scripts, loaded with <script>, not as modules.
  { files: ['js/main.js', 'js/desk-layout.js', 'admin/rescue.js'], languageOptions: { sourceType: 'script', globals: { ...globals.browser } } },

  // Browser modules: the renderer and schema (also imported by Node), the admin and the replicas.
  { files: ['js/render.js', 'js/schema.js', 'admin/**/*.js', 'demos/**/*.js'], languageOptions: { sourceType: 'module', globals: { ...globals.browser } } },

  // The login server, on Cloudflare Workers.
  { files: ['worker/src/**/*.js'], languageOptions: { sourceType: 'module', globals: { ...globals.serviceworker } } },

  // Node: tools, tests and their helpers. Browser tests also pass functions into the page.
  { files: ['tools/**/*.mjs', 'tests/**/*.mjs', 'worker/test/**/*.js'], languageOptions: { sourceType: 'module', globals: { ...globals.node } } },
  { files: ['tests/browser/**/*.mjs', 'tests/record-demos.mjs', 'tests/share-images.mjs'], languageOptions: { globals: { ...globals.browser, ...globals.node } } }
]);
