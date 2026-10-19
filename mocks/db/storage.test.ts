import { describe, expect, it } from "vitest";
import { openStorage } from "./storage";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

describe("openStorage", () => {
  it("devolve o armazenamento quando ele funciona, sem deixar a chave de teste", () => {
    const storage = memoryStorage();

    expect(openStorage(() => storage)).toBe(storage);
    expect(storage.length).toBe(0);
  });

  it("devolve null quando o acesso ao armazenamento é bloqueado", () => {
    expect(
      openStorage(() => {
        throw new DOMException("bloqueado", "SecurityError");
      }),
    ).toBeNull();
  });

  it("devolve null quando o armazenamento existe mas recusa gravar", () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new DOMException("cheio", "QuotaExceededError");
    };

    expect(openStorage(() => storage)).toBeNull();
  });
});
