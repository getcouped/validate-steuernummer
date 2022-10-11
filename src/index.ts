import { FinanzamtNummern } from './finanzamtnummern';

export const defaultErrors = {
  allowedCharactersError:
    'Bitte nur Ziffern, "-", "_", "/" oder Leerzeichen verwenden',
  tooShortError: 'Eine Steuernummer muss mindestens 10 Ziffern enthalten',
  tooLongError: 'Eine Steuernummer darf maximal 13 Ziffern enthalten',
  wrongLengthForState: 'Die Steuernummer hat die falsche Länge',
  parseError: 'Die Steuernummer konnte nicht geparsed werden',
  missingZeroError:
    'Steuernummern zur elektronischen Übermittlung müssen an 5. Stelle eine "0" aufweisen',
  unknownStatePrefixError:
    'Die Steuernummer kann keinem Bundesland zugewiesen werden',
  unknownFinanzamtError:
    'Die Steuernummer kann keinem Finanzamt zugewiesen werden',
  wrongStateError:
    'Die Steuernummer entspricht nicht dem angegebenen Bundesland',
  bezirksnummerError: 'Die Steuernummer enthält eine invalide Bezirksnummer',
  pruefzifferError: 'Die Prüfziffer der Steuernummer stimmt nicht',
  nwInternalConsistencyError:
    'Die interne Konsistenz der Steuernummer ist nicht gegeben',
  missingStateInformationError:
    'Validierung fehlgeschlagen, weil unzureichende Informationen über das zugehörige Bundesland vorliegen',
};

type ErrorMessages = typeof defaultErrors;

export type ISO3166_2Codes =
  | 'DE-BW'
  | 'DE-BY'
  | 'DE-BE'
  | 'DE-BB'
  | 'DE-SN'
  | 'DE-ST'
  | 'DE-HB'
  | 'DE-HH'
  | 'DE-HE'
  | 'DE-MV'
  | 'DE-TH'
  | 'DE-NI'
  | 'DE-NW'
  | 'DE-RP'
  | 'DE-SL'
  | 'DE-SH';

type ISO3166_2Codes_11erVerfahren =
  | 'DE-BY'
  | 'DE-BE-A'
  | 'DE-BE-B'
  | 'DE-BB'
  | 'DE-HB'
  | 'DE-HH'
  | 'DE-MV'
  | 'DE-NI'
  | 'DE-NW'
  | 'DE-SL'
  | 'DE-SN'
  | 'DE-ST'
  | 'DE-TH';

const factors11erVerfahren: Record<ISO3166_2Codes_11erVerfahren, number[]> = {
  'DE-BY': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-BE-A': [0, 0, 0, 0, 0, 7, 6, 5, 8, 4, 3, 2],
  'DE-BE-B': [0, 0, 2, 9, 0, 8, 7, 6, 5, 4, 3, 2],
  'DE-BB': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-HB': [0, 0, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-HH': [0, 0, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-MV': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-NI': [0, 0, 2, 9, 0, 8, 7, 6, 5, 4, 3, 2],
  'DE-NW': [0, 3, 2, 1, 0, 7, 6, 5, 4, 3, 2, 1],
  'DE-SL': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-SN': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-ST': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
  'DE-TH': [0, 5, 4, 3, 0, 2, 7, 6, 5, 4, 3, 2],
};

const factorsModified11erVerfahren = [0, 0, 1, 2, 0, 1, 2, 1, 2, 1, 2, 1];

const summands2erVerfahren = [0, 0, 9, 8, 0, 7, 6, 5, 4, 3, 2, 1];

const factors2erVerfahren = [0, 0, 512, 256, 0, 128, 64, 32, 16, 8, 4, 2];

/**
 * List of Bezirksnummer values which are invalid, according to
 * https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf
 */
const forbiddenBezirksnummer = ['000', '998', '999', '0000', '0998', '0999'];

type Options = {
  bundesland?: ISO3166_2Codes;
  errorMessages?: Partial<ErrorMessages>;
  lax?: boolean;
};

/**
 * Returns `undefined`, if the given `val` is a valid German Steuernummer. If
 * not, returns and error describing the first violated constraint met during
 * the validation process.
 *
 * Using the second options argument, a `bundesland` can be passed to explicitly
 * state the Bundesland the Steuernummer should belong to.
 *
 * This is what's being validated:
 *
 *  - The given string contains only digits, ' ', or '/'
 *  - The number of digits in the given string is between 10 and 13
 *  - The state (Bundesland) issuing the Steuernummer is known
 *    - Either, because the Steuernummer contains a state prefix (i.e., is of
 *      length >= 12)
 *    - Or, because the `bundesland` option was used to deliberately name the
 *      state (for example, when providing a Steuernummer using the common
 *      Standardschema der Länder)
 *  - The state information contained in the Steuernummer matches the
 *    `bundesland` option, if both are given
 *  - The Bundesfinanzamtsnummer part of the Steuernummer references a known
 *    Bundesfinanzamt. The list to check against is based on the "GemFA 2.0"
 *    (GEMeinden und FinanzAemter 2.0) data, which lists 610 Finanzämter as of
 *    October 5th 2022.
 *  - The Bezirksnummer part of the Steuernummer is valid (checking Bundesland-
 *    specific constraints)
 *  - The Unterscheidungsnummer and Prüfziffer fulfill requirements specific to
 *    Nordrhein-Westfalen
 *  - The Prüfziffer is valid. In the case of a Steuernummer from Berlin,
 *    validation passes if the Prüfziffer matches that calculated either for the
 *    Berlin-A _or_ the Berlin-B scheme.
 *
 * Cf. https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf
 *
 * Using the second options argument, all / individual error messages (default
 * to German) can be overwritten.
 */
export function validateSteuernummer(val: string, options?: Options) {
  try {
    const errorMsgs = {
      ...defaultErrors,
      ...(typeof options?.errorMessages === 'object'
        ? options.errorMessages
        : {}),
    };

    // check whether only allowed characters are used:
    if (!/^[0-9\/\s]*$/gm.test(val)) {
      return errorMsgs.allowedCharactersError;
    }

    // extract digits:
    const digitMatches = val.match(/[0-9]/g);
    const digits = digitMatches?.join('') || '';

    // validate length:
    if (digits.length < 10) {
      return errorMsgs.tooShortError;
    }
    if (digits.length > 13) {
      return errorMsgs.tooLongError;
    }

    // determine the possible Bundesländer that issued this Steuernummer:
    const states =
      typeof options?.bundesland !== 'undefined'
        ? [options.bundesland]
        : getStates(digits);

    // abort if no Bundesland can be determined - this is the poorest form of
    // validation:
    if (states.length === 0 && digits.length < 12) {
      if (options?.lax) {
        return;
      }
      return errorMsgs.missingStateInformationError;
    }

    // validate that a known state prefix was provided:
    if (states.length === 0 && digits.length >= 12) {
      return errorMsgs.unknownStatePrefixError;
    }

    // validate that a (possibly) given `bundesland` matches the one derivable
    // from the Steuernummer:
    const derivedStates = getStates(digits);
    if (
      typeof options?.bundesland === 'string' &&
      derivedStates.length > 0 &&
      !derivedStates.includes(options.bundesland)
    ) {
      return errorMsgs.wrongStateError;
    }

    // at this point, we know the bundesland of the Steuernummer - so we can
    // obtain a "normalized" version, i.e., one following the "Vereinheitlichtes
    // Bundesschema zur elektronischen Übermittlung" of length 13:
    const normalizedDigits = getNormalizedDigits(digits, states, errorMsgs);

    // validate that a Steuernummer expressed in the "Vereinheitlichtes
    // Bundesschema zur elektronischen Übermittlung" contains a `0` at the fifth
    // position:
    if (normalizedDigits.charAt(4) !== '0') {
      return errorMsgs.missingZeroError;
    }

    // validate that the "Bundesfinanzamtsnummer" (first 4 digits of normalized
    // Steuernummer) reference one of the known Finanzämter in Germany:
    if (!FinanzamtNummern.has(normalizedDigits.substring(0, 4))) {
      return errorMsgs.unknownFinanzamtError;
    }

    // validate that the Steuernummer does not use an explicitly forbidden
    // Bezirksnummer:
    const bezirksnummer = getBezirksnummer(normalizedDigits);
    if (forbiddenBezirksnummer.includes(bezirksnummer)) {
      return errorMsgs.bezirksnummerError;
    }

    // validate that the Bezirksnummer does not violate constraints for states of
    // the bayerischen Programmierverbundes:
    const isBayerischerProgrammierVerbund =
      getIsBayerischerProgrammierverbund(states);
    if (isBayerischerProgrammierVerbund && parseInt(bezirksnummer) < 100) {
      return errorMsgs.bezirksnummerError;
    }

    // validate that the "Kombination aus Unterscheidungsnummer und Prüfziffer
    // (UUUP) stets größer als 0009" for a Steuernummer from Nordrhein-Westfalen:
    if (
      states.includes('DE-NW') &&
      parseInt(normalizedDigits.substring(normalizedDigits.length - 4)) < 9
    ) {
      return errorMsgs.nwInternalConsistencyError;
    }

    // validate the Prüfziffer:
    const pruefziffern = getPruefziffern(normalizedDigits, states);
    if (
      pruefziffern.length > 0 &&
      !pruefziffern.includes(
        parseInt(normalizedDigits.charAt(normalizedDigits.length - 1))
      )
    ) {
      return errorMsgs.pruefzifferError;
    }

    return undefined;
  } catch (error: any) {
    return error.message;
  }
}

const statesWith10Digits = new Set<ISO3166_2Codes>([
  'DE-BW',
  'DE-BE',
  'DE-HB',
  'DE-HH',
  'DE-NI',
  'DE-RP',
  'DE-SH',
]);

const statesWith11Digits = new Set<ISO3166_2Codes>([
  'DE-BY',
  'DE-BB',
  'DE-HE',
  'DE-MV',
  'DE-NW',
  'DE-SL',
  'DE-SN',
  'DE-ST',
  'DE-TH',
]);

/**
 * Returns a normalized version of the given Steuernummer, i.e., one following
 * the "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung". It's
 * length will be 13. Requires information about the state issuing the
 * Steuernummer being provided, either as a state prefix in the given `digits`,
 * or via an entry in the given `states`.
 */
function getNormalizedDigits(
  digits: string,
  states: ISO3166_2Codes[],
  errors: ErrorMessages
) {
  // nothing to do for already normalized Steuernummern:
  if (digits.length === 13) {
    return digits;
  }

  // only add a `0` at the 5th place:
  if (digits.length === 12) {
    return `${digits.substring(0, 4)}0${digits.substring(4, 12)}`;
  }

  if (
    digits.length !== 10 &&
    states.every((state) => statesWith10Digits.has(state))
  ) {
    throw new Error(errors.wrongLengthForState);
  }

  if (
    digits.length !== 11 &&
    states.every((state) => statesWith11Digits.has(state))
  ) {
    throw new Error(errors.wrongLengthForState);
  }

  // Compilation based on https://github.com/kontist/normalize-steuernummer:
  const { ff, fff, bbb, bbbb, uuu, uuuu, p } = parse(digits, states, errors);

  switch (states[0]) {
    case 'DE-BW':
      return `28${ff}0${bbb}${uuuu}${p}`;
    case 'DE-BY':
      return `9${fff}0${bbb}${uuuu}${p}`;
    case 'DE-BE':
      return `11${ff}0${bbb}${uuuu}${p}`;
    case 'DE-BB':
    case 'DE-SN':
    case 'DE-ST':
      return `3${fff}0${bbb}${uuuu}${p}`;
    case 'DE-HB':
      return `24${ff}0${bbb}${uuuu}${p}`;
    case 'DE-HH':
      return `22${ff}0${bbb}${uuuu}${p}`;
    case 'DE-HE':
      return `26${ff}0${bbb}${uuuu}${p}`;
    case 'DE-MV':
    case 'DE-TH':
      return `4${fff}0${bbb}${uuuu}${p}`;
    case 'DE-NI':
      return `23${ff}0${bbb}${uuuu}${p}`;
    case 'DE-NW':
      return `5${fff}0${bbbb}${uuu}${p}`;
    case 'DE-RP':
      return `27${ff}0${bbb}${uuuu}${p}`;
    case 'DE-SL':
      return `1${fff}0${bbb}${uuuu}${p}`;
    case 'DE-SH':
      return `21${ff}0${bbb}${uuuu}${p}`;
  }
}

/**
 * Returns the ISO 3166-2 codes of the states (Bundesländer) identified by the
 * first one or two digits of the given Steuernummer.
 *
 * Returns an empty array if the Steuernummer cannot be deduced.
 *
 * Returns possibly multiple codes, as the relation between digit prefix and
 * Länder is not one-to-one.
 */
function getStates(digits: string): ISO3166_2Codes[] {
  if (digits.length < 12) {
    return [];
  }
  if (digits.startsWith('9')) {
    return ['DE-BY'];
  } else if (digits.startsWith('5')) {
    return ['DE-NW'];
  } else if (digits.startsWith('4')) {
    return ['DE-TH', 'DE-MV'];
  } else if (digits.startsWith('3')) {
    return ['DE-BB', 'DE-SN', 'DE-ST'];
  } else if (digits.startsWith('28')) {
    return ['DE-BW'];
  } else if (digits.startsWith('27')) {
    return ['DE-RP'];
  } else if (digits.startsWith('26')) {
    return ['DE-HE'];
  } else if (digits.startsWith('24')) {
    return ['DE-HB'];
  } else if (digits.startsWith('23')) {
    return ['DE-NI'];
  } else if (digits.startsWith('22')) {
    return ['DE-HH'];
  } else if (digits.startsWith('21')) {
    return ['DE-SH'];
  } else if (digits.startsWith('11')) {
    return ['DE-BE'];
  } else if (digits.startsWith('1')) {
    return ['DE-SL'];
  }
  return [];
}

/**
 * Returns `true`, if any of the given `states` entries is one belonging to the
 * "bayerischer Programmierverband".
 */
function getIsBayerischerProgrammierverbund(states: ISO3166_2Codes[]) {
  return (
    states.includes('DE-BY') ||
    states.includes('DE-BB') ||
    states.includes('DE-MV') ||
    states.includes('DE-SL') ||
    states.includes('DE-SN') ||
    states.includes('DE-ST') ||
    states.includes('DE-TH')
  );
}

/**
 * Returns the Bezirksnummer part of the given `normalizedDigits`.
 * The Bezirksnummer is only 4 digits long, if the state issuing the
 * Steuernummer is Nordrhein-Westfalen.
 */
function getBezirksnummer(normalizedDigits: string) {
  return normalizedDigits.substring(
    normalizedDigits.length - 8,
    normalizedDigits.length - 8 + (normalizedDigits.startsWith('5') ? 4 : 3)
  );
}

/**
 * Returns an array of Prüfziffern for the given `normalizedDigits` and
 * `states`.
 *
 * The array will contain two Prüfziffern in case of the Bundesland being
 * 'DE-BE', as Berlin uses two different mechanisms to determine the Prüfziffer.
 * Returning both deliberately trades off precision for reduced complexity and
 * fewer inputs required for this function.
 *
 * Note that `states` possibly contains multiple entries (e.g., when deduced
 * from a Steuernummer starting with `3`: `['DE-BB', 'DE-SN', 'DE-ST']`). This,
 * however, is not an issue as in all such cases, the calculation of the
 * Prüfziffer is exactly the same between these states (incl. w.r.t. the
 * calculation method and factors used in the calculation).
 */
function getPruefziffern(
  normalizedDigits: string,
  states: ISO3166_2Codes[]
): number[] {
  // w.o. knowing the Bundesland, we cannot determine the Prüfziffer:
  if (normalizedDigits.length !== 13 || states.length === 0) {
    throw new Error(
      `Cannot call getPruefziffern with a non-normalized Steuernummer or without providing states`
    );
  }

  if (states.includes('DE-RP')) {
    return [getPruefzifferModified11er(normalizedDigits)];
  } else if (
    states.includes('DE-BW') ||
    states.includes('DE-HE') ||
    states.includes('DE-SH')
  ) {
    return [getPruefziffer2er(normalizedDigits)];
  } else if (states.includes('DE-BE')) {
    return [
      getPruefziffer11er(normalizedDigits, 'DE-BE-A'),
      getPruefziffer11er(normalizedDigits, 'DE-BE-B'),
    ];
  } else {
    return [
      getPruefziffer11er(
        normalizedDigits,
        states[0] as ISO3166_2Codes_11erVerfahren
      ),
    ];
  }
}

/**
 * Determines the Prüfziffer of the given `normalizedDigits` (string of digits
 * with length 12) using the 2er-Verfahren (used in DE-BW, DE-HE, and DE-SH).
 */
export function getPruefziffer2er(normalizedDigits: string) {
  const sums = [];
  for (let i = 0; i < 12; i++) {
    sums.push(parseInt(normalizedDigits[i]) + summands2erVerfahren[i]);
  }
  const sumsSingleDigits = sums.map((p) => p % 10);
  const products = sumsSingleDigits.map((s, i) => s * factors2erVerfahren[i]);

  // repeatedly sum up the digits of items until they are all single-digit:
  let digitSums = products.map(sumDigits);
  while (digitSums.find((s) => s > 9)) {
    digitSums = digitSums.map(sumDigits);
  }

  const sum = digitSums.reduce((sum, current) => (sum += current), 0);
  if (sum % 10 === 0) {
    return 0;
  }
  return 10 * Math.ceil(sum / 10) - sum;
}

/**
 * Determines the Prüfziffer of the given `normalizedDigits` (string of digits
 * with length 12) using the modified 11er Verfahren (used in DE-RP).
 */
export function getPruefzifferModified11er(normalizedDigits: string) {
  const products = [];
  for (let i = 0; i < 12; i++) {
    products.push(
      parseInt(normalizedDigits[i]) * factorsModified11erVerfahren[i]
    );
  }
  const singleDigits = products.map((p) => (p > 9 ? (p % 10) + 1 : p));

  const sum = singleDigits.reduce((sum, current) => (sum += current), 0);

  return 10 * Math.ceil(sum / 10) - sum;
}

/**
 * Determines the Prüfziffer of the given `normalizedDigits` (string of digits
 * with length 12) using the 11er Verfahren (used in most Bundeslaender, where
 * not the 2er Verfahren or modified 11er Verfahren is used).
 */
export function getPruefziffer11er(
  normalizedDigits: string,
  land: ISO3166_2Codes_11erVerfahren
) {
  const products = [];
  for (let i = 0; i < 12; i++) {
    products.push(
      parseInt(normalizedDigits[i]) * factors11erVerfahren[land][i]
    );
  }

  const sum = products.reduce((sum, current) => (sum += current), 0);

  if (land === 'DE-NW') {
    return sum % 11;
  } else {
    if (sum % 11 === 0) return 0;
    return 11 * Math.ceil(sum / 11) - sum;
  }
}

/**
 * Returns the sum of digits of the given `num`.
 */
function sumDigits(num: number): number {
  let sum = 0;
  while (num) {
    sum += num % 10;
    num = Math.floor(num / 10);
  }
  return sum;
}

/**
 * Parses the given `digits` (with length 10 or 11) depending on the given
 * `states`.
 *
 * Based on https://github.com/kontist/normalize-steuernummer
 */
function parse(
  digits: string,
  states: ISO3166_2Codes[],
  errors: ErrorMessages
) {
  if (
    states.includes('DE-BW') ||
    states.includes('DE-BE') ||
    states.includes('DE-HB') ||
    states.includes('DE-HH') ||
    states.includes('DE-NI') ||
    states.includes('DE-RP') ||
    states.includes('DE-SH')
  ) {
    // Format: FF/BBB/UUUUP
    const matches = digits.match(
      /(?<ff>\d{2})(?<bbb>\d{3})(?<uuuu>\d{4})(?<p>\d{1})/
    );
    if (!matches || !matches.groups) {
      throw new Error(errors.parseError);
    }
    return matches.groups;
  } else if (
    states.includes('DE-BY') ||
    states.includes('DE-BB') ||
    states.includes('DE-MV') ||
    states.includes('DE-SL') ||
    states.includes('DE-SN') ||
    states.includes('DE-ST') ||
    states.includes('DE-TH')
  ) {
    // Format: FFF/BBB/UUUUP.
    const matches = digits.match(
      /(?<fff>\d{3})(?<bbb>\d{3})(?<uuuu>\d{4})(?<p>\d{1})/
    );
    if (!matches || !matches.groups) {
      throw new Error(errors.parseError);
    }
    return matches.groups;
  } else if (states.includes('DE-HE')) {
    // Format: 0FF/BBB/UUUUP.
    const matches = digits.match(
      /0(?<ff>\d{2})(?<bbb>\d{3})(?<uuuu>\d{4})(?<p>\d{1})/
    );
    if (!matches || !matches.groups) {
      throw new Error(errors.parseError);
    }
    return matches.groups;
  } else if (states.includes('DE-NW')) {
    const matches = digits.match(
      /(?<fff>\d{3})(?<bbbb>\d{4})(?<uuu>\d{3})(?<p>\d{1})/
    );
    if (!matches || !matches.groups) {
      throw new Error(errors.parseError);
    }
    return matches.groups;
  }
  throw new Error(errors.parseError);
}
