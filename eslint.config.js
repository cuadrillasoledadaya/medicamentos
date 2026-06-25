import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'supabase/.temp/',
      'supabase/functions/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'playwright.config.ts',
            'vite.config.ts',
            'vitest.config.ts',
            'tests/setup.ts',
            'tests/e2e/*.spec.ts',
            'tests/e2e/global-setup.ts',
            'src/sw.ts',
          ],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2025,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Disable base ESLint rules that conflict with TypeScript
      'no-undef': 'off',
      'no-unused-vars': 'off',
      // TypeScript-eslint rules
      ...tsPlugin.configs['flat/recommended'].rules,
      ...tsPlugin.configs['flat/recommended-type-checked'].rules,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // React globals for JSX files
  {
    files: ['**/*.tsx'],
    languageOptions: {
      globals: {
        React: 'readonly',
      },
    },
  },
  // Service Worker globals
  {
    files: ['src/sw.ts'],
    languageOptions: {
      globals: {
        workbox: 'readonly',
        TimestampTrigger: 'readonly',
        self: 'readonly',
      },
    },
  },
  // Web Worker globals
  {
    files: ['src/workers/*.ts'],
    languageOptions: {
      globals: {
        self: 'readonly',
      },
    },
  },
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
