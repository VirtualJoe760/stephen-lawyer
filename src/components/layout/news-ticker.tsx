import { getTickerItems } from "@/lib/sanity/queries";

export async function NewsTicker() {
  const items = await getTickerItems();
  const doubled = [...items, ...items];

  return (
    <div className="bg-ink text-bone h-8 overflow-hidden border-b border-ink-line">
      <div
        className="flex items-center h-full whitespace-nowrap font-mono text-xs uppercase tracking-wide animate-[ticker_40s_linear_infinite] hover:[animation-play-state:paused]"
        style={{ width: "200%" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="px-8 flex items-center gap-3">
            <span aria-hidden className="text-hazard">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
