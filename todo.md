# TODO:

## Additions
- ~~Add hit point modification~~
- ~~Add theme support~~
- Add Themes:
	- ~~Per monster selection~~
	- ~~"Custom" option~~
	- ~~"Clean" theme that's a white background.~~
	- ~~"Dark" theme~~
	- ~~"Ice" theme~~
	- ~~"Red" theme~~

## Changes
- ~~Section for reactions seperate from actions.~~
- Convert static strings to language file references. (`game.i18n.format`) <sup>*in progress*</sup>
	- Spell slots
	- Make legendary and lair action descriptions localizable
	- Make spellcasting description localizable
	- Replace use of commas and periods with localizable strings
	- Indicate to new users that the menu in the corner exists
	- Localize settings
	- Ordinals?

## Fixes
- ~~Hide the comma after creature type if there is no alignment specified.~~
- ~~"Hit Points" not "Darkness"~~
- ~~Handlebars "equals" conflics with another module~~
- Missing action uses? Example: Aboleth.enslave

## Cleanup
- Clean up classes from the template that aren't needed
- Add more comments to the code! <sup>much done!</sup>
- Re-organize code a bit
- Remove anything unused
- Refactor away as many Handlebars helpers as possible.
- Replace redundant helpers with ones from Core/just-handlebars-helpers
- Add `mobloks5e-` to the names of remaining helpers to prevent name collisions with other modules.

## Back Burner
- Rolls for saves/skills that aren't listed (not proficient) <sup>One can simply roll an ability check</sup>
- Some creatures have "sub features" like breath weapns, the bodies of these are indented. <sup>unsure if this is possible to do correctly</sup>
- Differentiate which cantrips belong to what casting feature. <sup>unsure how possible</sup>
- Unique target types should be formatted as so: <sup>This is not currently supported by the system.</sup>
	> Bite (Bat or Vampire Form Only). Melee Weapon Attack: +9 to hit, reach 5 ft., **one willing creature, or a creature that is grappled by the vampire, incapacitated, or restrained.** Hit: 7 (1d6 + 4) piercing damage plus 10 (3d6) necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken, and the vampire regains hit points equal to that amount. The reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0. A humanoid slain in this way and then buried in the ground rises the following night as a vampire spawn under the vampire's control.
