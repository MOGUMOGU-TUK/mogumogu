import { GongguMateApp } from "../shell/GongguMateApp";

/**
 * Target app composition entry point.
 *
 * GongguMateApp still owns the remaining cross-screen state while the
 * domain screens are extracted incrementally. Keep new app-level wiring here
 * as the legacy shell gets thinner.
 */
export function AppShell() {
  return <GongguMateApp />;
}
