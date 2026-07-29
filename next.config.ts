import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const githubBasePath = isGitHubPages ? "/ocean-check-ai-health" : "";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: githubBasePath,
  assetPrefix: githubBasePath,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: isGitHubPages,
  },
  typescript: {
    ignoreBuildErrors: isGitHubPages,
  },
};

export default nextConfig;
