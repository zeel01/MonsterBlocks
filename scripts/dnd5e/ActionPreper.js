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
	 * @property {boolean} mythic        - Whether or not this is a mythic action
	 * @property {boolean} mythicTrait   - Whether or not this is the mythic trait which triggers the mythic actions
	 * @property {boolean} legendary     - Whether or not this is a legendary action
	 * @property {boolean} lair          - Whether or not this is a lair action
	 * @property {boolean} region        - Whether or not this is a regional effect
	 * @property {boolean} regionStart   - Whether or not this is the opening text of regional effects
	 * @property {boolean} regionalEnd   - Whether or not this is the closing text of regional effects
	 * @property {boolean} legResist     - Whether or not this is the legendary resistance feature
	 * @property {boolean} bonusAction   - Whether or not this is a bonus action
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
			mythic:       MonsterBlock5e.isMythicAction(data),
			mythicTrait:  MonsterBlock5e.isMythicTrait(data),
			legendary:    MonsterBlock5e.isLegendaryAction(data),
			lair:         MonsterBlock5e.isLairAction(data),
			region:       MonsterBlock5e.isRegionEffect(data),
			regionStart:  MonsterBlock5e.isRegionStart(data),
			regionEnd:    MonsterBlock5e.isRegionEnd(data),
			variant:      MonsterBlock5e.isVariant(data),
			legResist:    MonsterBlock5e.isLegendaryResistance(data),
			bonus:        MonsterBlock5e.isBonusAction(data),
			reaction:     MonsterBlock5e.isReaction(data)
		};
		is.specialAction = this.isSpecialAction(is);
		
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