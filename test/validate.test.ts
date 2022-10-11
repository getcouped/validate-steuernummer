import { describe, expect, it } from 'vitest';
import { defaultErrors, validateSteuernummer } from '../src';

describe('validate a Steuernummer', () => {
  it('error on un-allowed characters', () => {
    expect(validateSteuernummer('129043abc')).toEqual(
      defaultErrors.allowedCharactersError
    );
  });

  it('error w. custom msg on un-allowed characters', () => {
    expect(
      validateSteuernummer('129043abc', {
        errorMessages: { allowedCharactersError: 'Only digits, please!' },
      })
    ).toEqual('Only digits, please!');
  });

  it('error on too few digits', () => {
    expect(validateSteuernummer('123 456 789')).toEqual(
      defaultErrors.tooShortError
    );
    expect(validateSteuernummer('123 / 456 / 789')).toEqual(
      defaultErrors.tooShortError
    );
  });

  it('error on too many digits', () => {
    expect(validateSteuernummer('123 456 789 105 12')).toEqual(
      defaultErrors.tooLongError
    );
    expect(validateSteuernummer('123 / 456 / 789 / 105 / 12')).toEqual(
      defaultErrors.tooLongError
    );
  });

  it('error on missing 0 in 13-digit Steuernummer', () => {
    expect(validateSteuernummer('1123 4 17891051')).toEqual(
      defaultErrors.missingZeroError
    );
    expect(validateSteuernummer('1123 0 17891051')).toBeUndefined();
  });

  it('error on missing state information', () => {
    expect(validateSteuernummer('9381508152')).toEqual(
      defaultErrors.missingStateInformationError
    );
    expect(validateSteuernummer('12345678901')).toEqual(
      defaultErrors.missingStateInformationError
    );

    // passing the bundesland works:
    expect(
      validateSteuernummer('3756951296', { bundesland: 'DE-BE' })
    ).toBeUndefined();
  });

  it('error on invalid state prefix', () => {
    expect(validateSteuernummer('253 406 789 105 1')).toEqual(
      defaultErrors.unknownStatePrefixError
    );
    expect(validateSteuernummer('883 416 789 105')).toEqual(
      defaultErrors.unknownStatePrefixError
    );
    // state expressed in Steuernummer should be DE-BB, but given state is DE-BW:
    expect(
      validateSteuernummer('304881508155', { bundesland: 'DE-BW' })
    ).toEqual(defaultErrors.wrongStateError);
  });

  it('error on unallowed Bezirksnummer', () => {
    // case: MV "999" is not an allowed Bezirksnummer:
    expect(validateSteuernummer('4 079 0 999 0815 1')).toEqual(
      defaultErrors.bezirksnummerError
    );
    // case: NW "0998" is not an allowed Bezirksnummer:
    expect(validateSteuernummer('5 133 0 0998 815 9')).toEqual(
      defaultErrors.bezirksnummerError
    );
    // case:  Bezirksnummer under 100 (here: 99) not allowed for Bayrischer Programmierverbund:
    expect(validateSteuernummer('4 079 0 099 0815 1')).toEqual(
      defaultErrors.bezirksnummerError
    );
  });

  it('error on wrong internal consistency in NW', () => {
    // case: NW "0998" is not an allowed Bezirksnummer:
    expect(validateSteuernummer('5 133 0 0384 000 5')).toEqual(
      defaultErrors.nwInternalConsistencyError
    );
  });

  it('no error on valid Steuernummer', () => {
    expect(validateSteuernummer('9381508152', { lax: true })).toBeUndefined();
    expect(validateSteuernummer('918181508155')).toBeUndefined();
    expect(validateSteuernummer('5133081508159')).toBeUndefined();
    expect(
      validateSteuernummer('93 815 0815 2', { lax: true })
    ).toBeUndefined();
    expect(validateSteuernummer('9 / 181 / 815 / 0815 / 5')).toBeUndefined();
    expect(validateSteuernummer('5 133 0 8150 815 9')).toBeUndefined();
    expect(
      validateSteuernummer('45/748/01430', { bundesland: 'DE-HH' })
    ).toBeUndefined();
  });
});
