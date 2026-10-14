import js from '@eslint/js';

export default [
  { ignores: ['node_modules/', 'coverage/', 'data/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { Bun: 'readonly', process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
  {
    files: ['.dependency-cruiser.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable' } },
  },
];
