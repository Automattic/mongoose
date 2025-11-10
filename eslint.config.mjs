import { defineConfig, globalIgnores } from 'eslint/config';
import mochaNoOnly from 'eslint-plugin-mocha-no-only';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';

export default defineConfig([
  globalIgnores([
    '**/tools',
    '**/dist',
    'test/files/*',
    '**/benchmarks',
    '**/*.min.js',
    '**/docs/js/native.js',
    '!**/.*',
    '**/node_modules',
    '**/.git',
    '**/data'
  ]),
  js.configs.recommended,
  // general options
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022, // nodejs 18.0.0,
      sourceType: 'commonjs'
    },
    rules: {
      'comma-style': 'error',

      indent: ['error', 2, {
        SwitchCase: 1,
        VariableDeclarator: 2
      }],

      'keyword-spacing': 'error',
      'no-whitespace-before-property': 'error',
      'no-buffer-constructor': 'warn',
      'no-console': 'off',
      'no-constant-condition': 'off',
      'no-multi-spaces': 'error',
      'func-call-spacing': 'error',
      'no-trailing-spaces': 'error',
      'no-undef': 'error',
      'no-unneeded-ternary': 'error',
      'no-const-assign': 'error',
      'no-useless-rename': 'error',
      'no-dupe-keys': 'error',
      'space-in-parens': ['error', 'never'],

      'spaced-comment': ['error', 'always', {
        block: {
          markers: ['!'],
          balanced: true
        }
      }],

      'key-spacing': ['error', {
        beforeColon: false,
        afterColon: true
      }],

      'comma-spacing': ['error', {
        before: false,
        after: true
      }],

      'array-bracket-spacing': 1,

      'arrow-spacing': ['error', {
        before: true,
        after: true
      }],

      'object-curly-spacing': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-unreachable': 'error',
      quotes: ['error', 'single'],
      'quote-props': ['error', 'as-needed'],
      semi: 'error',
      'no-extra-semi': 'error',
      'semi-spacing': 'error',
      'no-spaced-func': 'error',
      'no-throw-literal': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'no-var': 'warn',
      'prefer-const': 'warn',
      strict: ['error', 'global'],

      'no-restricted-globals': ['error', {
        name: 'context',
        message: 'Don\'t use Mocha\'s global context'
      }],

      'no-prototype-builtins': 'off',
      'no-empty': 'off',
      'eol-last': 'warn',

      'no-multiple-empty-lines': ['warn', {
        max: 2
      }]
    }
  },
  // general typescript options
  {
    files: ['**/*.{ts,tsx}', '**/*.md/*.ts', '**/*.md/*.typescript'],
    extends: [
      tseslint.configs.recommended
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [],
          defaultProject: 'tsconfig.json'
        }
      }
    },
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      'spaced-comment': ['error', 'always', {
        block: {
          markers: ['!'],
          balanced: true
        },

        markers: ['/']
      }],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-dupe-class-members': 'error',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/space-infix-ops': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off'
    }
  },
  // type test specific options
  {
    files: ['test/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-interface': 'off'
    }
  },
  // test specific options (including type tests)
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    ignores: ['deno*.mjs'],
    plugins: {
      'mocha-no-only': mochaNoOnly
    },
    languageOptions: {
      globals: globals.mocha
    },
    rules: {
      'no-self-assign': 'off',
      'mocha-no-only/mocha-no-only': ['error']
    }
  },
  // deno specific options
  {
    files: ['**/deno*.mjs'],
    languageOptions: {
      globals: {
        // "globals" currently has no definition for deno
        Deno: 'readonly'
      }
    }
  },
  // general options for module files
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module'
    }
  },
  // doc script specific options
  {
    files: ['**/docs/js/**/*.js'],
    languageOptions: {
      globals: {
        ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, 'off'])),
        ...globals.browser }
    }
  }
]);
