import { describe, expect, it } from 'vitest';
import { defaultErrors, ParsedSteuernummer, parseSteuernummer } from '../src';

describe('parse steuernummern', () => {
  it('correctly parses "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung" (13 digits)', () => {
    // Unambiguously identify BW as state:
    const resultBW: ParsedSteuernummer = {
      bezirksnummer: '815',
      bundesfinanzamtnummer: '2866',
      normalizedSteuernummer: '2866081508156',
      pruefziffer: '6',
      statePrefix: '28',
      states: 'DE-BW',
      unterscheidungsnummer: '0815',
    };
    expect(
      parseSteuernummer('2866 0 815 08156', { errorMessages: defaultErrors })
    ).toEqual(resultBW);

    // Multiple states possible:
    const resultMultiple: ParsedSteuernummer = {
      bezirksnummer: '123',
      bundesfinanzamtnummer: '3201',
      normalizedSteuernummer: '3201012312340',
      pruefziffer: '0',
      statePrefix: '3',
      states: ['DE-BB', 'DE-SN', 'DE-ST'],
      unterscheidungsnummer: '1234',
    };
    expect(
      parseSteuernummer('3201012312340', { errorMessages: defaultErrors })
    ).toEqual(resultMultiple);

    // Narrowing down states via given `bundesland`:
    const resultSN: ParsedSteuernummer = {
      bezirksnummer: '123',
      bundesfinanzamtnummer: '3201',
      normalizedSteuernummer: '3201012312340',
      pruefziffer: '0',
      statePrefix: '3',
      states: 'DE-SN',
      unterscheidungsnummer: '1234',
    };
    expect(
      parseSteuernummer('3201012312340', {
        errorMessages: defaultErrors,
        bundesland: 'DE-SN',
      })
    ).toEqual(resultSN);

    // Special case: DE-NW
    const resultNW: ParsedSteuernummer = {
      bezirksnummer: '8150',
      bundesfinanzamtnummer: '5133',
      normalizedSteuernummer: '5133081508159',
      pruefziffer: '9',
      statePrefix: '5',
      states: 'DE-NW',
      unterscheidungsnummer: '815',
    };
    expect(
      parseSteuernummer('5133/0/8150/815/9', { errorMessages: defaultErrors })
    ).toEqual(resultNW);
  });

  it('correctly parses "Vereinheitlichtes Bundesschema" (12 digits)', () => {
    // Unambiguously identify BW as state:
    const resultBW: ParsedSteuernummer = {
      bezirksnummer: '815',
      bundesfinanzamtnummer: '2866',
      normalizedSteuernummer: '2866081508156',
      pruefziffer: '6',
      statePrefix: '28',
      states: 'DE-BW',
      unterscheidungsnummer: '0815',
    };
    expect(
      parseSteuernummer('2866 815 08156', { errorMessages: defaultErrors })
    ).toEqual(resultBW);

    // Multiple states possible:
    const resultMultiple: ParsedSteuernummer = {
      bezirksnummer: '123',
      bundesfinanzamtnummer: '3201',
      normalizedSteuernummer: '3201012312340',
      pruefziffer: '0',
      statePrefix: '3',
      states: ['DE-BB', 'DE-SN', 'DE-ST'],
      unterscheidungsnummer: '1234',
    };
    expect(
      parseSteuernummer('320112312340', { errorMessages: defaultErrors })
    ).toEqual(resultMultiple);

    // Narrowing down states via given `bundesland`:
    const resultSN: ParsedSteuernummer = {
      bezirksnummer: '123',
      bundesfinanzamtnummer: '3201',
      normalizedSteuernummer: '3201012312340',
      pruefziffer: '0',
      statePrefix: '3',
      states: 'DE-SN',
      unterscheidungsnummer: '1234',
    };
    expect(
      parseSteuernummer('320112312340', {
        errorMessages: defaultErrors,
        bundesland: 'DE-SN',
      })
    ).toEqual(resultSN);

    // Special case: DE-NW
    const resultNW: ParsedSteuernummer = {
      bezirksnummer: '8150',
      bundesfinanzamtnummer: '5133',
      normalizedSteuernummer: '5133081508159',
      pruefziffer: '9',
      statePrefix: '5',
      states: 'DE-NW',
      unterscheidungsnummer: '815',
    };
    expect(
      parseSteuernummer('5133/8150/815/9', { errorMessages: defaultErrors })
    ).toEqual(resultNW);
  });

  it('correctly parses "Standardschema der Länder" (10 or 11 digits)', () => {
    // DE-BW, format: FF/BBB/UUUUP
    const resultBW: ParsedSteuernummer = {
      bezirksnummer: '815',
      bundesfinanzamtnummer: '2893',
      normalizedSteuernummer: '2893081508152',
      pruefziffer: '2',
      statePrefix: '28',
      states: 'DE-BW',
      unterscheidungsnummer: '0815',
    };
    expect(
      parseSteuernummer('93815/08152', {
        errorMessages: defaultErrors,
        bundesland: 'DE-BW',
      })
    ).toEqual(resultBW);

    // DE-MV, format: FFF/BBB/UUUUP
    const resultMV: ParsedSteuernummer = {
      bezirksnummer: '815',
      bundesfinanzamtnummer: '4098',
      normalizedSteuernummer: '4098081508157',
      pruefziffer: '7',
      statePrefix: '4',
      states: 'DE-MV',
      unterscheidungsnummer: '0815',
    };
    expect(
      parseSteuernummer('098/815/08157', {
        errorMessages: defaultErrors,
        bundesland: 'DE-MV',
      })
    ).toEqual(resultMV);

    // DE-HE, format: 0FF/BBB/UUUUP
    const resultHE: ParsedSteuernummer = {
      bezirksnummer: '815',
      bundesfinanzamtnummer: '2653',
      normalizedSteuernummer: '2653081508158',
      pruefziffer: '8',
      statePrefix: '26',
      states: 'DE-HE',
      unterscheidungsnummer: '0815',
    };
    expect(
      parseSteuernummer('053 815 08158', {
        errorMessages: defaultErrors,
        bundesland: 'DE-HE',
      })
    ).toEqual(resultHE);

    // DE-NW, format: FFF/BBBB/UUUP
    const resultNW: ParsedSteuernummer = {
      bezirksnummer: '8150',
      bundesfinanzamtnummer: '5400',
      normalizedSteuernummer: '5400081508159',
      pruefziffer: '9',
      statePrefix: '5',
      states: 'DE-NW',
      unterscheidungsnummer: '815',
    };
    expect(
      parseSteuernummer('400/8150/8159', {
        errorMessages: defaultErrors,
        bundesland: 'DE-NW',
      })
    ).toEqual(resultNW);
  });
});
