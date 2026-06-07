import { defineField, defineType } from "sanity";

export default defineType({
  name: "aboutPage",
  title: "About page",
  type: "document",
  fields: [
    defineField({ name: "headline", type: "string", validation: (r) => r.required() }),
    defineField({ name: "body", type: "text", rows: 12, validation: (r) => r.required() }),
    defineField({ name: "portrait", type: "image", options: { hotspot: true } }),
  ],
});
