import { defineField, defineType } from "sanity";

export default defineType({
  name: "ticker",
  title: "News ticker",
  type: "document",
  fields: [
    defineField({
      name: "items",
      title: "Ticker items",
      type: "array",
      of: [{ type: "string" }],
      description: "Short lines that scroll across the top of the site.",
    }),
  ],
});
