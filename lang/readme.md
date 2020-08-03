# Note to translators
First, let me thank you for taking your time to translate this module.

I have tried my best to make it possible to localize Monster Blocks completely,
but it's more than likely that I have missed something.
Feel free to post and issue or ping @zeel on Discord if there is anything that needs improved.

## Theme Names
Theme names are intended to sound slightly more fancy than just "dark" and "blue" but it is not nessesary
to translate these literally. You are more than welcome to rename themes in a way that seems appropriate for the target language.

## Locator Arrays
There are a few arrays of strings in the localization files.
These are used to match the names or descriptions of items and features in order to find special features.
These strings are essentially guesses of what someone *might* call a feature that does a particular thing.

Multiattack, for example, is called "Multiattack" in the Monster Manual.
However, player characters get "Extra Attack" as a feature, so it is more than likely that
someone will have a creature with a "Extra Attack" feature, and it should be treated the same as
Multiattack. In this case, that means making it the first action in the list of actions.

This matching system automatically transforms the item name or description to lower case,
and removes all white space. These strings therefore should be all lower case (if applicable)
and should not contain spaces. This means that "Multiattack" and "Multi Attack" are both matched by "multiattack".

I recommend rather than replacing the English strings, you simple add as many options in the target language as seem appropriate.
By keeping the English in addition to translated strings, untranslated creatures can still be filtered correctly.

### Perception Locator
`"MOBLOKS5E.PerceptionLocator"` is used to check whether or not the Senses string for the creature already mentions its passive perception, if this string isn't found, passive perception is added.

## Legendary and Lair actions, Spellcasting
The large paragraphs of text for these items are based on the text found in the SRD
and other 5e books. If an official translation of the SRD or Monster Manual is available
it would be preferable that the official text be used, rather than translating the English seen here.

## Ordinal Suffixes
This array of suffixes is used to format ordinals like "5th level spellcaster"
if the target language doesn't need these, make the array empty `[]`. 
If you need more the code will handle that just fine, add as many as needed.

If the sheet doens't seem to be able to handle the needs of the language,
please post an issue on [Github](https://github.com/zeel01/MonsterBlocks/issues)
I will see if there is a way to handle the need.
