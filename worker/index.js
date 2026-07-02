export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (
      host === "property-ready.com" ||
      host === "property-ready-service.pages.dev" ||
      host.endsWith(".property-ready-service.pages.dev")
    ) {
      url.protocol = "https:";
      url.hostname = "www.property-ready.com";
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
