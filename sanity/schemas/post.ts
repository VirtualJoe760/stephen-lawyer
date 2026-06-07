import { defineField, defineType } from "sanity";

export default defineType({
  name: "post",
  title: "Journal post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (r) => r.required() }),
    defineField({ name: "excerpt", type: "text", rows: 3 }),
    defineField({ name: "publishedAt", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "readMinutes", type: "number" }),
    defineField({ name: "coverImage", type: "image", options: { hotspot: true } }),
    defineField({
      name: "body",
      type: "array",
      of: [
        { type: "block" },
        { type: "image", options: { hotspot: true } },
        {
          type: "object",
          name: "youtube",
          title: "YouTube",
          fields: [{ name: "url", type: "url" }],
        },
        {
          type: "object",
          name: "productEmbed",
          title: "Shop the post",
          fields: [{ name: "productSlugs", type: "array", of: [{ type: "string" }] }],
        },
      ],
    }),
  ],
});
