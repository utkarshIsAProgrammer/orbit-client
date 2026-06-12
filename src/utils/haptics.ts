/**
 * Haptic feedback utility — respects user's gesture settings.
 * Calling navigator.vibrate is gated by a localStorage flag so users
 * can opt out via the Gestures settings panel.
 */

const HAPTIC_ENABLED_KEY = "orbit_haptic_enabled";

/** Returns true if haptic feedback is allowed (defaults to enabled). */
export function isHapticEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HAPTIC_ENABLED_KEY) !== "false";
}

/** Toggle haptic feedback on/off. Returns the new state. */
export function setHapticEnabled(enabled: boolean): boolean {
  if (typeof window === "undefined") return enabled;
  localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
  return enabled;
}

/**
 * Trigger a short vibration if haptic feedback is enabled.
 * @param ms Duration in milliseconds (default 10 for a light tap).
 */
export function triggerHaptic(ms: number = 10): void {
  if (isHapticEnabled() && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}
