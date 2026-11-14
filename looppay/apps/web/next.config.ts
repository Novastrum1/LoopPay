import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@looppay/sdk", "@looppay/config"],
  experimental: { cpus: 2 },
};
export default config;
