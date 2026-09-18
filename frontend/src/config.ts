interface RuntimeEnv {
  REACT_APP_API_URL?: string;
  REACT_APP_DEPLOY_TARGET?: string;
}

interface LocationLike {
  hostname: string;
}

export interface RuntimeConfig {
  apiBaseUrl: string;
  pagesStaticPreview: boolean;
}

export function getRuntimeConfig(
  env: RuntimeEnv = process.env,
  location?: LocationLike
): RuntimeConfig {
  const configuredApiUrl = env.REACT_APP_API_URL?.trim();
  const apiBaseUrl = configuredApiUrl || '/api';
  const hostname = location?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const isGitHubPagesHost = hostname === 'cmc-creator.github.io' || hostname.endsWith('.github.io');
  const pagesStaticPreview = !configuredApiUrl && (
    env.REACT_APP_DEPLOY_TARGET === 'github-pages' || isGitHubPagesHost
  );

  return {
    apiBaseUrl,
    pagesStaticPreview,
  };
}
