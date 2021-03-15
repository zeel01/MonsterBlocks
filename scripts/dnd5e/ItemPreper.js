import ResourcePreper from "./ResourcePreper.js";

export default class ItemPreper {
	/**
	 * Creates an instance of ItemPreper.
	 *
	 * @param {MonsterBlock5e} sheet
	 * @param {object} item
	 * @param {object} templateData
	 * @memberof ItemPreper
	 */
	constructor(sheet, item, templateData) {
		this.sheet = sheet;
		this.data = item;
		this.templateData = templateData;
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

