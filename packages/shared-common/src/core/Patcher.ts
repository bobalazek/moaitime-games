import type { Operation } from 'fast-json-patch';

import { applyPatch, compare } from 'fast-json-patch';

export { Operation as PatcherOperation };

export class Patcher {
  applyPatch<T>(document: T, patch: Operation[]) {
    return applyPatch(document, patch).newDocument as T;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
  compare<T extends Object | any[]>(document1: T, document2: T) {
    return compare(document1, document2);
  }
}

export const patcher = new Patcher();
