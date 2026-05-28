import { deepMergeFilters } from './deepMergeFilters';

describe('deepMergeFilters', () => {
  it('should return the merging of empty array', () => {
    const filters: any = [];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({});
  });

  it('should return the merging of undefined', () => {
    const filters: any = [undefined, undefined];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({});
  });

  it('should return the merging of empty object', () => {
    const filters: any = [{}, {}];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({});
  });

  it('should return the merging of object without values', () => {
    const filters: any = [
      { filterFacet: {}, filterRange: {} },
      { filterFacet: {}, filterRange: {} },
    ];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({ filterFacet: {}, filterRange: {} });
  });

  it('should return the merging of empty object with undefined', () => {
    const filters: any = [{ filterFacet: {}, filterRange: {} }, undefined];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({ filterFacet: {}, filterRange: {} });
  });

  it('should return the merging of object without values and empty object', () => {
    const filters: any = [{ filterFacet: {}, filterRange: {} }, {}];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({ filterFacet: {}, filterRange: {} });
  });

  it('should return the merging of object, pick always Max value, except if key is min (take Min value)', () => {
    const filters: any = [
      { max: 1000, min: 1 },
      { max: 2000, min: 1000 },
    ];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({ max: 2000, min: 1 });
  });

  it('should return the merging of same object with different values', () => {
    const filters: any = [
      {
        filterFacet: {
          awardAmount: {
            '500': 5,
            '2000': 1,
            '2400': 1,
          },
          effort: {
            High: 3,
            Medium: 8,
          },
        },
        filterRange: {
          awardAmount: {
            max: 6000,
            min: 6000,
          },
        },
      },
      {
        filterFacet: {
          awardAmount: {
            '500': 2,
            '2000': 5,
            '2400': 1,
          },
          effort: {
            High: 2,
            Medium: 9,
          },
        },
        filterRange: {
          awardAmount: {
            min: 100,
            max: 6000,
          },
        },
      },
    ];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({
      filterFacet: {
        awardAmount: {
          '500': 5,
          '2000': 5,
          '2400': 1,
        },
        effort: {
          High: 3,
          Medium: 9,
        },
      },
      filterRange: {
        awardAmount: {
          min: 100,
          max: 6000,
        },
      },
    });
  });

  it('should return the merging of one empty object and one object with data', () => {
    const filters: any = [
      {
        filterFacet: {
          awardAmount: {
            '500': 5,
            '2000': 1,
            '2400': 1,
          },
          effort: {
            High: 3,
            Medium: 8,
          },
        },
        filterRange: {
          awardAmount: {
            max: 6000,
            min: 6000,
          },
        },
      },
      {},
    ];
    const result = deepMergeFilters(filters);
    expect(result).toStrictEqual({
      filterFacet: {
        awardAmount: {
          '500': 5,
          '2000': 1,
          '2400': 1,
        },
        effort: {
          High: 3,
          Medium: 8,
        },
      },
      filterRange: {
        awardAmount: {
          min: 6000,
          max: 6000,
        },
      },
    });
  });
});
