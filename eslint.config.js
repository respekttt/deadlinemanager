import js from '@eslint/js';

export default [
  { ignores: ['node_modules/', 'coverage/', 'data/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Bun: 'readonly',
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        structuredClone: 'readonly',
        performance: 'readonly',
      },
    },
  },
  {
    // AC-23: помилки ловить лише глобальний setErrorHandler (spec §5)
    files: ['server/routes/**/*.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TryStatement',
          message: 'try/catch у routes заборонено: помилки обробляє setErrorHandler (AC-23).',
        },
      ],
    },
  },
  {
    files: ['.dependency-cruiser.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable' } },
  },
];
