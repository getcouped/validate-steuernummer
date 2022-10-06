# Validate Steuernummer

Validation of German Steuernummern.

```typescript
import { validateSteuernummer } from 'validate-steuernummer'

const err1 = validateSteuernummer('9/198/0/815/08152');
// err1 is `undefined`, because this is a valid Steuernummer from Bavaria

const err2 = validateSteuernummer('24 75 815 08154');
// err2 is `Die Prüfziffer der Steuernummer stimmt nicht`, because 4 is not the
// valid Prüfziffer for this Steuernummer from Bremen

// Optionally, provide the Bundesland that issued the Steuernummer:
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

* The given string contains only digits, spaces (`" "`), or slashes (`"/"`)
* The number of digits in the given string is between 10 and 13
* The state (Bundesland) issuing the Steuernummer is known
  * Either, because the Steuernummer contains a state prefix (i.e., is of length >= 12)
  * Or, because the [`bundesland` option](#options) was used to deliberately name the state (for example, when providing a Steuernummer using the common [Standardschema der Länder](https://de.wikipedia.org/wiki/Steuernummer#Aufbau_der_Steuernummer))
* The state information contained in the Steuernummer matches the `bundesland` option, if both are given
* The Bundesfinanzamtsnummer part of the Steuernummer references a known Bundesfinanzamt. The list to check against is based on the ["GemFA 2.0" (GEMeinden und FinanzAemter 2.0) data](https://www.bzst.de/DE/Service/Behoerdenwegweiser/Finanzamtsuche/finanzamtsuche.html), which lists 610 Finanzämter as of October 5th 2022.
* The Bezirksnummer part of the Steuernummer is valid (checking Bundesland-specific constraints)
* The Unterscheidungsnummer and Prüfziffer fulfill requirements specific to Nordrhein-Westfalen
* The Prüfziffer is valid. Relies on the "11er Verfahren", "2er Verfahren", or "Modifiziertes 11er Verfahren" depending on the Bundesland. In the case of a Steuernummer from Berlin, validation passes if the Prüfziffer matches that calculated either for the Berlin-A _or_ the Berlin-B scheme. Cf. [section 7.2 of this document](https://download.elster.de/download/schnittstellen/Pruefung_der_Steuer_und_Steueridentifikatsnummer.pdf).


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
* `lax`: If `true`, validation will ignore state-specific checks if the state issuing the given Steuernummer cannot be determined (i.e., if the Steuernummer does not include a state prefix, and the `bundesland` option was not used). In this case, validation will solely focus on the length of the given string and the used characters. Defaults to `false`.

## License
MIT
