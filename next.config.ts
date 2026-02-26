import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Cache Components to allow dynamic rendering (Supabase/cookies on `/`)
  cacheComponents: false,
  serverExternalPackages: ["unzipper"],
};

export default nextConfig;
