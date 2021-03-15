import MonsterBlock5e from "./MonsterBlock5e.js";
import { simplifyRollFormula } from "../../../../systems/dnd5e/module/dice.js";
import Helpers from "./Helpers5e.js";
import Item5e from "../../../../systems/dnd5e/module/item/entity.js";

export class ResourcePreper {
	/**
	 * Creates an instance of ResourcePreper.
	 *
	 * @param {object} templateData
	 * @param {Item5e} item
	 * @memberof ResourcePreper
	 */
	constructor (templateData, item) {
		this.templateData = templateData;
		this.item = item;
		this.res = {};
	}

	static hasResource(item) {
		return Boolean(item.data.data.consume?.target)
			|| item.type == "consumable"
			|| item.type == "loot"
			|| item.data.data.uses?.max;
	}

	getResource() {
		this.templateData.hasresource = this.hasresource;
		if (!this.templateData.hasresource) return null;

		this.setType();
		this.prep();

		return this.res;
	}

	setType() {
		if (this.item.type == "consumable" || this.item.type == "loot")
			this.res.type = "consume";
		else if (this.item.data.data.uses?.max) 
			this.res.type = "charges";
		else 
			this.res.type = this.item.data.data.consume.type;
	}

	prep() {
		switch (this.res.type) {
			case "attribute":
				this.prepAttribute();
				break;
			case "charges":
				this.prepCharges();
				break;
			case "material":
			case "ammo":
				this.prepMaterial();
				break;
			case "consume":
				this.prepConsume();
				break;
		}
	}

	prepAttribute() {
		let t = this.item.data.data.consume.target;
		let r = t.match(/(.+)\.(.+)\.(.+)/);
		let max = `data.${r[1]}.${r[2]}.max`;
		
		this.res.target = "data." + t;
		this.res.current = getProperty(this.sheet.actor.data, res.target);
		this.res.limit = getProperty(this.sheet.actor.data, max);
		this.res.refresh = game.i18n.localize("MOBLOKS5E.ResourceRefresh"); // It just says "Day" becaause thats typically the deal, and I don't see any other option.
	}
	prepCharges() {
		this.res.target = "data.uses.value";
		this.res.entity = this.item.data.data.consume.target || this.item.id;
		this.res.current = this.item.data.data.uses.value;
		this.res.limit = this.item.type == "spell" ? false : this.item.data.data.uses.max;
		this.res.limTarget = "data.uses.max";
		this.res.refresh = CONFIG.DND5E.limitedUsePeriods[this.item.data.data.uses.per];
	}
	prepMaterial() {
		this.res.entity = this.item.data.data.consume.target;
		let ammo = this.sheet.actor.getEmbeddedEntity("OwnedItem", this.res.entity);
		if (!ammo) return;
		
		this.res.limit = false;
		this.res.current = ammo.data.quantity;
		this.res.target = "data.quantity";
		this.res.name = ammo.name;
	}
	prepConsume() {
		this.res.entity = this.item._id;
		this.res.limit = false;
		this.res.current = this.item.data.data.quantity;
		this.res.target = "data.quantity";
	}
}

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

