import MonsterBlock5e from "./MonsterBlock5e.js";
import ResourcePreper from "./ResourcePreper.js";
import { getTranslationArray } from "../utilities.js";

/**
 * @typedef {import("./MonsterBlock5e.js").MonsterBlock5e} MonsterBlock5e
 * @typedef {import{"../../../../systems/dnd5e/module/item/sheet.js"}.Item5e} Item5e
 */

export default class ItemPreper {
	/**
	 * Creates an instance of ItemPreper.
	 *
	 * @param {MonsterBlock5e} sheet - The sheet instance this preper is working for
	 * @param {Item5e} item          - The item data for this item
	 * @param {object} templateData  - The whole data for the template
	 * @memberof ItemPreper
	 */
	constructor(sheet, item, templateData) {
		/** @type {MonsterBlock5e} The sheet instance this preper is working for */
		this.sheet = sheet;

		/** @type {object} The item data for this item */
		this.data = item;

		/** @type {object} The whole data for the template	 */
		this.templateData = templateData;

		/** @type {Item5e} The real instance of the item */
		this.item = sheet.object.items.get(item._id);
	}

	/**
	 * @typedef Is
	 * @property {boolean} specialAction - Whether or not is any of the below
	 * @property {boolean} multiattack   - Whether or not this is the multiattack action
	 * @property {boolean} legendary     - Whether or not this is a legendary action
	 * @property {boolean} lair          - Whether or not this is a lair action
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
			multiAttack:  ItemPreper.isMultiAttack(data),
			legendary:    ItemPreper.isLegendaryAction(data),
			lair:         ItemPreper.isLairAction(data),
			legResist:    ItemPreper.isLegendaryResistance(data),
			bonusAction:  ItemPreper.isBonusAction(data),
			reaction:     ItemPreper.isReaction(data)
		};
		is.specialAction = this.isSpecialAction(is);
		is.attack = ItemPreper.isAttack(data);

		return is;
	}

	prepResources() {
		this.data.hasresource = ResourcePreper.hasResource(this.item);
		if (!this.data.hasresource) return;

		this.data.resource = new ResourcePreper(this.data, this.item, this.sheet).getResource();
	}

	prepare() {
		this.data.is = this.is;
	}

	/** @abstract */
	getDescription() { }

	/**
	 * Used to ensure that actions that need seperated out aren't shown twice
	 *
	 * @param {objec} is - The set of boolean is/isn't
	 * @memberof ItemPreper
	 */
	isSpecialAction(is) {
		return Object.values(is).some(v => v == true);
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @param {string} activation - activation type
	 * @returns {boolean} - true if the item is of the activation type
	 * @memberof ItemPreper
	 */
	static isActivationType (itemData, activation) {
		return itemData.data?.activation?.type === activation;
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @param {string} type - item type
	 * @memberof ItemPreper
	 */
	static isItemType (itemData, type) {
		return itemData.type === type;
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @param {string} locator - localization string array pattern to locate
	 * @returns {boolean} true if the item has matched the locator criteria
	 * @memberof ItemPreper
	 */
	static isLocatedName(itemData, locator) {
		let name = itemData.name.toLowerCase().replace(/\s+/g, "");
		return getTranslationArray(locator).some(loc => name.includes(loc));
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is an attack
	 * @memberof ItemPreper
	 */
	static isAttack(itemData) {
		return ItemPreper.isItemType(itemData, "weapon");
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is a multiattack feature
	 * @memberof ItemPreper
	 */
	static isMultiAttack(itemData) {
		return ItemPreper.isLocatedName(itemData, "MOBLOKS5E.MultiattackLocators");
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is a legendary resistance feature
	 * @memberof ItemPreper
	 */
	static isLegendaryResistance(itemData) {
		return itemData.data?.consume?.target === "resources.legres.value";
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is an action
	 * @memberof ItemPreper
	 */
	static isAction(itemData) {
		return itemData.data?.activation?.type && !ItemPreper.isActivationType(itemData, "none");
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is a bonus action
	 * @memberof ItemPreper
	 */
	static isBonusAction(itemData) {
		return ItemPreper.isActivationType(itemData, "bonus");
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is a reaction
	 * @memberof ItemPreper
	 */
	static isReaction(itemData) {
		return ItemPreper.isActivationType(itemData, "reaction");
	}

	/**
 	* 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is a legendary action
	 * @memberof ItemPreper
	 */
	static isLegendaryAction(itemData) {
		return ItemPreper.isActivationType(itemData, "legendary");
	}

	/**
	 * 
	 * @param {item.data} itemData - item data
	 * @returns {boolean} true if the item is a lair action
	 * @memberof ItemPreper
	 */
	static isLairAction(itemData) {
		return ItemPreper.isActivationType(itemData, "lair");
	}
}