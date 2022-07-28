/**
 * A class to handle looking up statistics about the actor
 * that the associated sheet is for.
 *
 * @export
 * @class StatGetter
 */
export default class StatGetter {
	constructor(sheet, actor) {
		this.sheet = sheet;
		this.actor = actor;
	}

	/**
	 * Calculates the spell attack bonus of this actor
	 *
	 * @return {number} 
	 * @memberof StatGetter
	 */
	get spellAttackBonus() {
		const data = this.actor.data.data;
		const abilityBonus = data.abilities[this.castingAbility]?.mod;
		const profBonus = data.attributes?.prof;

		return abilityBonus + profBonus ?? 0;
	}

	/**
	 * Get which ability score is the the casting ability of this actor
	 * If none found, use 'int'
	 *
	 * @return {string}
	 * @memberof StatGetter
	 */
	get castingAbility() {
		return this.actor.data.data?.attributes?.spellcasting || "int";
	}

	/**
	 * Get the label for the ability that is the the casting ability of this actor
	 * If none found, use 'Intelligence' (localized)
	 *
	 * @return {string}
	 * @memberof StatGetter
	 */
	get castingAbilityLabel() {
		const abl = this.castingAbility;
		return game.i18n.localize(
			// Capitalize the first letter of the ability
			`DND5E.Ability${abl.charAt(0).toUpperCase() + abl.slice(1)}`
		);
	}

	/**
	 * Get the spell level of this actor
	 *
	 * @return {number}
	 * @memberof StatGetter
	 */
	get spellLevel() {
		return this.actor.data.data.details.spellLevel;
	}

	/**
	 * Get the spell DC of this actor
	 *
	 * @return {number}
	 * @memberof StatGetter
	 */
	get spellDc() {
		return this.actor.data.data?.attributes?.spelldc;
	}
}