interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Keep API requests untouched.
    if (url.pathname.startsWith("/api")) {
      return fetch(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // For unknown client-side routes, serve the SPA entrypoint.
    const spaUrl = new URL("/index.html", url.origin);
    return env.ASSETS.fetch(new Request(spaUrl.toString(), request));
  },
};
