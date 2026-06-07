// Renders a JSON-LD <script> for structured data. Content is developer-controlled
// (no user input), but we escape "<" defensively to avoid breaking out of the tag.
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
