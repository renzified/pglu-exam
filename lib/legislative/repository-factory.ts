import type { LegislativeRepository } from "./repository";
import { LocalStorageLegislativeRepository } from "./local-storage-repository";

/**
 * Returns the active {@link LegislativeRepository} implementation.
 * Add new kinds (e.g. `"api"`) and wire a matching implementation without
 * changing screens or forms.
 */
export function getLegislativeRepository(): LegislativeRepository {
  const kind = process.env.NEXT_PUBLIC_LEGISLATIVE_STORE ?? "localStorage";
  if (kind === "localStorage") {
    return new LocalStorageLegislativeRepository();
  }
  throw new Error(`Unsupported legislative store: ${kind}`);
}
