# TODO:

## Foundry 0.7.x
- Switch from Roll static methods to `.evaluate()`
- Deal with the quick switch cog menu displaying over top of the normal cog menu. Seems that the `renderActorSheet5eNPC` Hook is being called for some reason? Foundry bug?

## Additions
- ~~**Editing (for version 2)**~~
- ~~Resource tracking~~
- ~~Input sanitization~~
- ~~Auto select numbers~~
- Broken item recovery area, for things like spells without a home.

## Changes
- Toggle skill/save drop downs
- Indicate to new users that the menu in the corner exists
- Rollable hit points
- ~~Rolls for saves/skills that aren't listed (not proficient) <sup>One can simply roll an ability check</sup>~~

  
## Fixes
- VTTA Tokenizer
- ~~Passive perception needs different handling for editable sheet~~
- ~~Handle fractional challenge ratings~~
- ~~Input Expressions isn't working on ammo.~~

## Cleanup
- Clean up classes from the template that aren't needed
- Add more comments to the code! <sup>much done!</sup>
- Re-organize code a bit
- Remove anything unused

## Back Burner
- Support Quick Inserts <sup>Needs support from @Sunspots</sup>
  - ~~Add menu item~~
  - Correct style
- Change to dependecy support for Input Expressions? Or not? <sup>For now, I'm keeping it as-is.</sup>
- Handle "other" damage? <sup>May not be consistant enough to implement.</sup>
- Toggle "Uses Lair Actions" when showing/hiding lair actions.<sup>The system doesn't seem to use this for anything yet.</sup>
- Some creatures have "sub features" like breath weapns, the bodies of these are indented. <sup>unsure if this is possible to do correctly</sup>
- Differentiate which cantrips belong to what casting feature. <sup>unsure how possible</sup>
- Unique target types should be formatted as so: <sup>This is not currently supported by the system.</sup>
	> Bite (Bat or Vampire Form Only). Melee Weapon Attack: +9 to hit, reach 5 ft., **one willing creature, or a creature that is grappled by the vampire, incapacitated, or restrained.** Hit: 7 (1d6 + 4) piercing damage plus 10 (3d6) necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken, and the vampire regains hit points equal to that amount. The reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0. A humanoid slain in this way and then buried in the ground rises the following night as a vampire spawn under the vampire's control.
