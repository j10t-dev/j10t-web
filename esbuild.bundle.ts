import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

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