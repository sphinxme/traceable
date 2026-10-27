import type { Context } from "quill/modules/keyboard";
import Quill, { Range } from "quill";

export type KeyboardHandler = (
  range: Range,
  curContext: Context,
  quill: Quill,
) => boolean;

export function warpKeyHandler(
  handler: KeyboardHandler,
) {
  return function (
    this: {
      quill: Quill;
    },
    range: Range,
    context: Context,
  ) {
    return handler(range, context, this.quill);
  };
}
