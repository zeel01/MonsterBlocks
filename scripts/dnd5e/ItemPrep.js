import MonsterBlock5e from "./MonsterBlock5e.js";
import AttackPreper from "./AttackPreper.js";
import CastingPreper from "./CastingPreper.js";
import ItemPreper from "./ItemPreper.js";
import InnateSpellbookPrep from "./InnateSpellbookPrep.js"

/**
 * @typedef {import{"../../../../systems/dnd5e/module/item/sheet.js"}.Item5e} Item5e
 */

/**
 * Defines an item classification
 *
 * @typedef   Feature
 * @property {typeof ItemPreper} prep         - An item preparation class for this type of item
 * @property {Function}          filter       - A filtering function to locate items of this type
 * @property {Array}             items        - An array of items of this type
 * @property {object}            dataset      - An object of additional data
 * @property {string}            dataset.type - The "type" of the item that dnd5e recognizes
*/

export default class ItemPrep {
	/**
	 * Creates an instance of ItemPrep.
	 *
	 * @param {MonsterBlock5e} sheet
	 * @param {object}         data
	 * @memberof ItemPrep
	 */
	constructor(sheet, data) {
		this.sheet = sheet;
		this.data = data;
		this.data.features = this.features;

		this.prepareItems();
	}
	
	/** @type {Object.<string, Feature>} A set of item classifications by type */
	features = {
		legResist:	  { prep: ItemPreper,    filter: ItemPreper.isLegendaryResistance,            items: [], dataset: {type: "feat"}   },
		legendary:	  { prep: ItemPreper,    filter: ItemPreper.isLegendaryAction,                items: [], dataset: {type: "feat"}   },
		lair:		  { prep: ItemPreper,    filter: ItemPreper.isLairAction,                     items: [], dataset: {type: "feat"}   },
		multiattack:  { prep: ItemPreper,    filter: ItemPreper.isMultiAttack,                    items: [], dataset: {type: "feat"}   },
		casting:	  { prep: CastingPreper, filter: CastingPreper.isCasting.bind(CastingPreper), items: [], dataset: {type: "feat"}   },
		attacks:	  { prep: AttackPreper,  filter: ItemPreper.isAttack,                         items: [], dataset: {type: "weapon"} },
		reactions:	  { prep: ItemPreper,    filter: ItemPreper.isReaction,                       items: [], dataset: {type: "feat"}   },
		bonusActions: { prep: ItemPreper,    filter: ItemPreper.isBonusAction,                    items: [], dataset: {type: "feat"}   },
		actions:	  { prep: ItemPreper,    filter: ItemPreper.isAction,                         items: [], dataset: {type: "feat"}   },
		features:	  { prep: ItemPreper,    filter: item => item.type === "feat",                items: [], dataset: {type: "feat"}   },
		equipment:	  { prep: ItemPreper,    filter: () => true,                                  items: [], dataset: {type: "loot"}   }
	};
	
	/**
	 * Classify all items, prepare them, and prepare spellbooks.
	 *
	 * @memberof ItemPrep
	 */
	prepareItems() {
		const [other, spells] = this.data.items.partition(item => item.type === "spell");
		this.organizeSpellbooks(spells);
		this.organizeFeatures(other);
	}

	/**
	 * Prepares and organizes the regular and innate spellbooks
	 *
	 * @param {array} spells - All the spell items
	 * @memberof ItemPrep
	 */
	organizeSpellbooks(spells) {
		this.data.spellbook = this.sheet._prepareSpellbook(this.data, spells);
		this.data.innateSpellbook = new InnateSpellbookPrep(this.data.spellbook, this.sheet).prepare();
	}

	/**
	 * Sort and prepare all non-spell items
	 *
	 * @param {array} items
	 * @memberof ItemPrep
	 */
	organizeFeatures(items) {
		for (let item of items) {
			const category = Object.values(this.features).find(cat => cat.filter(item));
			this.prepareItem(category, item, this.data);
			category.items.push(item);
		}
	}

	/**
	 * Create an instance of the appropriate item preparer, 
	 * then prepare the item and its resources.
	 *
	 * @param {Feature} category - The type of item
	 * @param {Item5e} item      - The instance of the item
	 * @param {object} data      - The data for the template
	 * @return {void} 
	 * @memberof ItemPrep
	 */
	prepareItem(category, item, data) {
		const preparer = new category.prep(this.sheet, item, data);
		preparer.prepResources();
		preparer.prepare();
	}
}