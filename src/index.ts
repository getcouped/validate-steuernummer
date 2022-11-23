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
    'Unzureichende Informationen über das zugehörige Bundesland',
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
};

type OptionsWithErrors = Options & { errorMessages: ErrorMessages };

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
export function validateSteuernummer(value: string, options?: Options) {
  try {
    const errorMessages = {
      ...defaultErrors,
      ...(typeof options?.errorMessages === 'object'
        ? options.errorMessages
        : {}),
    };

    // at this point, we know the bundesland of the Steuernummer - so we can
    // obtain a "normalized" version, i.e., one following the "Vereinheitlichtes
    // Bundesschema zur elektronischen Übermittlung" of length 13:
    const {
      bundesfinanzamtnummer,
      bezirksnummer,
      states,
      unterscheidungsnummer,
      pruefziffer,
      normalizedSteuernummer,
    } = parseSteuernummer(value, {
      ...options,
      errorMessages,
    });

    // validate that the "Bundesfinanzamtsnummer" (first 4 digits of normalized
    // Steuernummer) reference one of the known Finanzämter in Germany:
    if (!FinanzamtNummern.has(bundesfinanzamtnummer)) {
      throw new Error(errorMessages.unknownFinanzamtError);
    }

    // validate that the Steuernummer does not use an explicitly forbidden
    // Bezirksnummer:
    if (forbiddenBezirksnummer.includes(bezirksnummer)) {
      throw new Error(errorMessages.bezirksnummerError);
    }

    // validate that the Bezirksnummer does not violate constraints for states of
    // the bayerischen Programmierverbundes:
    const isBayerischerProgrammierVerbund =
      getIsBayerischerProgrammierverbund(states);
    if (isBayerischerProgrammierVerbund && parseInt(bezirksnummer) < 100) {
      throw new Error(errorMessages.bezirksnummerError);
    }

    // validate that the "Kombination aus Unterscheidungsnummer und Prüfziffer
    // (UUUP) stets größer als 0009" for a Steuernummer from
    // Nordrhein-Westfalen:
    if (
      states.includes('DE-NW') &&
      parseInt(unterscheidungsnummer + pruefziffer) < 9
    ) {
      throw new Error(errorMessages.nwInternalConsistencyError);
    }

    // validate the Prüfziffer:
    const pruefziffern = getPruefziffern(normalizedSteuernummer, states);
    if (
      pruefziffern.length > 0 &&
      !pruefziffern.includes(parseInt(pruefziffer))
    ) {
      throw new Error(errorMessages.pruefzifferError);
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

export type ParsedSteuernummer = {
  // Steuernummer w. 13 digits: `FFFF 0 BBB UUUU P` or `FFFF 0 BBBB UUU P`
  normalizedSteuernummer: string;
  states: ISO3166_2Codes | ISO3166_2Codes[];
  statePrefix: string;
  bundesfinanzamtnummer: string;
  bezirksnummer: string;
  unterscheidungsnummer: string;
  pruefziffer: string;
};

/**
 * Parses the steuernummer contained in the given `value`, or throws an error if
 * parsing is not possible. `value` could contain a steuernummer in the:
 *  - "Standardschema der Länder"
 *  - "Vereinheitlichtes Bundesschema"
 *  - "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung"
 */
export function parseSteuernummer(
  value: string,
  options: OptionsWithErrors
): ParsedSteuernummer {
  const { errorMessages } = options;

  // check whether only allowed characters are used:
  if (!/^[0-9\/\s]*$/gm.test(value)) {
    throw new Error(errorMessages.allowedCharactersError);
  }

  // extract digits:
  const digits = value.replace(/[^0-9]/gi, '');

  // validate length:
  if (digits.length < 10) {
    throw new Error(errorMessages.tooShortError);
  }
  if (digits.length > 13) {
    throw new Error(errorMessages.tooLongError);
  }

  // parse depending on what schema the Steuernummer is (most likely) in:
  if (digits.length === 13) {
    return parseSteuernummerBundesschemaElectric(digits, options);
  } else if (digits.length === 12) {
    return parseSteuernummerBundesschema(digits, options);
  } else {
    return parseSteuernummerStandardschema(digits, options);
  }
}

/**
 * Parses the given `digits` with length 13, which represent a steuernummer in
 * the "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung".
 */
function parseSteuernummerBundesschemaElectric(
  digits: string,
  options: OptionsWithErrors
): ParsedSteuernummer {
  // determine the possible Bundesländer that issued this Steuernummer:
  const states = getStates(digits);

  // validate that a given `bundesland` matches the state(s) identified by the
  // given digits:
  if (
    typeof options?.bundesland !== 'undefined' &&
    !states.includes(options.bundesland)
  ) {
    throw new Error(options.errorMessages.wrongStateError);
  }

  // validate that the fifth digit is a `0`:
  if (digits.charAt(4) !== '0') {
    throw new Error(options.errorMessages.missingZeroError);
  }

  const matches = digits.match(
    states.includes('DE-NW')
      ? // Format: FFFF 0 BBBB UUU P:
        /(?<bundesfinanzamtnummer>\d{4})(?<z>0)(?<bezirksnummer>\d{4})(?<unterscheidungsnummer>\d{3})(?<pruefziffer>\d{1})/
      : // Format: FFFF 0 BBB UUUU P:
        /(?<bundesfinanzamtnummer>\d{4})(?<z>0)(?<bezirksnummer>\d{3})(?<unterscheidungsnummer>\d{4})(?<pruefziffer>\d{1})/
  );
  if (!matches || !matches.groups) {
    throw new Error(options.errorMessages.parseError);
  }
  const {
    bundesfinanzamtnummer,
    bezirksnummer,
    unterscheidungsnummer,
    pruefziffer,
  } = matches.groups;
  return {
    bezirksnummer,
    bundesfinanzamtnummer,
    states: options.bundesland
      ? options.bundesland
      : states.length === 1
      ? states[0]
      : states,
    statePrefix: getStatesPrefix(states, options.errorMessages),
    normalizedSteuernummer: digits,
    pruefziffer,
    unterscheidungsnummer,
  };
}

/**
 * Parses the given `digits` with length 12, which represent a steuernummer in
 * the "Vereinheitlichtes Bundesschema".
 */
function parseSteuernummerBundesschema(
  digits: string,
  options: OptionsWithErrors
): ParsedSteuernummer {
  // determine the possible Bundesländer that issued this Steuernummer:
  const states = getStates(digits);

  // validate that a given `bundesland` matches the state(s) identified by the
  // given digits:
  if (
    typeof options?.bundesland !== 'undefined' &&
    !states.includes(options.bundesland)
  ) {
    throw new Error(options.errorMessages.wrongStateError);
  }

  const matches = digits.match(
    states.includes('DE-NW')
      ? // Format: FFFF BBBB UUU P:
        /(?<bundesfinanzamtnummer>\d{4})(?<bezirksnummer>\d{4})(?<unterscheidungsnummer>\d{3})(?<pruefziffer>\d{1})/
      : // Format: FFFF BBB UUUU P:
        /(?<bundesfinanzamtnummer>\d{4})(?<bezirksnummer>\d{3})(?<unterscheidungsnummer>\d{4})(?<pruefziffer>\d{1})/
  );
  if (!matches || !matches.groups) {
    throw new Error(options.errorMessages.parseError);
  }
  const {
    bundesfinanzamtnummer,
    bezirksnummer,
    unterscheidungsnummer,
    pruefziffer,
  } = matches.groups;
  return {
    bezirksnummer,
    bundesfinanzamtnummer,
    states: options.bundesland
      ? options.bundesland
      : states.length === 1
      ? states[0]
      : states,
    statePrefix: getStatesPrefix(states, options.errorMessages),
    normalizedSteuernummer:
      digits.substring(0, 4) + '0' + digits.substring(4, 12),
    pruefziffer,
    unterscheidungsnummer,
  };
}

/**
 * Parses the given `digits` with length 10 or 11, which represent a
 * steuernummer in the "Standardschema der Länder". Requires a valid
 * `bundesland` option to be passed as well.
 */
function parseSteuernummerStandardschema(
  digits: string,
  options: OptionsWithErrors
): ParsedSteuernummer {
  const bundesland = options?.bundesland;
  if (typeof bundesland === 'undefined') {
    throw new Error(options.errorMessages.missingStateInformationError);
  }

  if (digits.length !== 10 && statesWith10Digits.has(bundesland)) {
    throw new Error(options.errorMessages.wrongLengthForState);
  }

  if (digits.length !== 11 && statesWith11Digits.has(bundesland)) {
    throw new Error(options.errorMessages.wrongLengthForState);
  }

  // Parsing based on https://github.com/kontist/normalize-steuernummer
  switch (bundesland) {
    case 'DE-BW':
    case 'DE-BE':
    case 'DE-HB':
    case 'DE-HH':
    case 'DE-NI':
    case 'DE-RP':
    case 'DE-SH': {
      // Format: FF/BBB/UUUUP.
      const matches = digits.match(
        /(?<ff>\d{2})(?<bbb>\d{3})(?<uuuu>\d{4})(?<p>\d{1})/
      );
      if (!matches || !matches.groups) {
        throw new Error(options.errorMessages.parseError);
      }
      const { ff, bbb, uuuu, p } = matches.groups;
      const statePrefix = getStatesPrefix([bundesland], options.errorMessages);
      return {
        bezirksnummer: bbb,
        bundesfinanzamtnummer: statePrefix + ff,
        normalizedSteuernummer: `${statePrefix}${ff}0${bbb}${uuuu}${p}`,
        unterscheidungsnummer: uuuu,
        pruefziffer: p,
        statePrefix,
        states: bundesland,
      };
    }
    case 'DE-BY':
    case 'DE-BB':
    case 'DE-MV':
    case 'DE-SL':
    case 'DE-SN':
    case 'DE-ST':
    case 'DE-TH': {
      // Format: FFF/BBB/UUUUP.
      const matches = digits.match(
        /(?<fff>\d{3})(?<bbb>\d{3})(?<uuuu>\d{4})(?<p>\d{1})/
      );
      if (!matches || !matches.groups) {
        throw new Error(options.errorMessages.parseError);
      }
      const { fff, bbb, uuuu, p } = matches.groups;
      const statePrefix = getStatesPrefix([bundesland], options.errorMessages);
      return {
        bezirksnummer: bbb,
        bundesfinanzamtnummer: statePrefix + fff,
        normalizedSteuernummer: `${statePrefix}${fff}0${bbb}${uuuu}${p}`,
        unterscheidungsnummer: uuuu,
        pruefziffer: p,
        statePrefix,
        states: bundesland,
      };
    }
    case 'DE-HE': {
      // Format: 0FF/BBB/UUUUP.
      const matches = digits.match(
        /0(?<ff>\d{2})(?<bbb>\d{3})(?<uuuu>\d{4})(?<p>\d{1})/
      );
      if (!matches || !matches.groups) {
        throw new Error(options.errorMessages.parseError);
      }
      const { ff, bbb, uuuu, p } = matches.groups;
      const statePrefix = getStatesPrefix([bundesland], options.errorMessages);
      return {
        bezirksnummer: bbb,
        bundesfinanzamtnummer: statePrefix + ff,
        normalizedSteuernummer: `${statePrefix}${ff}0${bbb}${uuuu}${p}`,
        unterscheidungsnummer: uuuu,
        pruefziffer: p,
        statePrefix,
        states: bundesland,
      };
    }
    case 'DE-NW': {
      // Format: FFF/BBBB/UUUP.
      const matches = digits.match(
        /(?<fff>\d{3})(?<bbbb>\d{4})(?<uuu>\d{3})(?<p>\d{1})/
      );
      if (!matches || !matches.groups) {
        throw new Error(options.errorMessages.parseError);
      }
      const { fff, bbbb, uuu, p } = matches.groups;
      const statePrefix = getStatesPrefix([bundesland], options.errorMessages);
      return {
        bezirksnummer: bbbb,
        bundesfinanzamtnummer: statePrefix + fff,
        normalizedSteuernummer: `${statePrefix}${fff}0${bbbb}${uuu}${p}`,
        unterscheidungsnummer: uuu,
        pruefziffer: p,
        statePrefix,
        states: bundesland,
      };
    }
    default:
      throw new Error('Das angegebene Bundesland ist ungültig');
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
 * Returns the numeric prefix used in federal Steuernummern to identify a
 * states (Bundesland) for the given `states`.
 */
function getStatesPrefix(
  states: ISO3166_2Codes[],
  errorMessages: ErrorMessages
) {
  if (states.includes('DE-BW')) {
    return '28';
  } else if (states.includes('DE-BY')) {
    return '9';
  } else if (states.includes('DE-BE')) {
    return '11';
  } else if (
    states.includes('DE-BB') ||
    states.includes('DE-SN') ||
    states.includes('DE-ST')
  ) {
    return '3';
  } else if (states.includes('DE-HB')) {
    return '24';
  } else if (states.includes('DE-HH')) {
    return '22';
  } else if (states.includes('DE-HE')) {
    return '26';
  } else if (states.includes('DE-MV') || states.includes('DE-TH')) {
    return '4';
  } else if (states.includes('DE-NI')) {
    return '23';
  } else if (states.includes('DE-NW')) {
    return '5';
  } else if (states.includes('DE-RP')) {
    return '27';
  } else if (states.includes('DE-SL')) {
    return '1';
  } else if (states.includes('DE-SH')) {
    return '21';
  }
  throw new Error(errorMessages.unknownStatePrefixError);
}

/**
 * Returns `true`, if any of the given `states` entries is one belonging to the
 * "bayerischer Programmierverband".
 */
function getIsBayerischerProgrammierverbund(
  states: ISO3166_2Codes | ISO3166_2Codes[]
) {
  const statesToCheck = Array.isArray(states) ? states : [states];
  return (
    statesToCheck.includes('DE-BY') ||
    statesToCheck.includes('DE-BB') ||
    statesToCheck.includes('DE-MV') ||
    statesToCheck.includes('DE-SL') ||
    statesToCheck.includes('DE-SN') ||
    statesToCheck.includes('DE-ST') ||
    statesToCheck.includes('DE-TH')
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
  states: ISO3166_2Codes | ISO3166_2Codes[]
): number[] {
  const statesToCheck = Array.isArray(states) ? states : [states];
  // w.o. knowing the Bundesland, we cannot determine the Prüfziffer:
  if (normalizedDigits.length !== 13 || states.length === 0) {
    throw new Error(
      `Cannot call getPruefziffern with a non-normalized Steuernummer or without providing states`
    );
  }

  if (statesToCheck.includes('DE-RP')) {
    return [getPruefzifferModified11er(normalizedDigits)];
  } else if (
    statesToCheck.includes('DE-BW') ||
    statesToCheck.includes('DE-HE') ||
    statesToCheck.includes('DE-SH')
  ) {
    return [getPruefziffer2er(normalizedDigits)];
  } else if (statesToCheck.includes('DE-BE')) {
    return [
      getPruefziffer11er(normalizedDigits, 'DE-BE-A'),
      getPruefziffer11er(normalizedDigits, 'DE-BE-B'),
    ];
  } else {
    return [
      getPruefziffer11er(
        normalizedDigits,
        statesToCheck[0] as ISO3166_2Codes_11erVerfahren
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
