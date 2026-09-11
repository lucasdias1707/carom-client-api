# Translating Carom

English is the source. `en.ts` is where a key is invented, and the other two
files are typed as `Catalogue = typeof en` — so a key added to English and
nowhere else fails `pnpm run typecheck` in the same commit that added it.
There is no runtime fallback, because a runtime fallback is a way of shipping a
half-translated screen without noticing.

## The rules that matter more than any individual word

**One sentence per key.** Never build a sentence by concatenating two of them.
Word order is one of the things a translation gets to decide, and a sentence
assembled from fragments takes that decision away — `saveMessage` used to glue
a verb onto a name, and that is why it now takes a finished title instead.

**A placeholder that has to be an element uses `tNodes`.** The translation
still decides where `{name}` falls in the sentence; the caller only decides
that it is bold. Putting `<strong>` inside a catalogue string would make the
translator responsible for markup, and a stray tag is a rendering bug nobody
sees until that language is on screen.

**Count with `{ one, other }`.** English, Portuguese and Spanish agree that one
thing is singular and everything else — zero included — is plural, so the two
forms cover all three. A language that disagrees needs `pluralForm` in
`lib/i18n.ts` to grow a case before it can be added.

**Never translate what the reader wrote.** Request names, URLs, headers,
bodies, scripts and variable values are theirs. Switching language changes the
interface around their work, not their work.

## What stays in English

HTTP methods and header names. `JSON`, `XML`, `GraphQL`, `curl`, `OpenAPI`,
`Postman`, `Insomnia`, `Bearer`, `Basic`. The app's own proper nouns — Carom,
and the built-in palette and font theme names (Midnight, Ember, Forest, Paper).
A palette that renames itself per language is a palette you can no longer point
a colleague at.

## Glossary

Decided once here so it is not re-decided per file. Consistency is worth more
than finding the most elegant word for a single screen.

| English | Português (BR) | Español |
| --- | --- | --- |
| request | requisição | solicitud |
| response | resposta | respuesta |
| header | cabeçalho | cabecera |
| body | corpo | cuerpo |
| environment | ambiente | entorno |
| variable | variável | variable |
| workspace | workspace | espacio de trabajo |
| folder | pasta | carpeta |
| draft | rascunho | borrador |
| unsaved | não salvo | sin guardar |
| save | salvar | guardar |
| send | enviar | enviar |
| settings | configurações | ajustes |
| shortcut | atalho | atajo |
| tab | aba | pestaña |
| sidebar | barra lateral | barra lateral |
| companion server | servidor auxiliar | servidor auxiliar |

`workspace` is kept as-is in Portuguese and translated in Spanish on purpose:
Brazilian developers say "workspace", and "espaço de trabalho" reads like a
translation of a word nobody uses out loud. Spanish-speaking tooling does say
"espacio de trabajo".

## Register

Portuguese and Spanish both address the reader directly and informally — *você*
and *tú*. Spanish is neutral: no voseo, and no vocabulary that belongs to one
country. Both keep the English original's habit of saying what happens rather
than what the app does: "a version before it is kept here", not "the system
stores the previous version".
