import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // MOU feature removed — send old links to home
      { source: '/mou/:id', destination: '/', permanent: true },
      { source: '/mou/:id/assets', destination: '/', permanent: true },

      // Proposal URL restructure: workspace is now /p/[id], inputs moved to /p/[id]/inputs
      { source: '/p/:id/assets', destination: '/p/:id', permanent: true },
      // Old PDF editor path: /p/[id]/assets/pdf-<uuid> → /p/[id]/pdf/<uuid>
      { source: '/p/:id/assets/pdf-:pdfId', destination: '/p/:id/pdf/:pdfId', permanent: true },
    ];
  },
};

export default nextConfig;
