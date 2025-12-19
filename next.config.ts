import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.20.177"],
  serverExternalPackages: [
    "keyv",
    "@keyv/redis",
    "@keyv/mongo",
    "@keyv/sqlite",
    "@keyv/postgres",
    "@keyv/mysql",
    "@keyv/etcd",
    "@keyv/offline",
    "@keyv/tiered",
    "cacheable-request",
    "got",
    "ably",
  ],
};

export default nextConfig;
