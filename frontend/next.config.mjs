/** @type {import('next').NextConfig} */
const repoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}`
  : '/WildLens-AI';
const isUserPage = repoName.toLowerCase().endsWith('.github.io');
const defaultGhPagesPath = isUserPage ? '' : repoName;

const basePath = process.env.BASE_PATH !== undefined
  ? process.env.BASE_PATH
  : (process.env.GITHUB_ACTIONS ? defaultGhPagesPath : '');

const nextConfig = {
  output: 'export',
  basePath: basePath ? basePath : undefined,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
