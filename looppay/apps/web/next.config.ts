import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  transpilePackages: ["@looppay/sdk", "@looppay/config"],
  experimental: { cpus: 2 },
};
export default config;
