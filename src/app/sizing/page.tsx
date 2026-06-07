import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Size guide",
  description: "Apparel sizing for STEPHEN LAWYER tees, hoodies, and accessories.",
};

const TEES = [
  { size: "S", chest: 36, length: 28 },
  { size: "M", chest: 40, length: 29 },
  { size: "L", chest: 44, length: 30 },
  { size: "XL", chest: 48, length: 31 },
  { size: "XXL", chest: 52, length: 32 },
];

const HOODIES = [
  { size: "S", chest: 40, length: 27 },
  { size: "M", chest: 42, length: 28 },
  { size: "L", chest: 44, length: 29 },
  { size: "XL", chest: 46, length: 30 },
  { size: "XXL", chest: 50, length: 31 },
];

function Table({ title, rows }: { title: string; rows: { size: string; chest: number; length: number }[] }) {
  return (
    <section className="mt-10">
      <h2 className="wordmark text-3xl mb-4">{title}</h2>
      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full font-mono text-sm">
          <thead className="bg-ink text-bone uppercase text-xs tracking-widest">
            <tr>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-left">Chest (in)</th>
              <th className="px-4 py-3 text-left">Length (in)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.size} className={i % 2 === 0 ? "bg-bone" : "bg-bone-200"}>
                <td className="px-4 py-3 font-bold">{r.size}</td>
                <td className="px-4 py-3">{r.chest}</td>
                <td className="px-4 py-3">{r.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Sizing() {
  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="wordmark text-6xl md:text-9xl mb-6">Size guide</h1>
        <p className="text-base leading-relaxed mb-2">
          Measurements are taken laid flat, in inches. Tees and hoodies fit boxy and slightly oversized.
          If you're between sizes, size down for fitted, true to size for relaxed.
        </p>
        <Table title="Tees" rows={TEES} />
        <Table title="Hoodies" rows={HOODIES} />
        <p className="mt-8 font-mono text-xs uppercase tracking-widest text-ink/60">
          Still unsure? Email hello@stephenlawyer.clothing.
        </p>
      </div>
    </div>
  );
}
