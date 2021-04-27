import MonsterBlock5e from "./MonsterBlock5e.js";
import AttackPreper from "./AttackPreper.js";
import CastingPreper from "./CastingPreper.js";
import ActionPreper from "./ActionPreper.js";
import ItemPreper from "./ItemPreper.js";
import InnateSpellbookPrep from "./InnateSpellbookPrep.js"

/**
 * @typedef {import{"../../../../systems/dnd5e/module/item/sheet.js"}.Item5e} Item5e
 */

export default class ItemPrep {
	constructor(sheet, data) {
		this.sheet = sheet;
		this.data = data;

		this._prepareItems(data);
	}
	
	_prepareItems(data) {
		

		// Categorize Items as Features and Spells
		/**
		 * @typedef Feature
		 * @property {typeof ItemPreper}    prep
		 * @property {Function} filter
		 * @property {string}   label
		 * @property {Array}    items
		 * @property {object}   dataset
		 *//**
		 * @type {Object.<string, Feature>}
		 */
		const features = {
			legResist:	{ prep: ItemPreper, filter: MonsterBlock5e.isLegendaryResistance, label: game.i18n.localize("MOBLOKS5E.LegendaryResistance"), items: [] , dataset: {type: "feat"} },
			legendary:	{ prep: ActionPreper, filter: MonsterBlock5e.isLegendaryAction, label: game.i18n.localize("DND5E.LegAct"), items: [] , dataset: {type: "feat"} },
			lair:		{ prep: ActionPreper, filter: MonsterBlock5e.isLairAction, label: game.i18n.localize("MOBLOKS5E.LairActionsHeading"), items: [] , dataset: {type: "feat"} },
			multiattack:{ prep: ActionPreper, filter: MonsterBlock5e.isMultiAttack, label: game.i18n.localize("MOBLOKS5E.Multiattack"), items: [] , dataset: {type: "feat"} },
			casting:	{ prep: CastingPreper, filter: CastingPreper.isCasting.bind(CastingPreper), label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
			reaction:	{ prep: ActionPreper, filter: MonsterBlock5e.isReaction, label: game.i18n.localize("MOBLOKS5E.Reactions"), items: [], dataset: {type: "feat"} },
			attacks:	{ prep: AttackPreper, filter: item => item.type === "weapon", label: game.i18n.localize("DND5E.AttackPl"), items: [] , dataset: {type: "weapon"} },
			actions:	{ prep: ActionPreper, filter: item => Boolean(item.data?.activation?.type), label: game.i18n.localize("DND5E.ActionPl"), items: [] , dataset: {type: "feat"} },
			features:	{ prep: ItemPreper, filter: item => item.type === "feat", label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
			equipment:	{ prep: ItemPreper, filter: () => true, label: game.i18n.localize("DND5E.Inventory"), items: [], dataset: {type: "loot"}}
		};

		// Start by classifying items into groups for rendering
		let [spells, other] = data.items.reduce((arr, item) => {
			if ( item.type === "spell" ) arr[0].push(item);
			else arr[1].push(item);
			return arr;
		}, [[], []]);

		// Apply item filters
		spells = this.sheet._filterItems(spells, this.sheet._filters.spellbook);
		other = this.sheet._filterItems(other, this.sheet._filters.features);

		// Organize Spellbook
		data.spellbook = this.sheet._prepareSpellbook(data, spells);
		data.innateSpellbook = new InnateSpellbookPrep(data.spellbook, this.sheet).prepare(); //this.prepareInnateSpellbook(data.spellbook);

		// Organize Features
		for ( let item of other ) {
			let category = Object.values(features).find(cat => cat.filter(item));
			
			//category.prep(item, data);
			this.prepareItem(category, item, data);
			category.items.push(item);
		}

		// Assign and return
		data.features = features;
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

	getMultiattack(data) { // The Multiattack action is always first in the list, so we need to find it and seperate it out.
		for (let item of data.items) {
			if (MonsterBlock5e.isMultiAttack(item)) return item;
		}
		return false;
	}
	getLegendaryResistance(data) {
		for (let item of data.items) {
			if (MonsterBlock5e.isLegendaryResistance(item)) return item;
		}
		return false;
	}	
}