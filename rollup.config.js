import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

const cjs = {
  input: './library/main.tsx',
  output: {
    file: pkg.main,
    format: 'commonjs',
    exports: 'named',
  },
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfigOverride: {
        include: ['./library'],
        compilerOptions: {
          outDir: './dist',
        },
      },
    }),
  ],
};

const es = {
  input: './library/main.tsx',
  output: {
    file: pkg.module,
    format: 'es',
    exports: 'named',
  },
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfigOverride: {
        include: ['./library'],
        compilerOptions: {
          outDir: './dist',
        },
      },
    }),
  ],
};

export default [cjs, es];
