import MonsterBlock5e from "./MonsterBlock5e.js";
import { simplifyRollFormula } from "../../../../systems/dnd5e/module/dice.js";
import Helpers from "./Helpers5e.js";
import { debugging } from "../utilities.js";
import ItemPreper from "./ItemPreper.js";

export default class AttackPreper extends ItemPreper {
	/**
	 *
	 * @override
	 * @memberof AttackPreper
	 */
	prepare() {
		this.data.tohit = this.item.labels.toHit;
		this.data.description = this.getDescription();
		this.data.continuousDescription = 
			Helpers.isContinuousDescription(this.data.data.description.value);

		if (debugging()) console.debug(this);
	}

	getDescription() {
		let atkd = this.item.data.data;
		let tohit = this.item.labels.toHit || "0";
		
		return {
			attackType: this.getAttackType(this.item),
			tohit: game.i18n.format("MOBLOKS5E.AttackToHit", {
				bonus: ["+", "-"].includes(tohit.charAt(0))
					? tohit.charAt(1) == " " ? tohit.slice(0, 1) + tohit.slice(2) : tohit
					: `+${tohit}`
			}),
			range: game.i18n.format("MOBLOKS5E.AttackRange", {
				reachRange: game.i18n.localize(this.isRangedAttack(this.item) ? "MOBLOKS5E.range" : "MOBLOKS5E.reach"),
				range: atkd.range?.value,
				sep: atkd.range?.long ? "/" : "",
				max: atkd.range?.long ? atkd.range.long : "",
				units: atkd.range?.units
			}),
			target: game.i18n.format("MOBLOKS5E.AttackTarget", {
				quantity: Helpers.getNumberString(atkd.target.value ? atkd.target.value : 1),
				type:	atkd.target.type ? 
						atkd.target.type : (
							atkd.target.value > 1 ?
							game.i18n.localize("MOBLOKS5E.targetS") :
							game.i18n.localize("MOBLOKS5E.target")
						),	
			}),
			damageFormula: this.damageFormula(this.item),
			versatile: atkd.damage.versatile ? {
				text: this.formatAttackAndDamage(this.item, "v", atkd.damage.parts[0]),
				formula: this.damageFormula(this.item, "v")
			} : false,
			damage: this.dealsDamage(this.item) ? atkd.damage.parts.map((part, i) => {
				return {
					text: this.formatAttackAndDamage(this.item, i, part),
					formula: this.damageFormula(this.item, i)
				}
			}) : []
		}
	}
	formatAttackAndDamage(attack, i, part) {
		return game.i18n.format("MOBLOKS5E.AttackDamageTemplate", {
			average: this.averageDamage(attack, i),
			formula: this.damageFormula(attack, i),
			type: game.i18n.localize(
				"DND5E.Damage" + part[1].replace(/./, l => l.toUpperCase())
			).toLowerCase()
		});
	}
	getAttackType(attack) {
		return CONFIG.DND5E.itemActionTypes[attack?.data?.data?.actionType] || "";
	}
	isRangedAttack(attack) {
		return ["rwak", "rsak"].includes(attack.data.data?.actionType);
	}
	/**
	 * Extract the specified roll formula from the item
	 *
	 * @param {Item5e} attack - The attack item
	 * @param {number|string} [index=0] - The index of the rollable formula within the parts of the damage. If 'v', this referes tot he versitile damage formual.
	 * @return {string} A rollable formula 
	 * @memberof MonsterBlock5e
	 */
	getAttackFormula(attack, index=0) {
		const atkd = attack.data.data;
		return index == "v" ?						// Versitile formula is index 'v'
				atkd?.damage?.versatile				
			:
				atkd?.damage?.parts?.length > 0 ?
					atkd?.damage?.parts[index][0]
				: "0";
	}
	averageDamage(attack, index=0) {
		return MonsterBlock5e.averageRoll(this.getAttackFormula(attack, index), attack.getRollData());
	}

	damageFormula(attack, index=0) {	// Extract and re-format the damage formula
		return simplifyRollFormula(this.getAttackFormula(attack, index), attack.getRollData());
	}
	dealsDamage(item) {
		return Boolean(item.data.data?.damage?.parts?.length);
	}
}