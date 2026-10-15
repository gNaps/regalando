import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
// Use the Vite runtime already supplied by the project's Vitest dependency.
const vitePath = require.resolve("vite", { paths: [dirname(require.resolve("vitest/package.json"))] });
const { createServer } = await import(pathToFileURL(vitePath).href);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const server = await createServer({
  configFile: false,
  root: resolve(projectRoot, "tests/ui/fixtures"),
  publicDir: resolve(projectRoot, "public"),
  define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
  resolve: {
    alias: {
      "@": projectRoot,
      "convex/react": resolve(projectRoot, "tests/ui/fixtures/backend.ts"),
      "next/link": resolve(projectRoot, "tests/ui/fixtures/link.tsx"),
      "next/image": resolve(projectRoot, "tests/ui/fixtures/image.tsx"),
      "next/navigation": resolve(projectRoot, "tests/ui/fixtures/navigation.ts"),
      "@clerk/nextjs": resolve(projectRoot, "tests/ui/fixtures/clerk.tsx"),
    },
  },
  server: { host: "127.0.0.1", port: 3200, strictPort: true, fs: { allow: [projectRoot] } },
});
await server.listen();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { await server.close(); process.exit(0); });
