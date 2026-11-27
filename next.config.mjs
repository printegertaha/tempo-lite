/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.58"],
  /* Disable experimental staged/partial RSC streaming flags (unused in codebase and prone to Flight chunk collisions in Next 16.4.3 Turbopack) */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
