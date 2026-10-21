import { createCn } from "cn/config";

export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: ["tiny", "caption", "body", "md", "title", "display"] }] } },
});
