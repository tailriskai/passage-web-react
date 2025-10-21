import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import image from "@rollup/plugin-image";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/index.esm.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      image(),
      postcss({
        // Only apply CSS modules to .module.css files
        modules: {
          generateScopedName: '[name]-module_[local]__[hash:base64:5]',
        },
        autoModules: true, // Automatically detect .module.css files
        extract: false,
        inject: true,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        exclude: ["**/*.test.ts", "**/*.test.tsx"],
      }),
    ],
    external: [
      "react",
      "react-dom",
      "fs",
      "url",
      "http",
      "https",
      "stream",
      "zlib",
      "buffer",
      "crypto",
      "events",
      "net",
      "tls",
      "child_process",
    ],
  },
];
