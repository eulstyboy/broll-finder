import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Figma plug-in: plain scripts for the Figma runtime, ui.html is generated
    "figma-plugin/**",
    // Code tiers copié tel quel (Grammalecte, PaddleOCR, ONNX Runtime) : ne pas le modifier ni le linter
    "public/coquille/grammalecte/**",
    "public/coquille/vendor/**",
    // three.js r128 minifié, servi tel quel par l'accueil (fichier de cdnjs, vérifié par son empreinte SRI)
    "public/labo/three.r128.min.js",
  ]),
]);

export default eslintConfig;
