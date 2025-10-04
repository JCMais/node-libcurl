const { defineConfig } = require('eslint/config')

const globals = require('globals')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')
const js = require('@eslint/js')

const tsEslint = require('typescript-eslint')

const noUnusedVarsSetting = {
  varsIgnorePattern: '^(_|Easy|Share|Multi|Curl)',
  argsIgnorePattern: '^_',
}

module.exports = defineConfig([
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {},

      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.js'],
    plugins: {
      js,
    },
    extends: ['js/recommended'],
    rules: {
      'no-unused-vars': ['error', noUnusedVarsSetting],
    },
  },
  tsEslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 0,
      '@typescript-eslint/indent': 0,
      '@typescript-eslint/explicit-function-return-type': 0,
      '@typescript-eslint/explicit-module-boundary-types': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-non-null-assertion': 0,
      '@typescript-eslint/ban-ts-ignore': 0,
      '@typescript-eslint/no-duplicate-enum-values': 0,
      '@typescript-eslint/no-unsafe-declaration-merging': 0,
      '@typescript-eslint/ban-ts-comment': 0,

      '@typescript-eslint/member-ordering': [
        2,
        {
          default: [
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'public-constructor',
            'protected-constructor',
            'private-constructor',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
            'public-static-method',
            'protected-static-method',
            'private-static-method',
          ],
        },
      ],

      '@typescript-eslint/no-parameter-properties': 0,
      '@typescript-eslint/no-unused-vars': ['error', noUnusedVarsSetting],
    },
  },
])
