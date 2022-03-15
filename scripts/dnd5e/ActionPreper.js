import MonsterBlock5e from "./MonsterBlock5e.js";
import ItemPreper from "./ItemPreper.js";


export default class ActionPreper extends ItemPreper {
	prepare() {
		this.data.is = this.is;
	}

	/**
	 * @typedef Is
	 * @property {boolean} specialAction - Whether or not is any of the below
	 * @property {boolean} multiattack   - Whether or not this is the multiattack action
	 * @property {boolean} legendary     - Whether or not this is a legendary action
	 * @property {boolean} lair          - Whether or not this is a lair action
	 * @property {boolean} legResist     - Whether or not this is the legendary resistance feature
	 * @property {boolean} reaction      - Whether or not this is a reaction
	 *//**
	 *
	 * Creates a set of is/isn't values to represent special types of actions
	 *
	 * @type {Is}
	 * @readonly
	 * @memberof ActionPreper
	 */
	get is() {
		const data = this.item.data;
		/** @type {Is} */
		const is = { 
			multiAttack:  MonsterBlock5e.isMultiAttack(data),
			legendary:    MonsterBlock5e.isLegendaryAction(data),
			lair:         MonsterBlock5e.isLairAction(data),
			region:       MonsterBlock5e.isRegionEffect(data),
			legResist:    MonsterBlock5e.isLegendaryResistance(data),
			bonusAction:  MonsterBlock5e.isBonusAction(data),
			reaction:     MonsterBlock5e.isReaction(data)
		};
		is.specialAction = this.isSpecialAction(is);
		is.noNameItem = is.region || is.lair;
		
		return is;
	}
	
	/**
	 * Used to ensure that actions that need seperated out aren't shown twice
	 *
	 * @param {objec} is - The set of boolean is/isn't
	 * @memberof ActionPreper
	 */
	isSpecialAction(is) {
		Object.values(is).some(v => v == true);
	}
}