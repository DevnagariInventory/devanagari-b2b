// For scripts run outside Next.js (db:push, db:seed): read .env the way Next.js does.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file; rely on real environment variables.
}
