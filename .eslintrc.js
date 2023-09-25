'use strict';

module.exports = {
  extends: [
    'eslint:recommended'
  ],
  ignorePatterns: [
    'tools',
    'dist',
    'website.js',
    'test/files/*',
    'benchmarks',
    '*.min.js',
    '**/docs/js/native.js',
    '!.*',
    'node_modules',
    '.git'
  ],
  overrides: [
    {
      files: [
        '**/*.{ts,tsx}',
        '**/*.md/*.ts',
        '**/*.md/*.typescript'
      ],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      plugins: [
        '@typescript-eslint'
      ],
      rules: {
        '@typescript-eslint/triple-slash-reference': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'spaced-comment': [
          'error',
          'always',
          {
            block: {
              markers: [
                '!'
              ],
              balanced: true
            },
            markers: [
              '/'
            ]
          }
        ],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/indent': [
          'warn',
          2,
          {
            SwitchCase: 1,
            ignoredNodes: ['TSTypeParameterInstantiation']
          }
        ],
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/brace-style': 'error',
        '@typescript-eslint/no-dupe-class-members': 'error',
        '@typescript-eslint/no-redeclare': 'error',
        '@typescript-eslint/type-annotation-spacing': 'error',
        '@typescript-eslint/object-curly-spacing': [
          'error',
          'always'
        ],
        '@typescript-eslint/semi': 'error',
        '@typescript-eslint/space-before-function-paren': [
          'error',
          'never'
        ],
        '@typescript-eslint/space-infix-ops': 'off'
      }
    },
    {
      files: [
        '**/docs/js/**/*.js'
      ],
      env: {
        node: false,
        browser: true
      }
    }
    // // eslint-plugin-markdown has been disabled because of out-standing issues, see https://github.com/eslint/eslint-plugin-markdown/issues/214
    // {
    //   files: ['**/*.md'],
    //   processor: 'markdown/markdown'
    // },
    // {
    //   files: ['**/*.md/*.js', '**/*.md/*.javascript', '**/*.md/*.ts', '**/*.md/*.typescript'],
    //   parserOptions: {
    //     ecmaFeatures: {
    //       impliedStrict: true
    //     },
    //     sourceType: 'module', // required to allow "import" statements
    //     ecmaVersion: 'latest' // required to allow top-level await
    //   },
    //   rules: {
    //     'no-undef': 'off',
    //     'no-unused-expressions': 'off',
    //     'no-unused-vars': 'off',
    //     'no-redeclare': 'off',
    //     '@typescript-eslint/no-redeclare': 'off'
    //   }
    // }
  ],
  plugins: [
    'mocha-no-only'
    // 'markdown'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  env: {
    node: true,
    es6: true,
    es2020: true
  },
  rules: {
    'comma-style': 'error',
    indent: [
      'error',
      2,
      {
        SwitchCase: 1,
        VariableDeclarator: 2
      }
    ],
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
    'space-in-parens': [
      'error',
      'never'
    ],
    'spaced-comment': [
      'error',
      'always',
      {
        block: {
          markers: [
            '!'
          ],
          balanced: true
        }
      }
    ],
    'key-spacing': [
      'error',
      {
        beforeColon: false,
        afterColon: true
      }
    ],
    'comma-spacing': [
      'error',
      {
        before: false,
        after: true
      }
    ],
    'array-bracket-spacing': 1,
    'arrow-spacing': [
      'error',
      {
        before: true,
        after: true
      }
    ],
    'object-curly-spacing': [
      'error',
      'always'
    ],
    'comma-dangle': [
      'error',
      'never'
    ],
    'no-unreachable': 'error',
    quotes: [
      'error',
      'single'
    ],
    'quote-props': [
      'error',
      'as-needed'
    ],
    semi: 'error',
    'no-extra-semi': 'error',
    'semi-spacing': 'error',
    'no-spaced-func': 'error',
    'no-throw-literal': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': [
      'error',
      'never'
    ],
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'no-var': 'warn',
    'prefer-const': 'warn',
    strict: [
      'error',
      'global'
    ],
    'no-restricted-globals': [
      'error',
      {
        name: 'context',
        message: 'Don\'t use Mocha\'s global context'
      }
    ],
    'no-prototype-builtins': 'off',
    'mocha-no-only/mocha-no-only': [
      'error'
    ],
    'no-empty': 'off',
    'eol-last': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 2 }]
  }
};
