import MonsterBlock5e from "./MonsterBlock5e.js";
import AttackPreper from "./AttackPreper.js";
import CastingPreper from "./CastingPreper.js";
import ActionPreper from "./ActionPreper.js";
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
 * @property {string}            label        - The localized label for this type of item
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
		legResist:	  { prep: ItemPreper,    filter: MonsterBlock5e.isLegendaryResistance,         label: game.i18n.localize("MOBLOKS5E.LegendaryResistance"), items: [], dataset: {type: "feat"}   },
		legendary:	  { prep: ActionPreper,  filter: MonsterBlock5e.isLegendaryAction,             label: game.i18n.localize("DND5E.LegAct"),                  items: [], dataset: {type: "feat"}   },
		lair:		  { prep: ActionPreper,  filter: MonsterBlock5e.isLairAction,                  label: game.i18n.localize("MOBLOKS5E.LairActionsHeading"),  items: [], dataset: {type: "feat"}   },
		multiattack:  { prep: ActionPreper,  filter: MonsterBlock5e.isMultiAttack,                 label: game.i18n.localize("MOBLOKS5E.Multiattack"),         items: [], dataset: {type: "feat"}   },
		casting:	  { prep: CastingPreper, filter: CastingPreper.isCasting.bind(CastingPreper),  label: game.i18n.localize("DND5E.Features"),                items: [], dataset: {type: "feat"}   },
		reaction:	  { prep: ActionPreper,  filter: MonsterBlock5e.isReaction,                    label: game.i18n.localize("MOBLOKS5E.Reactions"),           items: [], dataset: {type: "feat"}   },
		bonusActions: { prep: ActionPreper,  filter: MonsterBlock5e.isBonusAction,                 label: game.i18n.localize("MOBLOKS5E.BonusActions"),        items: [], dataset: {type: "feat"}   },
		attacks:	  { prep: AttackPreper,  filter: item => item.type === "weapon",               label: game.i18n.localize("DND5E.AttackPl"),                items: [], dataset: {type: "weapon"} },
		actions:	  { prep: ActionPreper,  filter: item => Boolean(item.data?.activation?.type), label: game.i18n.localize("DND5E.ActionPl"),                items: [], dataset: {type: "feat"}   },
		features:	  { prep: ItemPreper,    filter: item => item.type === "feat",                 label: game.i18n.localize("DND5E.Features"),                items: [], dataset: {type: "feat"}   },
		equipment:	  { prep: ItemPreper,    filter: () => true,                                   label: game.i18n.localize("DND5E.Inventory"),               items: [], dataset: {type: "loot"}   }
	};
	
	/**
	 * Classify all items, prepare them, and prepare spellbooks.
	 *
	 * @memberof ItemPrep
	 */
	prepareItems() {
		const [spells, other] = this.classify();
		this.organizeSpellbooks(spells);
		this.organizeFeatures(other);
	}

	/**
	 * Sorts the items into spells and non-spells, then sorts those into categories.
	 *
	 * @return {[array, array]} [spells, other]
	 * @memberof ItemPrep
	 */
	classify() {
		let [spells, other] = this.data.items.reduce((arr, item) => {
			if (item.type === "spell") arr[0].push(item);
			else arr[1].push(item);
			return arr;
		}, [[], []]);

		// Apply item filters
		spells = this.sheet._filterItems(spells, this.sheet._filters.spellbook);
		other = this.sheet._filterItems(other, this.sheet._filters.features);

		return [spells, other];
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