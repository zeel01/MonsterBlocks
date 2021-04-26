import ResourcePreper from "./ResourcePreper.js";

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

	prepResources() {
		this.data.hasresource = ResourcePreper.hasResource(this.item);
		if (!this.data.hasresource) return;

		this.data.resource = new ResourcePreper(this.templateData, this.data, this.sheet).getResource();
	}

	/** @abstract */
	prepare() { }

	/** @abstract */
	getDescription() { }
}

