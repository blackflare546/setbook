const inputUrl =
  process.argv.slice(2).find((argument) => argument !== "--") ??
  process.env.SETBOOK_DEPLOYMENT_URL;

if (!inputUrl) {
  console.error(
    "Usage: pnpm health:smoke -- <deployment-url> (or set SETBOOK_DEPLOYMENT_URL).",
  );
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(inputUrl);
} catch {
  console.error(`Invalid deployment URL: ${inputUrl}`);
  process.exit(1);
}

const routes = ["/", "/library", "/setlists", "/help", "/about"];

async function fetchRoute(pathname) {
  const url = new URL(pathname, baseUrl);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`${pathname} returned HTTP ${response.status}.`);
  return response;
}

function requireHeader(response, name, expected) {
  const value = response.headers.get(name);
  if (!value || !expected(value))
    throw new Error(`${name} is missing or invalid (${value ?? "missing"}).`);
}

try {
  const pageResponses = await Promise.all(routes.map(fetchRoute));
  const shellResponse = pageResponses[1];

  requireHeader(shellResponse, "content-security-policy", (value) =>
    value.includes("frame-ancestors 'none'"),
  );
  requireHeader(shellResponse, "permissions-policy", (value) =>
    value.includes("camera=(self)"),
  );
  requireHeader(shellResponse, "x-content-type-options", (value) =>
    value.includes("nosniff"),
  );
  requireHeader(shellResponse, "x-frame-options", (value) => value === "DENY");
  if (shellResponse.headers.has("x-powered-by"))
    throw new Error("x-powered-by must not be exposed.");

  const requireHsts =
    process.env.SETBOOK_SMOKE_REQUIRE_HSTS === "1" ||
    baseUrl.protocol === "https:";
  if (requireHsts)
    requireHeader(shellResponse, "strict-transport-security", (value) =>
      value.includes("max-age="),
    );

  const healthResponse = await fetchRoute("/api/health");
  const health = await healthResponse.json();
  if (health.status !== "ok" || health.service !== "setbook")
    throw new Error("The health endpoint returned an unexpected payload.");

  const requiredFeatures = (process.env.SETBOOK_SMOKE_REQUIRED_FEATURES ?? "")
    .split(",")
    .map((feature) => feature.trim())
    .filter(Boolean);
  for (const feature of requiredFeatures) {
    if (health.features?.[feature] !== true)
      throw new Error(`Required feature is not configured: ${feature}.`);
  }

  console.info(
    `Smoke check passed for ${baseUrl.origin}: ${routes.length} pages, security headers, and health endpoint.`,
  );
  console.info(`Runtime features: ${JSON.stringify(health.features)}`);
} catch (error) {
  console.error(
    `Smoke check failed for ${baseUrl.origin}:`,
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
