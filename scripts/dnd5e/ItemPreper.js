import MonsterBlock5e from "./MonsterBlock5e.js";
import { simplifyRollFormula } from "../../../../systems/dnd5e/module/dice.js";
import Helpers from "./Helpers5e.js";
import Item5e from "../../../../systems/dnd5e/module/item/entity.js";
import ResourcePreper from "./ResourcePreper.js";
export class ItemPreper {
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
}

