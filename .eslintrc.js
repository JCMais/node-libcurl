const noUnusedVarsSetting = { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }

module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es6: true,
  },
  overrides: [
    {
      files: ['*.js'],
      extends: ['eslint:recommended', 'plugin:prettier/recommended'],
      plugins: ['prettier'],
      rules: {
        'no-unused-vars': ['error', noUnusedVarsSetting],
      },
    },
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier',
      ],
      plugins: ['@typescript-eslint', 'prettier'],
      rules: {
        'prettier/prettier': 1,
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
  ],
}
