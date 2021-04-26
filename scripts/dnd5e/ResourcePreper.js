export default class ResourcePreper {
	/**
	 * Creates an instance of ResourcePreper.
	 *
	 * @param {object} templateData
	 * @param {Item5e} item
	 * @memberof ResourcePreper
	 */
	constructor (templateData, item, sheet) {
		this.templateData = templateData;
		this.item = item;
		this.sheet = sheet;
		this.res = {};
	}

	/**
	 * Checks whether or not an item has a resource limitation
	 *
	 * @static
	 * @param {Item5e} item - The item to check
	 * @return {boolean}      
	 * @memberof ResourcePreper
	 */
	static hasResource(item) {
		return Boolean(item.data.data.consume?.target)
			|| item.type == "consumable"
			|| item.type == "loot"
			|| item.data.data.uses?.max;
	}

	/**
	 * Returns the prepared resource.
	 *
	 * @return {*} 
	 * @memberof ResourcePreper
	 */
	getResource() {
		this.templateData.hasresource = this.item.hasresource;
		if (!this.templateData.hasresource) return null;

		this.setType();
		this.prep();

		return this.res;
	}

	/**
	 * Determins the resource type
	 *
	 * @memberof ResourcePreper
	 */
	setType() {
		if (this.item.type == "consumable" || this.item.type == "loot")
			this.res.type = "consume";
		else if (this.item.data.uses?.max) 
			this.res.type = "charges";
		else 
			this.res.type = this.item.data.consume.type;
	}

	/**
	 * Prepare the resources.
	 *
	 * Delegates preparation to the appropriate method
	 * depending on resource type.
	 *
	 * @memberof ResourcePreper
	 */
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

	/**
	 * Prepares items that consume a particular attribute of the actor.
	 *
	 * @memberof ResourcePreper
	 */
	prepAttribute() {
		let t = this.item.data.consume.target;
		let r = t.match(/(.+)\.(.+)\.(.+)/);
		let max = `data.${r[1]}.${r[2]}.max`;
		
		this.res.target = "data." + t;
		this.res.current = getProperty(this.sheet.actor.data, this.res.target);
		this.res.limit = getProperty(this.sheet.actor.data, max);
		this.res.refresh = game.i18n.localize("MOBLOKS5E.ResourceRefresh"); // It just says "Day" becaause thats typically the deal, and I don't see any other option.
	}
	/**
	 * Prepares items that have charges
	 *
	 * @memberof ResourcePreper
	 */
	prepCharges() {
		this.res.target = "data.uses.value";
		this.res.entity = this.item.data.consume.target || this.item.id;
		this.res.current = this.item.data.uses.value;
		this.res.limit = this.item.type == "spell" ? false : this.item.data.uses.max;
		this.res.limTarget = "data.uses.max";
		this.res.refresh = CONFIG.DND5E.limitedUsePeriods[this.item.data.uses.per];
	}
	/**
	 * Prepares items that consume material components/loot 
	 *
	 * @return {*} 
	 * @memberof ResourcePreper
	 */
	prepMaterial() {
		this.res.entity = this.item.data.consume.target;
		let ammo = this.sheet.actor.getEmbeddedEntity("OwnedItem", this.res.entity);
		if (!ammo) return;
		
		this.res.limit = false;
		this.res.current = ammo.data.quantity;
		this.res.target = "data.quantity";
		this.res.name = ammo.name;
	}
	/**
	 * Prepares items that consume consumables such as ammunition
	 *
	 * @memberof ResourcePreper
	 */
	prepConsume() {
		this.res.entity = this.item._id;
		this.res.limit = false;
		this.res.current = this.item.data.quantity;
		this.res.target = "data.quantity";
	}
}
