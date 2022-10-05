import { describe, expect, it } from 'vitest';
import {
  getPruefziffer11er,
  getPruefziffer2er,
  getPruefzifferModified11er,
} from '../src';

describe('calculate Pruefziffern', () => {
  it('correct number for modified 11er Verfahren', () => {
    expect(getPruefzifferModified11er('2799081508152')).toEqual(2);
  });

  it('correct number for 2er Verfahren', () => {
    expect(getPruefziffer2er('2866081508156')).toEqual(6);
  });

  it('correct number for 11er Verfahren', () => {
    expect(getPruefziffer11er('9198081508152', 'DE-BY')).toEqual(2);
  });

  it('correct number for 11er Verfahren, DE-NW', () => {
    expect(getPruefziffer11er('5400081508159', 'DE-NW')).toEqual(9);
  });
});
