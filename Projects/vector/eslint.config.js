import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/server/**/*.ts', 'scripts/**/*.{js,ts}', '*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The simulation engine and shared code must stay portable between the browser and Node.
    files: ['packages/sim-core/**/*.ts', 'packages/shared/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'process',
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['node:*', 'react', 'react-dom', 'fastify', 'pg'] },
      ],
    },
  },
  {
    // The simulation must give the same results in every JavaScript engine, so its
    // replays verify anywhere: engine-approximated math goes through math/dmath.ts.
    files: ['packages/sim-core/src/**/*.ts'],
    ignores: ['packages/sim-core/src/**/*.test.ts', 'packages/sim-core/src/math/dmath.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...[
          'sin',
          'cos',
          'tan',
          'asin',
          'acos',
          'atan',
          'atan2',
          'exp',
          'expm1',
          'log',
          'log1p',
          'log2',
          'log10',
          'pow',
          'hypot',
          'cbrt',
          'sinh',
          'cosh',
          'tanh',
          'asinh',
          'acosh',
          'atanh',
        ].map((property) => ({
          object: 'Math',
          property,
          message: `Use dmath.${property} (math/dmath.ts): Math.${property} can differ between JavaScript engines.`,
        })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='**'], AssignmentExpression[operator='**=']",
          message: 'Use dmath.pow: ** can differ between JavaScript engines.',
        },
      ],
    },
  },
  prettier,
);
