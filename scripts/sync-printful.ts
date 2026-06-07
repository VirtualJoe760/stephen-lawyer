import { syncPrintfulCatalog } from "../src/lib/printful/sync";

async function main() {
  const summary = await syncPrintfulCatalog();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
