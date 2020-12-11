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

# Changelog

## Version 2.4.0

Added a number of strings to support Mini Blocks.
The new strings are added in the non-flat JSON format, going forward this is how
all new strings will be added. Eventually the whole file will be refactored into this format.

### Added 19 Strings:

```json
"MOBLOKS5E": {
	"mini-block": {
		"label": "Mini Blocks"
	},
	"compact-window": {
		"enable": "Enable Compact Window",
		"disable": "Disable Compact Window",
		"settings": {
			"name": "Compact Window",
			"hint": "Removes the window title bar, and makes the sheet appear more compact."
		}
	},
	"compact-layout": {
		"enable": "Enable Compact Layout",
		"disable": "Disable Compact Layout",
		"settings": {
			"name": "Compact Layout",
			"hint": "Reducs the spacing between items on the sheet to save space."
		}
	},
	"compact-feats": {
		"enable": "Enable Compact Features",
		"disable": "Disable Compact Features",
		"settings": {
			"name": "Compact Features",
			"hint": "Reduces the space taken up by features. When this setting is enabled, each feature will take up only two lines of space. Hovering your mouse over a fature will reveal the full description. Features can be expanded/compacted individually by clicking on them."
		}
	},
	"font-size": {
		"label": "Font Size",
		"placeholder": "Font Size (px)",
		"NaN-error": "Font size must be a number.",
		"settings": {
			"name": "Font Size",
			"hint": "Set the font size, in pixels, for text in the sheet. Other aspects of the sheet will scale accordingly, reducing font size will make the entire sheet much smaller while increasing it improves readablity."
		}
	},
	"resetDefaults": {
		"label": "Reset to Defaults"
	}
}
```

## Version 2.3.1

These are added to support Calego's 5e ability extension.
The abbreviations are for Honor, Sanity, and Bloodline

### Added 3 Strings:
```json
"MOBLOKS5E.Abbrhon": "hon",
"MOBLOKS5E.Abbrsan": "san",
"MOBLOKS5E.Abbrblo": "blo",
```
## Version: <= 2.3.0
### Added 3 strings:
```json
"MOBLOCKS5E.physicalDamage": "bludgeoning, piercing, and slashing from nonmagical attacks",
"MOBLOKS5E.SpeedUnitAbbrEnd": ".",
"MOBLOKS5E.FoundryThemeName": "Foundry",
```

## Version: 2.0.1
### Added 29 strings:
```json
"MOBLOKS5E.EditHint": "Right-click to edit",

"MOBLOKS5E.AddFeat": "Feature",
"MOBLOKS5E.AddAttack": "Attack",
"MOBLOKS5E.AddAct": "Action",
"MOBLOKS5E.AddSpell": "Spell",
"MOBLOKS5E.AddInventory": "Loot",
"MOBLOKS5E.AddConsumable": "Consumable",

"MOBLOKS5E.EnableEdit": "Enable editing",
"MOBLOKS5E.DisableEdit": "Disable editing",
"MOBLOKS5E.EnableDelete": "Enable delete",
"MOBLOKS5E.DisableDelete": "Disable delete",
"MOBLOKS5E.ShowNotProf": "Show not-proficient checks",
"MOBLOKS5E.HideNotProf": "Hide not-proficient checks",
"MOBLOKS5E.ShowResources": "Show Resource Values",
"MOBLOKS5E.HideResources": "Hide Resource Values",
"MOBLOKS5E.ShowSkillSave": "Always show skills & saves",
"MOBLOKS5E.HideSkillSave": "Hide empty skills & saves",
"MOBLOKS5E.OpenTokenizer": "Open VTTA Tokenizer",
"MOBLOKS5E.QuickInsert": "Quick Insert",

"MOBLOKS5E.MultiDamageAttackConjunctionPlus": "plus",

"MOBLOKS5E.AttackVersatile": "or {damage} damage if used with two hands",

"MOBLOKS5E.editing-name": "Editing Enabled",
"MOBLOKS5E.editing-hint": "Choose whether or not editing is enabled by default.",
"MOBLOKS5E.show-not-prof-name": "Show Non-Proficient Skills and Saves",
"MOBLOKS5E.show-not-prof-hint": "Choose whether or not showing not-proficient skills and saves is enabled by default."
"MOBLOKS5E.show-resources-name": "Show resource values",
"MOBLOKS5E.show-resources-hint": "Choose whether or not showing resource values by default."
"MOBLOKS5E.show-skill-save-name": "Always show skills & saves",
"MOBLOKS5E.show-skill-save-hint": "Choose whether or not to show empty skill and save lists by default."

```
### Edited 1 Strings:
```json
"MOBLOKS5E.LegendaryText": "The {name} can take {number} legendary actions, chooseing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The {name} regains spent legendary actions at the start of its turn.",

```
### Removed 0 Strings:
```json

```