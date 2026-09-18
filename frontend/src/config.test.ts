import { getRuntimeConfig } from './config';

describe('getRuntimeConfig', () => {
  test('treats GitHub Pages builds without an API URL as a static preview', () => {
    expect(
      getRuntimeConfig(
        { REACT_APP_DEPLOY_TARGET: 'github-pages' },
        { hostname: 'cmc-creator.github.io' }
      )
    ).toEqual({
      apiBaseUrl: '/api',
      pagesStaticPreview: true,
    });
  });

  test('uses an explicit API URL when one is configured', () => {
    expect(
      getRuntimeConfig(
        {
          REACT_APP_DEPLOY_TARGET: 'github-pages',
          REACT_APP_API_URL: 'https://api.example.com',
        },
        { hostname: 'cmc-creator.github.io' }
      )
    ).toEqual({
      apiBaseUrl: 'https://api.example.com',
      pagesStaticPreview: false,
    });
  });
});
