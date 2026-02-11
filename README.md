# Validate Steuernummer

Validation of [German Steuernummern](https://de.wikipedia.org/wiki/Steuernummer#Deutschland). Written in TypeScript, exposed as ESM and UMD.


## Installation

```bash
npm i validate-steuernummer
```
Or:
```bash
yarn add validate-steuernummer
```


## Usage: Validation

```typescript
import { validateSteuernummer } from 'validate-steuernummer'

// Providing a Steuernummer in the "Vereinheitlichtes Bundesschema zur
// elektronischen Übermittlung":
const err1 = validateSteuernummer('9/198/0/815/08152');
// err1 is `undefined`, because this is a valid Steuernummer from Bavaria

// Providing a Steuernummer in the "Vereinheitlichtes Bundesschema":
const err2 = validateSteuernummer('24 75 815 08154');
// err2 is `Die Prüfziffer der Steuernummer stimmt nicht`, because 4 is not the
// valid Prüfziffer for this Steuernummer from Bremen

// Providing a Steuernummer in the "Standardschema der Länder", and additionally
// passing the Bundesland that issued the Steuernummer:
const err3 = validateSteuernummer('24/815/08151', { bundesland: 'DE-NI' });
// err3 is `undefined`, because this is a valid Steuernummer from Niedersachsen
```

This library exposes a `validateSteuernummer` function that takes one or two arguments:

1. A string `value` containing (possibly) a German Steuernummer
2. _Optionally_: an [options](#options) object

The function returns `undefined` if it deems the given `value` to be a valid Steuernummer, or an error string denoting why not.


## Usage: Parsing

```typescript
import { validateSteuernummer } from 'validate-steuernummer'

const {
  bezirksnummer, // '815',
  bundesfinanzamtnummer, // '2653',
  normalizedSteuernummer, // '2653081508158',
  pruefziffer, // '8',
  statePrefix, // '26',
  states, // 'DE-HE',
  unterscheidungsnummer, // '0815',
} = parseSteuernummer('053 815 08158', {
  bundesland: 'DE-HE',
});
```

This library exposes a `parseSteuernummer` function that takes one or two arguments:

1. A string `value` containing (possibly) a German Steuernummer
2. _Optionally_: an [options](#options) object

The function throws an error if parsing fails. Note that this function _does not further validate_ the given Steuernummer.


## What's being validated?
This library checks that:

* The given string contains only digits, spaces (`" "`), and slashes (`"/"`)
* The number of digits in the given string is between 10 and 13
* The state ("Bundesland") issuing the Steuernummer is known
  * Either, because the Steuernummer contains a valid state prefix (which means it must be of length >= 12)
  * Or, because the [`bundesland` option](#options) was used to deliberately name the issuing state (this is useful when providing a Steuernummer in the commonly used [Standardschema der Länder](https://de.wikipedia.org/wiki/Steuernummer#Aufbau_der_Steuernummer), which means it is contains 11 or 12 digits only)
* The state information contained in the Steuernummer matches the `bundesland` option, in case both are given
* The Bundesfinanzamtsnummer part of the Steuernummer references a known Bundesfinanzamt. This library checks against ["GemFA 2.0" (GEMeinden und FinanzAemter 2.0)](https://www.bzst.de/DE/Service/Behoerdenwegweiser/Finanzamtsuche/finanzamtsuche.html) data, which lists 593 Finanzämter as of February 2nd 2026.
* The Bezirksnummer part of the Steuernummer is valid (checking state-specific constraints)
* The Unterscheidungsnummer and Prüfziffer fulfill requirements specific to Nordrhein-Westfalen
* The Prüfziffer is valid. Relies on the "11er Verfahren", "2er Verfahren", or "Modifiziertes 11er Verfahren" depending on the issuing state. In the case of a Steuernummer from Berlin, validation passes if the Prüfziffer matches that calculated either for the Berlin-A _or_ the Berlin-B scheme (cf. [section 7.2 of this document](https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf)).


For details about the validation requirements for Steuernummern, refer to [this document](https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf).


## Options
* `bundesland`: A string denoting one of the 16 German states using [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2:DE) notation. E.g., `DE-BE` for Berlin.
* `errorMessages`: An object allowing to overwrite the default (German) error messages returned. For example:
    ```typescript
    validateSteuernummer(/* ... */, { errorMessages: {
      allowedCharactersError:
        'Please only use digits, spaces, dashes, underscores, or slashes'
    }});
    ```

## Related libraries
* [kontist/normalize-steuernummer](https://github.com/kontist/normalize-steuernummer) for translating Steuernummern in the "Standardschema der Länder" or "Vereinheitlichtes Bundesschema" into the normalized "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung"
* [kontist/denormalize-steuernummer](https://github.com/kontist/denormalize-steuernummer) for translating a Steuernummer in the "Vereinheitlichtes Bundesschema zur elektronischen Übermittlung" into one in the "Standardschema der Länder" + the issuing state
* [kontist/validate-steuerid](https://github.com/kontist/validate-steuerid) for validating German Steuer-IDs (Steuernummer and Steuer-ID are _not_ the same)


## License
MIT
