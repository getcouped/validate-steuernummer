export const defaultErrors = {
  allowedCharactersError:
    'Bitte nur Ziffern, "-", "_", "/" oder Leerzeichen verwenden',
  tooShortError: 'Eine Steuernummer muss mindestens 10 Ziffern enthalten',
  tooLongError: 'Eine Steuernummer darf maximal 13 Ziffern enthalten',
  missingZeroError:
    'Steuernummern zur elektronischen Übermittlung müssen an 5. Stelle eine "0" aufweisen',
  unknownStatePrefixError:
    'Die Steuernummer kann keinem Bundesland zugewiesen werden',
  wrongStateError:
    'Die Steuernummer entspricht nicht dem angegebenen Bundesland',
  bezirksnummerError: 'Die Steuernummer enthält eine invalide Bezirksnummer',
  pruefzifferError: 'Die Prüfziffer der Steuernummer stimmt nicht',
  nwInternalConsistencyError:
    'Die interne Konsistenz der Steuernummer ist nicht gegeben',
};

type ErrorMessages = typeof defaultErrors;

type ISO3166_2Codes =
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
 *  - The given string contains only digits, ' ', '-', '_', or '/'
 *  - The number of digits in the given string is between 10 and 13
 *  - If the given Steuernummer is of length >=12:
 *    - A valid prefix exists denoting the Bundesland that the Steuernummer
 *      belongs to
 *    - The Bundesland prefix matches the optionally given `bundesland` option
 *  - If the Bundesland of the Steuernummer is known (either derived from a
 *    Steuernummer with length => 12, or provided by the caller):
 *    - The Bezirksnummer part of the Steuernummer is valid (checking
 *      Bundesland-specific constraints)
 *    - The Unterscheidungsnummer and Prüfziffer fulfill requirements specific
 *      to Nordrhein-Westfalen
 *    - The Prüfziffer is valid. In the case of a Steuernummer from Berlin,
 *      validation passes if the Prüfziffer matches that calculated either for
 *      Berlin-A _or_ Berlin-B scheme.
 *
 * Cf. https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf
 *
 * Using the second options argument, all / individual error messages (default
 * to German) can be overwritten.
 */
export function validateSteuernummer(val: string, options?: Options) {
  const errorMsgs = {
    ...defaultErrors,
    ...(typeof options?.errorMessages === 'object'
      ? options.errorMessages
      : {}),
  };

  // check whether only allowed characters are used:
  if (!/^[0-9-_\/\s]*$/gm.test(val)) {
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

  if (digits.length === 13) {
    // case: "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung"
    if (digits.charAt(4) !== '0') {
      return errorMsgs.missingZeroError;
    }
  }

  const laender =
    typeof options?.bundesland !== 'undefined'
      ? [options.bundesland]
      : getBundeslaender(digits);

  if (digits.length === 12 || digits.length === 13) {
    // unknown state prefix:
    if (laender.length === 0) {
      return errorMsgs.unknownStatePrefixError;
    }
    // mismatch in land named in options vs. in Steuernummer:
    if (
      typeof options?.bundesland === 'string' &&
      !getBundeslaender(digits).includes(options.bundesland)
    ) {
      return errorMsgs.wrongStateError;
    }
  }

  const bezirksnummer = getBezirksnummer(digits, laender);

  // check set of explicitly forbidden Bezirksnummern:
  if (forbiddenBezirksnummer.includes(bezirksnummer)) {
    return errorMsgs.bezirksnummerError;
  }

  // check if constraints by bayerischen Programmierverbundes
  const isBayerischerProgrammierVerbund =
    getIsBayerischerProgrammierverbund(laender);
  if (isBayerischerProgrammierVerbund && parseInt(bezirksnummer) < 100) {
    return errorMsgs.bezirksnummerError;
  }

  // check for NW that "Kombination aus Unterscheidungsnummer und Prüfziffer (UUUP) stets größer als 0009":
  if (
    laender.includes('DE-NW') &&
    parseInt(digits.substring(digits.length - 4)) < 9
  ) {
    return errorMsgs.nwInternalConsistencyError;
  }

  // check Prüfziffer:
  const pruefziffern = getPruefziffern(digits, laender);
  if (
    pruefziffern.length > 0 &&
    !pruefziffern.includes(parseInt(digits.charAt(digits.length - 1)))
  ) {
    return errorMsgs.pruefzifferError;
  }

  return undefined;
}

/**
 * Returns the ISO 3166-2 codes of the Bundesländer identified by the first one
 * or two digits of the given steuernummer.
 *
 * Returns an empty array if the Steuernummer cannot be deduced.
 *
 * Returns possibly multiple codes, as the relation between digit prefix and
 * Länder is not one-to-one.
 */
function getBundeslaender(digits: string): ISO3166_2Codes[] {
  if (digits.length !== 12 && digits.length !== 13) {
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
 * Bundesland for the given `laender`.
 */
function getLaenderPrefix(laender: ISO3166_2Codes[]) {
  if (laender.includes('DE-BW')) {
    return 28;
  } else if (laender.includes('DE-BY')) {
    return 9;
  } else if (laender.includes('DE-BE')) {
    return 11;
  } else if (
    laender.includes('DE-BB') ||
    laender.includes('DE-SN') ||
    laender.includes('DE-ST')
  ) {
    return 3;
  } else if (laender.includes('DE-HB')) {
    return 24;
  } else if (laender.includes('DE-HH')) {
    return 22;
  } else if (laender.includes('DE-HE')) {
    return 26;
  } else if (laender.includes('DE-MV') || laender.includes('DE-TH')) {
    return 4;
  } else if (laender.includes('DE-NI')) {
    return 23;
  } else if (laender.includes('DE-NW')) {
    return 5;
  } else if (laender.includes('DE-RP')) {
    return 27;
  } else if (laender.includes('DE-SL')) {
    return 1;
  } else if (laender.includes('DE-SH')) {
    return 21;
  }
  throw new Error('Invalid laender provided to getLaenderPrefix');
}

/**
 * Returns `true`, if any of the given `laender` entries is one belonging to the
 * "bayerischer Programmierverband".
 */
function getIsBayerischerProgrammierverbund(laender: ISO3166_2Codes[]) {
  return (
    laender.includes('DE-BY') ||
    laender.includes('DE-BB') ||
    laender.includes('DE-MV') ||
    laender.includes('DE-SL') ||
    laender.includes('DE-SN') ||
    laender.includes('DE-ST') ||
    laender.includes('DE-TH')
  );
}

/**
 * Returns the Bezirksnummer part of the given `digits` (string of digits with
 * length between 10 and 13).
 */
function getBezirksnummer(digits: string, laender: ISO3166_2Codes[]) {
  return digits.substring(
    digits.length - 8,
    digits.length - 8 + (laender.includes('DE-NW') ? 4 : 3)
  );
}

/**
 * Returns an array of Prüfziffern for the given `digits` and `laender`.
 *
 * The array will be empty if the given information does not suffice to
 * determine a Prüfziffer (e.g., if `lander` is empty and no Bundesland can
 * be inferred from the given `digits`).
 *
 * The array will contain two Prüfziffern in case of the Bundesland being
 * 'DE-BE', as Berlin uses two different mechanisms to determine the Prüfziffer.
 * Returning both deliberately trades off precision for reduced complexity and
 * fewer inputs required for this function.
 *
 * Note that `laender` possibly contains multiple entries (e.g., when deduced
 * from a Steuernummer starting with `3`: `['DE-BB', 'DE-SN', 'DE-ST']`). This,
 * however, is not an issue as in all such cases, the calculation of the
 * Prüfziffer is exactly the same between these laender (incl. w.r.t. the
 * factors used in the calculations).
 */
function getPruefziffern(digits: string, laender: ISO3166_2Codes[]): number[] {
  // w.o. knowing the Bundesland, we cannot determine the Prüfziffer:
  if (laender.length === 0) {
    return [];
  }

  // create version incl. prefix, length is 12:
  const digitsWithPrefix =
    digits.length === 10 || digits.length === 11
      ? getLaenderPrefix(laender) + digits
      : digits;
  const normalizedDigits =
    digitsWithPrefix.length === 13
      ? digitsWithPrefix
      : `${digitsWithPrefix.substring(0, 4)}0${digits.substring(4, 12)}`;

  if (laender.includes('DE-RP')) {
    return [getPruefzifferModified11er(normalizedDigits)];
  } else if (
    laender.includes('DE-BW') ||
    laender.includes('DE-HE') ||
    laender.includes('DE-SH')
  ) {
    return [getPruefziffer2er(normalizedDigits)];
  } else if (laender.includes('DE-BE')) {
    return [
      getPruefziffer11er(normalizedDigits, 'DE-BE-A'),
      getPruefziffer11er(normalizedDigits, 'DE-BE-B'),
    ];
  } else {
    return [
      getPruefziffer11er(
        normalizedDigits,
        laender[0] as ISO3166_2Codes_11erVerfahren
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
