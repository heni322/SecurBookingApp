module.exports = {
  root: true,
  extends: [
    '@react-native',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion:  2021,
    sourceType:   'module',
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
  ],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    '.expo/',
    'dist/',
    'coverage/',
  ],
  rules: {
    // ── React Native ────────────────────────────────────────────────────
    'react-native/no-unused-styles':  'warn',
    'react-native/no-inline-styles':  'warn',
    'react-native/no-color-literals': 'off',

    // ── TypeScript ──────────────────────────────────────────────────────
    '@typescript-eslint/no-explicit-any':               'warn',
    '@typescript-eslint/no-unused-vars':                ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-imports':       ['error', { prefer: 'type-imports' }],

    // ── React ───────────────────────────────────────────────────────────
    'react/react-in-jsx-scope':    'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks':  'error',

    // ── General ─────────────────────────────────────────────────────────
    'no-console':   ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var':       'error',
    'eqeqeq':       ['error', 'always'],
  },
};
