import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "@rollup/plugin-typescript"
import babel from "@rollup/plugin-babel"
import terser from "@rollup/plugin-terser"
import postcss from "rollup-plugin-postcss"
import autoprefixer from "autoprefixer"
import pkg from "./package.json"

// 外部依赖，不会打包进最终文件
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
]

// React版本打包配置
export default [
  {
    input: "src/components/gantt-chart/index.react.js",
    output: [
      {
        file: "dist/react/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
        inlineDynamicImports: true,
      },
      {
        file: "dist/react/index.esm.js",
        format: "es",
        sourcemap: true,
        exports: "named",
        inlineDynamicImports: true,
      },
    ],
    external,
    plugins: [
      resolve({
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.build.json",
        sourceMap: true,
        outDir: "dist/react",
        declaration: true,
        declarationDir: "dist/react",
      }),
      babel({
        babelHelpers: "runtime",
        exclude: "node_modules/**",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: ["@babel/preset-react"],
      }),
      postcss({
        plugins: [autoprefixer()],
        inject: false,
        extract: false,
      }),
      terser(),
    ],
  },
]
