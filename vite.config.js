import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: set BASE_PATH to your repo name when deploying.
// Example: BASE_PATH=/seattle-crime-dashboard/ npm run build && npm run deploy
// Local dev: leave unset for base "/".
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  plugins: [react()],
  base,
});
