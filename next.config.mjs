/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // クチコミPOPのテンプレPDFを、該当APIのサーバ関数に同梱する（Vercelのトレース漏れ防止）。
    outputFileTracingIncludes: {
      "/r/[slug]/pop/[lang]": ["./content/pop/**"],
    },
  },
};

export default nextConfig;
