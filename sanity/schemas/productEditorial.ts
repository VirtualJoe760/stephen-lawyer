import { defineField, defineType } from "sanity";

export default defineType({
  name: "productEditorial",
  title: "Product editorial",
  type: "document",
  fields: [
    defineField({
      name: "printfulSyncProductId",
      title: "Printful sync product ID",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({ name: "longDescription", type: "text", rows: 6 }),
    defineField({ name: "whyIMadeThis", type: "text", rows: 4 }),
    defineField({
      name: "lookbookTags",
      type: "array",
      of: [{ type: "reference", to: [{ type: "lookbook" }] }],
    }),
    defineField({ name: "onBodyImage", type: "image", options: { hotspot: true } }),
  ],
});
