import { describe, expect, it } from "vitest";
import type { EthAmount } from "@/contracts/common";
import {
  fromEthSteps,
  toEthSteps,
  addEth,
  compareEth,
  formatEth,
  formatEthInput,
  fromWei,
  minEth,
  multiplyEth,
  parseEthInput,
  percentOfEth,
  subtractEth,
  toWei,
} from "./eth";

const eth = (value: string): EthAmount => value as EthAmount;

describe("conversão entre ETH e wei", () => {
  it("preserva as 18 casas decimais nos dois sentidos", () => {
    expect(toWei(eth("0.000000000000000001"))).toBe(1n);
    expect(fromWei(1n)).toBe("0.000000000000000001");
    expect(fromWei(toWei(eth("12.5")))).toBe("12.5");
  });

  it("devolve zero e remove zeros à direita", () => {
    expect(fromWei(0n)).toBe("0");
    expect(fromWei(toWei(eth("1.50")))).toBe("1.5");
  });

  it("recusa formato inválido e valor negativo", () => {
    expect(() => toWei(eth("1e3"))).toThrow(RangeError);
    expect(() => toWei(eth("0.0000000000000000001"))).toThrow(RangeError);
    expect(() => fromWei(-1n)).toThrow(RangeError);
  });
});

describe("aritmética exata", () => {
  it("soma 0.1 + 0.2 sem erro de ponto flutuante", () => {
    expect(addEth(eth("0.1"), eth("0.2"))).toBe("0.3");
  });

  it("opera acima de 2^53 wei sem perder precisão", () => {
    const large = eth("9007.199254740993");
    expect(toWei(large) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(addEth(large, eth("0.000000000000000001"))).toBe("9007.199254740993000001");
  });

  it("multiplica pela quantidade e subtrai", () => {
    expect(multiplyEth(eth("0.333"), 3)).toBe("0.999");
    expect(subtractEth(eth("1"), eth("0.25"))).toBe("0.75");
    expect(() => multiplyEth(eth("1"), 1.5)).toThrow(RangeError);
  });

  it("arredonda o desconto percentual para baixo, em wei", () => {
    expect(percentOfEth(eth("0.000000000000000009"), 1000)).toBe("0");
    expect(percentOfEth(eth("1.5"), 1000)).toBe("0.15");
  });

  it("compara e escolhe o menor valor", () => {
    expect(compareEth(eth("0.5"), eth("0.50"))).toBe(0);
    expect(compareEth(eth("0.1"), eth("0.2"))).toBe(-1);
    expect(minEth(eth("0.005"), eth("0.004"))).toBe("0.004");
  });
});

describe("formatEth", () => {
  it("mostra o valor exato com vírgula decimal e ponto de milhar, sem zeros à direita", () => {
    expect(formatEth(eth("1234.5"))).toBe("1.234,5");
    expect(formatEth(eth("1234567.000000000000000001"))).toBe("1.234.567,000000000000000001");
    expect(formatEth(eth("12.50"))).toBe("12,5");
    expect(formatEth(eth("0"))).toBe("0");
  });
});

describe("formatEthInput", () => {
  it("prepara o valor para campo de formulário, sem milhar, e volta igual pelo parseEthInput", () => {
    expect(formatEthInput(eth("1234.5"))).toBe("1234,5");
    for (const value of ["1234", "1234.5", "0.000000000000000001", "12.5"]) {
      expect(parseEthInput(formatEthInput(eth(value)))).toBe(value);
    }
  });
});

describe("parseEthInput", () => {
  it("aceita vírgula ou ponto e devolve o valor com ponto", () => {
    expect(parseEthInput("0,5")).toBe("0.5");
    expect(parseEthInput(" 1.25 ")).toBe("1.25");
    expect(parseEthInput(",5")).toBe("0.5");
    expect(parseEthInput("007")).toBe("7");
  });

  it("recusa separador de milhar, texto e mais de 18 casas", () => {
    expect(parseEthInput("1.234,5")).toBeNull();
    expect(parseEthInput("1,234,5")).toBeNull();
    expect(parseEthInput("abc")).toBeNull();
    expect(parseEthInput("0,0000000000000000001")).toBeNull();
    expect(parseEthInput("")).toBeNull();
  });
});

describe("toEthSteps e fromEthSteps", () => {
  it("converte em passos exatos de wei, arredondando para baixo ou para cima", () => {
    const step = eth("0.001");
    expect(toEthSteps(eth("12.5"), step, "floor")).toBe(12_500);
    expect(toEthSteps(eth("0.0125"), step, "floor")).toBe(12);
    expect(toEthSteps(eth("0.0125"), step, "ceil")).toBe(13);
    expect(fromEthSteps(13, step)).toBe("0.013");
    expect(fromEthSteps(0, step)).toBe("0");
  });

  it("recusa passo negativo ou fracionário", () => {
    expect(() => fromEthSteps(-1, eth("0.001"))).toThrow(RangeError);
    expect(() => fromEthSteps(1.5, eth("0.001"))).toThrow(RangeError);
  });
});
