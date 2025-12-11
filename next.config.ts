import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Cache Components to allow dynamic rendering (Supabase/cookies on `/`)
  cacheComponents: false,
};

export default nextConfig;
