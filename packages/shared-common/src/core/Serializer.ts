export class Serializer {
  serialize<T>(value: T) {
    return JSON.stringify(value);
  }

  deserialize<T>(sessionString: string) {
    return JSON.parse(sessionString) as T;
  }
}

export const serializer = new Serializer();
