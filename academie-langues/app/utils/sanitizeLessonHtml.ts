import DOMPurify from "isomorphic-dompurify";

export function sanitizeLessonHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["mark"],
    ADD_ATTR: ["data-highlight-id", "style"],
  });
}
