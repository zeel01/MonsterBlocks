import MonsterBlock5e from "./MonsterBlock5e.js";
import ResourcePreper from "./ResourcePreper.js";

export default class ItemPreper {
	/**
	 * Creates an instance of ItemPreper.
	 *
	 * @param {MonsterBlock5e} sheet - The sheet instance this preper is working for
	 * @param {object} item          - The item data for this item
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

		this.data.resource = new ResourcePreper(this.templateData, this.data).getResource();
	}

	/** @abstract */
	prepare() { }

	/** @abstract */
	getDescription() { }
}

