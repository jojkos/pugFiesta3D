import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // eslint-plugin-react-hooks v7 introduced two rules that fire on
      // patterns used throughout this codebase as a matter of necessity:
      //
      //   - `react-hooks/immutability`: flags `ref.current = x` (the standard
      //     "latest value" callback pattern) and mutation of R3F's `camera`
      //     inside `useFrame` (which is exactly how R3F is meant to be used).
      //   - `react-hooks/set-state-in-effect`: flags `setState` inside any
      //     effect, including effects that derive state from prop transitions
      //     or kick off async initial work.
      //
      // Disabling here so lint output stays signal-rich.
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
