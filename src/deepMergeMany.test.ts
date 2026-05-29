import { deepMergeMany } from "./deepMergeMany";

describe("deepMergeMany", () => {
  it("should return the merging of empty array", () => {
    const sources: any = [];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({});
  });

  it("should return the merging of undefined", () => {
    const sources: any = [undefined, undefined];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({});
  });

  it("should return the merging of empty object", () => {
    const sources: any = [{}, {}];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({});
  });

  it("should return the merging of object without values", () => {
    const sources: any = [
      { nested: {}, limits: {} },
      { nested: {}, limits: {} },
    ];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({ nested: {}, limits: {} });
  });

  it("should return the merging of empty object with undefined", () => {
    const sources: any = [{ nested: {}, limits: {} }, undefined];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({ nested: {}, limits: {} });
  });

  it("should return the merging of object without values and empty object", () => {
    const sources: any = [{ nested: {}, limits: {} }, {}];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({ nested: {}, limits: {} });
  });

  it("should return the merging of object, pick always Max value, except if key is min (take Min value)", () => {
    const sources: any = [
      { max: 1000, min: 1 },
      { max: 2000, min: 1000 },
    ];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({ max: 2000, min: 1 });
  });

  it("should return the merging of same object with different values", () => {
    const sources: any = [
      {
        nested: {
          scores: {
            "500": 5,
            "2000": 1,
            "2400": 1,
          },
          tier: {
            High: 3,
            Medium: 8,
          },
        },
        limits: {
          scores: {
            max: 6000,
            min: 6000,
          },
        },
      },
      {
        nested: {
          scores: {
            "500": 2,
            "2000": 5,
            "2400": 1,
          },
          tier: {
            High: 2,
            Medium: 9,
          },
        },
        limits: {
          scores: {
            min: 100,
            max: 6000,
          },
        },
      },
    ];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({
      nested: {
        scores: {
          "500": 5,
          "2000": 5,
          "2400": 1,
        },
        tier: {
          High: 3,
          Medium: 9,
        },
      },
      limits: {
        scores: {
          min: 100,
          max: 6000,
        },
      },
    });
  });

  it("should return the merging of one empty object and one object with data", () => {
    const sources: any = [
      {
        nested: {
          scores: {
            "500": 5,
            "2000": 1,
            "2400": 1,
          },
          tier: {
            High: 3,
            Medium: 8,
          },
        },
        limits: {
          scores: {
            max: 6000,
            min: 6000,
          },
        },
      },
      {},
    ];
    const result = deepMergeMany(sources);
    expect(result).toStrictEqual({
      nested: {
        scores: {
          "500": 5,
          "2000": 1,
          "2400": 1,
        },
        tier: {
          High: 3,
          Medium: 8,
        },
      },
      limits: {
        scores: {
          min: 6000,
          max: 6000,
        },
      },
    });
  });
});
