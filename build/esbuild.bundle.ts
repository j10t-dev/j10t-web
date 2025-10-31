import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["./public/index.ts"],
  outfile: "./public/index.js",
  bundle: true,
  format: "iife",
  minify: true,
  sourcemap: true,
  target: ["es2020"],
});

esbuild.stop();
