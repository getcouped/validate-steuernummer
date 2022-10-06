# Validate Steuernummer

Best-effort[^1] validation of German Steuernummern.

```typescript
import { validateSteuernummer } from 'validate-steuernummer'

const err1 = validateSteuernummer('9/198/0/815/0815/2');
// err1 is `undefined`, because this is a valid Steuernummer from Bavaria

const err2 = validateSteuernummer('24 75 0 815 0815 4');
// err2 is `Die Prüfziffer der Steuernummer stimmt nicht`, because 4 is not a
// valid Prüfziffer for this Steuernummer from Bremen

// Optionally provide the Bundesland that issued the Steuernummer:
const err3 = validateSteuernummer('24/815/08151', { bundesland: 'DE-NI' });
// err3 is `undefined`, because this is a valid Steuernummer from Niedersachsen
```

## Summary

This library exposes a single `validateSteuernummer` function that takes one or two arguments:

1. A string `value` containing (possibly) a German Steuernummer
2. _Optionally_: an [options](#options) object

The function returns `undefined` if it deems the given `value` to be a valid Steuernummer, or an error string denoting why not.


## What is validated
Depending on the available information, this library checks that:

* The given string contains only digits, `" "` (spaces), `"-"`, `"_"`, or `"/"`
* The number of digits in the given string is between 10 and 13
* _**If**_ the given Steuernummer is of length >=12:
  * A valid prefix exists denoting the Bundesland that the Steuernummer belongs to
  * The Bundesland prefix matches the optionally given `bundesland` option
* _**If**_ the Bundesland of the Steuernummer is known (either derived from a Steuernummer with length => 12, or provided in the [options](#options)):
  * The Bundesfinanzamtsnummer part of the Steuernummer references a known Bundesfinanzamt. The list to check against is based on the ["GemFA 2.0" (GEMeinden und FinanzAemter 2.0) data](https://www.bzst.de/DE/Service/Behoerdenwegweiser/Finanzamtsuche/finanzamtsuche.html), which lists 610 Finanzämter as of October 5th 2022.
  * The Bezirksnummer part of the Steuernummer is valid (checking Bundesland-specific constraints)
  * The Unterscheidungsnummer and Prüfziffer fulfill requirements specific to Nordrhein-Westfalen
  * The Prüfziffer is valid. Relies on the "11er Verfahren", "2er Verfahren", or "Modifiziertes 11er Verfahren" depending on the Bundesland. In the case of a Steuernummer from Berlin, validation passes if the Prüfziffer matches that calculated either for Berlin-A _or_ Berlin-B scheme. Cf. [section 7.2 of this document](https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf).


For details about these and additional validation requirements of a Steuernummer, refer to [this document](https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf).



## Options
* `bundesland`: A string denoting one of the 16 German states using [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2:DE) notation. E.g., `DE-BE` for Berlin.
* `errorMessages`: An object allowing to overwrite the default (German) error messages returned. For example:
    ```typescript
    validateSteuernummer(/* ... */, { errorMessages: {
      allowedCharactersError:
        'Please only use digits, spaces, dashes, underscores, or slashes'
    }});
    ```

## License
MIT


[^1]: Why only _best-effort_? Because this library only takes into account information it has about a Steuernummer. If, for example, the Bundesland issuing a Steuernummer cannot be deduced from the provided Steuernummer (possible when the number is expressed using only the "Standardschema der Länder") and is not otherwise provided, Bundesland-specific features like a correct Prüfziffer are not validated. See the [what is validated](#what-is-validated) section.
