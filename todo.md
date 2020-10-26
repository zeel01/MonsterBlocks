# TODO:

## Additions
- Broken item recovery area, for things like spells without a home.
- Add spellcasting in one click
- Guess spellcasting feature if none present but spells present.
- Add legres in one click
- Size scaling?
  - ~~Support a `scale` flag to rescale the window~~
  
## Changes
- Indicate to new users that the menu in the corner exists
  
## Fixes
- Window sizing is broken in Firefox
- Might still be missing some stuff from the damn formula data

## Cleanup
- Clean up classes from the template that aren't needed
- Add more comments to the code! <sup>much done!</sup>
- Re-organize code a bit
- Remove anything unused

## Back Burner
- Why does `duplicate()`ing the flags object cause an error sometimes? It's weird but seems to not cause any issue.
- FIX: Potential issue with flags getting deleted after constructor is called. <sup>Likely doesn't cause any harm, low priority</sup>
- Change to dependecy support for Input Expressions? Or not? <sup>For now, I'm keeping it as-is.</sup>
- Handle "other" damage? <sup>May not be consistant enough to implement.</sup>
- Toggle "Uses Lair Actions" when showing/hiding lair actions.<sup>The system doesn't seem to use this for anything yet.</sup>
- Some creatures have "sub features" like breath weapns, the bodies of these are indented. <sup>unsure if this is possible to do correctly</sup>
- Differentiate which cantrips belong to what casting feature. <sup>unsure how possible</sup>
- Unique target types should be formatted as so: <sup>This is not currently supported by the system.</sup>
	> Bite (Bat or Vampire Form Only). Melee Weapon Attack: +9 to hit, reach 5 ft., **one willing creature, or a creature that is grappled by the vampire, incapacitated, or restrained.** Hit: 7 (1d6 + 4) piercing damage plus 10 (3d6) necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken, and the vampire regains hit points equal to that amount. The reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0. A humanoid slain in this way and then buried in the ground rises the following night as a vampire spawn under the vampire's control.
