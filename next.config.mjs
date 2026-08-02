import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Exclude firestore and auth api requests from caching
  workboxOptions: {
    exclude: [/.*firestore\.googleapis\.com.*/, /.*securetoken\.googleapis\.com.*/, /.*identitytoolkit\.googleapis\.com.*/],
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
};

export default withPWA(nextConfig);
