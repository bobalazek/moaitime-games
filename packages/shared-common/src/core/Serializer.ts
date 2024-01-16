export class Serializer {
  // TODO
  // Rather use https://www.npmjs.com/package/msgpackr

  serialize(value: unknown): string {
    return JSON.stringify(value);
  }

  deserialize<T>(text: string): T {
    return JSON.parse(text) as T;
  }
}

export const serializer = new Serializer();
