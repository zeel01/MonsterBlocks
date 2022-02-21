import MonsterBlock5e from "./MonsterBlock5e.js";
import { simplifyRollFormula } from "../../../../systems/dnd5e/module/dice.js";
import Helpers from "./Helpers5e.js";
import { debug } from "../utilities.js";
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
			Helpers.isContinuousDescription(this.data.data.description.value);

		if (debug.enabled) console.debug(this);
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
		let attackData = this.item.data.data;
		
		return {
			attackType: this.getAttackType(this.item),
			tohit: this.formatToHit(),
			range: this.formatRange(attackData),
			target: this.formatTarget(attackData),
			versatile: this.getVersatileData(attackData),
			damage: this.dealsDamage() 
				? this.getAllDamageData(attackData)
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
	 * @param {object} atkd - Attack data
	 * @return {string}
	 * @memberof AttackPreper
	 */
	formatRange(atkd) {
		const reach = atkd.range?.reach; // reach value or null
		const range = atkd.range?.value; // range value or null
		const longRange = atkd.range?.long; // long range increment or null
		const units = atkd.range?.units; // units or null

		let format = "";

		if (reach) format = `${game.i18n.localize("MOBLOKS5E.reach")} ${reach} ${units}.`;

		if (reach && range) format += ` ${game.i18n.localize("MOBLOKS5E.Or")} `;

		if (range) {
			format += `${game.i18n.localize("MOBLOKS5E.range")} ${range}`;

			if (longRange) {
				format += `/${longRange}`;
			}
			format += ` ${units}.`
		}

		return format;
	}

	/**
	 * Formats the target(s) part of the description.
	 *
	 * @param {object} atkd - Attack data
	 * @return {string}
	 * @memberof AttackPreper
	 */
	formatTarget(atkd) {
		const quantity = Helpers.getNumberString(atkd.target.value ? atkd.target.value : 1);
		let type = atkd.target.type;                  // The target type

		if (!type) type = atkd.target.value > 1       // If the type wasn't defined, then 
			? game.i18n.localize("MOBLOKS5E.targetS") // if the value is greater than one it's plural
			: game.i18n.localize("MOBLOKS5E.target")  // Ortherwise singluar

		if (atkd.activation.condition) return atkd.activation.condition; // if the user has specified a custom targeting condition, use that instead of 1 target / 1 creature

		return game.i18n.format("MOBLOKS5E.AttackTarget", { quantity, type	});
	}

	/**
	 * Returns data for formatting versatile damage
	 *
	 * @param {object} atkd - Attack data
	 * @return {DamageData} 
	 * @memberof AttackPreper
	 */
	getVersatileData(atkd) {
		if (!atkd.damage.versatile) return false;
		return this.getDamageData(atkd.damage.parts[0], "v");
	}

	/**
	 * Retuirns data for formatting damage of all damage parts
	 *
	 * @param {object} atkd - Attack data
	 * @return {Array<DamageData} 
	 * @memberof AttackPreper
	 */
	getAllDamageData(atkd) {
		return atkd.damage.parts.map(this.getDamageData.bind(this));
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
			formula: this.damageFormula(index),
			average: this.averageDamage(index),
			type: this.getDamageType(part)
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
		return game.i18n.format("MOBLOKS5E.AttackDamageTemplate", {
			average: this.averageDamage(i),
			formula: this.damageFormula(i),
			type: this.getDamageType(part)
		});
	}

	getDamageType(part) {
		return part[1] ? game.i18n.localize("DND5E.Damage" + part[1].replace(/./, l => l.toUpperCase())).toLowerCase() : "";
	}	

	/**
	 * Determin which type of attack this is.
	 *
	 * @return {string} 
	 * @memberof AttackPreper
	 */
	getAttackType() {
		return this.item.data?.data?.properties?.thr ? game.i18n.localize("MOBLOKS5E.ThrownLabel") : CONFIG.DND5E.itemActionTypes[this.item?.data?.data?.actionType] || "";
	}

	/**
	 * Determine if this attack is ranged or not
	 *
	 * @return {Boolean} 
	 * @memberof AttackPreper
	 */
	isRangedAttack() {
		return ["rwak", "rsak"].includes(this.item.data.data?.actionType);
	}

	/**
	 * Extract the specified roll formula from the item
	 *
	 * @param {number|string} [index=0] - The index of the rollable formula within the parts of the damage. If 'v', this referes to the versitile damage formula.
	 * @return {string} A rollable formula 
	 * @memberof MonsterBlock5e
	 */
	getAttackFormula(index=0) {
		const atkd = this.item.data.data;

		if (index == "v") return atkd?.damage?.versatile  // Versitile formula is index 'v'
		
		const parts = atkd?.damage?.parts;
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
		return MonsterBlock5e.averageRoll(this.getAttackFormula(index), this.item.getRollData());
	}

	/**
	 * Gets the damage formula from an attack
	 *
	 * @param {number} [index=0] - The index of the damage formula in the damage parts
	 * @return {*} 
	 * @memberof AttackPreper
	 */
	damageFormula(index=0) {	// Extract and re-format the damage formula
		const roll = new Roll(this.getAttackFormula(index), this.item.getRollData());
		return simplifyRollFormula(roll.formula);
	}

	/**
	 * Whether or not this attack deals any damage
	 *
	 * @return {Boolean} 
	 * @memberof AttackPreper
	 */
	dealsDamage() {
		return Boolean(this.item.data.data?.damage?.parts?.length);
	}
}
