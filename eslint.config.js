import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...globals.webextensions } },
    rules: {
      // content.js deliberately swallows errors from X's DOM changing under it
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }]
    }
  },
  {
    files: ['eslint.config.js', 'playwright.config.js', 'tests/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.node }
  }
];
