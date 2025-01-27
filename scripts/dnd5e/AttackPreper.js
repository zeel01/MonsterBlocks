import MonsterBlock5e from "./MonsterBlock5e.js";
import Helpers from "./Helpers5e.js";
import { debug, isDndV4OrNewer } from "../utilities.js";
import ItemPreper from "./ItemPreper.js";

/**
 * Prepares the data for an Attack item
 *
 * @export
 * @class AttackPreper
 * @extends {ItemPreper}
 */
export default class AttackPreper extends ItemPreper {
	/**
	 * @override
	 * @memberof AttackPreper
	 */
	prepare() {
		this.data.tohit = this.item.labels.toHit;
		this.data.description = this.getDescription();
		this.data.continuousDescription =
			Helpers.isContinuousDescription(this.data.system.description.value);

		if (debug.enabled) console.debug(this);
	}

	/**
	 * Returns normalized attack/damage information for this attack
	 *
	 * @return {object}
	 * @memberof AttackPreper
	 */
	get attackData() {
		let attackData;
		if (!isDndV4OrNewer()) {
			attackData = this.item.system;
		} else {
			attackData = {...this.item.system?.activities?.find(a => a.type === "attack")};
			attackData.damage = {
				parts: attackData.damage.parts.map(p => [
					p.formula,
					p.types.first()
				]),
				versatile: this.item.system.damage.versatile.formula
			};
		}
		return attackData;
	}

	/**
	 * @typedef AttackDescription
	 * @property {string} attackType        - Type of attack, melee vs ranged, weapon, etc.
	 * @property {string} tohit             - Bonus to hit
	 * @property {string} range             - Range or reach
	 * @property {string} target            - What type of target, and how many
	 * @property {DamageData} versatile     - The damage and formula for versatile damage
	 * @property {Array<DamageData>} damage - All of the damage formulas for all types of additional damage
	 *
	 *//**
	 * Constructs the data for this attack's description
	 *
	 * @return {AttackDescription}
	 * @memberof AttackPreper
	 */
	getDescription() {
		/** @type {WeaponData} */

		return {
			attackType: this.getAttackType(),
			tohit: this.formatToHit(),
			range: this.formatRange(),
			target: this.formatTarget(),
			versatile: this.getVersatileData(),
			damage: this.dealsDamage()
				? this.getAllDamageData()
				: []
		}
	}

	/**
	 * Formats the "to hit" part of the description.
	 *
	 * "{+/-bonus} to hit"
	 *
	 * @return {string}
	 * @memberof AttackPreper
	 */
	formatToHit() {
		const tohit = this.item.labels.toHit || "0";
		let bonus = `+${tohit}`                        // If nothing else changes, then it's just +toHit

		if (["+", "-"].includes(tohit.charAt(0))) {    // If the value is already signed
			bonus = tohit.charAt(1) == " "             //   If the second character is a space (after the sign)
				? tohit.slice(0, 1) + tohit.slice(2)   //     Slice out the space
				: tohit;                               //   Otherwise leave as it
		}

		return game.i18n.format("MOBLOKS5E.AttackToHit", { bonus });
	}

	/**
	 * Formats the range part of the description
	 *
	 * "{reachRange} {range}{sep}{max} {units}.",
	 *
	 * @return {string}
	 * @memberof AttackPreper
	 */
	formatRange() {
		/** @type {number|null} */
		const longRange = this.item.system.range?.long;     // The long range increment, or null
		const reachRange = game.i18n.localize(
			this.isRangedAttack(this.item)      // If the attack is ranged
				? "MOBLOKS5E.range"             // Localize range, otherwise reach
				: "MOBLOKS5E.reach"
		);

		return game.i18n.format("MOBLOKS5E.AttackRange", {
			reachRange,
			range: this.item.system.range?.value,
			sep: longRange ? "/" : "",
			max: longRange ? longRange : "",
			units: this.item.system.range?.units
		})
	}

	/**
	 * Formats the target(s) part of the description.
	 *
	 * "{reachRange} {range}{sep}{max} {units}."
	 *
	 * @return {string}
	 * @memberof AttackPreper
	 */
	formatTarget() {
		const quantity = Helpers.getNumberString(this.attackData?.target.value ?? 1);
		let type = this.attackData?.target.type;                  // The target type

		if (!type) type = this.attackData?.target.value > 1       // If the type wasn't defined, then
			? game.i18n.localize("MOBLOKS5E.targetS") // if the value is greater than one it's plural
			: game.i18n.localize("MOBLOKS5E.target")  // Ortherwise singluar

		if (this.attackData?.activation.condition) return this.attackData?.activation.condition; // if the user has specified a custom targeting condition, use that instead of 1 target / 1 creature

		return game.i18n.format("MOBLOKS5E.AttackTarget", { quantity, type });
	}

	/**
	 * Returns data for formatting versatile damage
	 *
	 * @return {DamageData}
	 * @memberof AttackPreper
	 */
	getVersatileData() {
		if (!this.attackData?.damage.versatile) return false;
		return this.getDamageData(this.attackData.damage.parts[0], "v");
	}

	/**
	 * Returns data for formatting damage of all damage parts
	 *
	 * @return {Array<DamageData}
	 * @memberof AttackPreper
	 */
	getAllDamageData() {
		return this.attackData.damage.parts.map(this.getDamageData.bind(this));
	}

	/**
	 * @typedef DamageData
	 * @property {string} text    - The textual description of the damage being dealt
	 * @property {string} formula - The rollable formula for the damage
	 *//**
	 *
	 * Returns the data for a damage roll
	 *
	 * @param {*} part
	 * @param {number|string} index - The index of the damage in the attack array, or "v" for versatile
	 * @return {DamageData}
	 * @memberof AttackPreper
	 */
	getDamageData(part, index) {
		return {
			text: this.formatAttackAndDamage(index, part),
			formula: this.damageFormula(index)
		}
	}

	/**
	 * Formats the attack and damage part of the description.
	 *
	 * "{average} ({formula}) {type}"
	 *
	 * @param {number} i - The index of the damage
	 * @param {*} part
	 * @return {*}
	 * @memberof AttackPreper
	 */
	formatAttackAndDamage(i, part) {
		const type = game.i18n.localize(                    // The damage type
			"DND5E.Damage" +                                // The localization prefix for damage types
				part[1].replace(/./, l => l.toUpperCase())  // Capitalize the string at part[1]
		).toLowerCase()                                     // After localization, make all lower case

		return game.i18n.format("MOBLOKS5E.AttackDamageTemplate", {
			average: this.averageDamage(i),
			formula: this.damageFormula(i),
			type
		});
	}

	/**
	 * Determine which type of attack this is.
	 *
	 * @return {string}
	 * @memberof AttackPreper
	 */
	getAttackType() {
		return CONFIG.DND5E.itemActionTypes[this.attackData?.actionType] || "";
	}

	/**
	 * Determine if this attack is ranged or not
	 *
	 * @return {Boolean}
	 * @memberof AttackPreper
	 */
	isRangedAttack() {
		return ["rwak", "rsak"].includes(this.attackData?.actionType);
	}

	/**
	 * Extract the specified roll formula from the item
	 *
	 * @param {number|string} [index=0] - The index of the rollable formula within the parts of the damage. If 'v', this referes to the versatile damage formula.
	 * @return {string} A rollable formula
	 * @memberof MonsterBlock5e
	 */
	getAttackFormula(index=0) {
		if (index == "v") return this.attackData.damage?.versatile;  // Versatile formula is index 'v'

		const parts = this.attackData.damage?.parts;
		if (parts?.length > 0) return parts[index][0];    // If there are any parts, return the one at index

		return 0;                                         // Otherwise, the formula is "0"
	}

	/**
	 * Get the average damage for a given damage roll
	 *
	 * @param {number} [index=0] - The index of the damage formula in the damage parts
	 * @return {string}
	 * @memberof AttackPreper
	 */
	averageDamage(index=0) {
		let attackFormula = this.getAttackFormula(index);
		if (isDndV4OrNewer() && this.item.type === "weapon" && index == 0 && !/@mod\b/.test(attackFormula)) attackFormula += " + @mod";
		const rollData = !isDndV4OrNewer() ? this.item.getRollData() : this.item.system.activities?.find(a => a.type === "attack")?.getRollData();
		return MonsterBlock5e.averageRoll(attackFormula, rollData);
	}

	/**
	 * Gets the damage formula from an attack
	 *
	 * @param {number} [index=0] - The index of the damage formula in the damage parts
	 * @return {*}
	 * @memberof AttackPreper
	 */
	damageFormula(index=0) {	// Extract and re-format the damage formula
		let attackFormula = this.getAttackFormula(index);
		if (isDndV4OrNewer() && this.item.type === "weapon" && index == 0 && !/@mod\b/.test(attackFormula)) attackFormula += " + @mod";
		const rollData = !isDndV4OrNewer() ? this.item.getRollData() : this.item.system.activities?.find(a => a.type === "attack")?.getRollData();
		const roll = new Roll(attackFormula, rollData);
		const dice = game[game.system.id].dice;
		const simplifyRollFormula = dice?.simplifyRollFormula;
		return simplifyRollFormula(roll.formula);
	}

	/**
	 * Whether or not this attack deals any damage
	 *
	 * @return {Boolean}
	 * @memberof AttackPreper
	 */
	dealsDamage() {
		return Boolean(this.attackData.damage?.parts?.length);
	}
}
