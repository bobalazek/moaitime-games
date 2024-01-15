// For now we we use this hacky solution. In the future we will probably want to use a proper, binary serialized

export class Serializer {
  serialize(value: unknown): string {
    return JSON.stringify(
      value /*, (_, value) =>
      value instanceof Map
        ? { __type: 'Map', value: Array.from(value.entries()) }
        : value instanceof Set
          ? { __type: 'Set', value: Array.from(value) }
          : value*/
    );
  }

  deserialize<T>(text: string): T {
    return JSON.parse(
      text /*, (_, value) => {
      if (value && typeof value === 'object') {
        if (value.__type === 'Map') return new Map(value.value);
        if (value.__type === 'Set') return new Set(value.value);
      }
      return value;
    }*/
    ) as T;
  }

  deepClone<T>(value: T): T {
    return this.deserialize(this.serialize(value));
  }
}

export const serializer = new Serializer();
