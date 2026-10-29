export { cn } from "cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

/** 开发期断言：仅 DEV 生效，失败即抛。 */
export function devAssert(
  condition: unknown,
  message = "dev assertion failed",
): asserts condition {
  if (import.meta.env.DEV && !condition) {
    throw new Error(message);
  }
}

/** 开发期告警：仅 DEV 生效，prod no-op。 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(message, ...args);
  }
}

const warnedKeys = new Set<string>();

/** 开发期按 key 去重的告警：同 key 仅告警一次，prod no-op。 */
export function devWarnOnce(
  key: string,
  message: string,
  ...args: unknown[]
): void {
  if (!import.meta.env.DEV || warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message, ...args);
}
