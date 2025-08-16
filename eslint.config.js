import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: ['dist']
  },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      reactHooks,
      reactRefresh
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': 'warn',
      ...reactHooks.configs.recommended.rules
    },
  },
  {
    files: ['netlify/functions/*.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
]
