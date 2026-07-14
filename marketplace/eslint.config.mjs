import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/next-env.d.ts'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env']",
          message: 'Read env only via @t/config.',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['packages/config/**'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // CLI entrypoints use a uniform `async main()` wrapper invoked via
    // `void main()`. `no-floating-promises` still guards those calls, so the
    // stylistic `require-await` is not needed here.
    files: ['scripts/**'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
);
