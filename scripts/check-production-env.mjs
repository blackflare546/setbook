import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const errors = [];
const warnings = [];
const value = (name) => process.env[name]?.trim() ?? "";
const requireSecret = (name) => {
  if (value(name).length < 32)
    errors.push(`${name} must contain at least 32 characters.`);
};

requireSecret("SHARE_CAPABILITY_SECRET");
requireSecret("CRON_SECRET");

const storeId = value("BLOB_STORE_ID");
const storeToken = value("BLOB_READ_WRITE_TOKEN");
if (!storeId && !storeToken)
  errors.push(
    "Connect a Vercel Blob store or configure BLOB_READ_WRITE_TOKEN.",
  );
if (storeId && storeToken && storeId === storeToken)
  errors.push(
    "BLOB_STORE_ID and BLOB_READ_WRITE_TOKEN are not interchangeable.",
  );

const retention = value("PUBLISHED_SETLIST_RETENTION_DAYS");
if (
  retention &&
  (!Number.isSafeInteger(Number(retention)) || Number(retention) <= 0)
)
  errors.push("PUBLISHED_SETLIST_RETENTION_DAYS must be a positive integer.");

if (!value("FORMSPREE_FORM_ID"))
  warnings.push(
    "FORMSPREE_FORM_ID is empty; Help feedback will be unavailable.",
  );

for (const warning of warnings) console.warn(`Warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`Error: ${error}`);
  process.exitCode = 1;
} else {
  console.info("Production environment configuration is valid.");
}
