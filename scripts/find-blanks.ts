import { getCatalogBlanks } from "../src/lib/printful/catalog";

const PATTERNS = [
  "staple t-shirt",
  "bella",
  "heavy blend hoodie",
  "pullover hoodie",
  "crew neck sweatshirt",
  "crewneck",
  "dad hat",
  "trucker",
  "twill",
  "beanie",
  "tote",
];

async function main() {
  const blanks = await getCatalogBlanks();
  console.log(`total blanks: ${blanks.length}`);
  for (const p of PATTERNS) {
    const hits = blanks.filter((b) => b.name.toLowerCase().includes(p));
    console.log(`\n== "${p}" (${hits.length}) ==`);
    for (const b of hits.slice(0, 6)) {
      console.log(`  ${b.id}  [${b.category}/${b.type}]  ${b.name}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
