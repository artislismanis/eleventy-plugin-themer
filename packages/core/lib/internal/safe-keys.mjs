/**
 * Keys that must never be set during recursive merge/copy to prevent prototype
 * pollution. Used by all deep-merge implementations across the monorepo.
 */
export const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
