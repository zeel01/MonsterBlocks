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
		return Boolean(
			// eslint-disable-next-line no-mixed-spaces-and-tabs
			   item.system.consume?.target
			|| item.type == "consumable"
			|| item.type == "loot"
			|| item.system.uses?.max
		);
	}

	/**
	 * Returns the prepared resource.
	 *
	 * @return {*}
	 * @memberof ResourcePreper
	 */
	getResource() {
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
		else if (this.item.system.uses?.max)
			this.res.type = "charges";
		else
			this.res.type = this.item.system.consume.type;
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
		let t = this.item.system.consume.target;
		let r = t.match(/(.+)\.(.+)\.(.+)/);
		let max = `system.${r[1]}.${r[2]}.max`;

		this.res.target = "system." + t;
		this.res.current = getProperty(this.sheet.actor, this.res.target);
		this.res.limit = getProperty(this.sheet.actor, max);
		this.res.refresh = game.i18n.localize("MOBLOKS5E.ResourceRefresh"); // It just says "Day" becaause thats typically the deal, and I don't see any other option.
	}
	/**
	 * Prepares items that have charges
	 *
	 * @memberof ResourcePreper
	 */
	prepCharges() {
		this.res.target = "system.uses.value";
		this.res.entity = this.item.system.consume.target || this.item.id;
		this.res.current = this.item.system.uses.value;
		this.res.limit = this.item.type == "spell" ? false : this.item.system.uses.max;
		this.res.limTarget = "system.uses.max";
		this.res.refresh = CONFIG.DND5E.limitedUsePeriods[this.item.system.uses.per];
	}
	/**
	 * Prepares items that consume material components/loot
	 *
	 * @return {*}
	 * @memberof ResourcePreper
	 */
	prepMaterial() {
		this.res.entity = this.item.system.consume.target;
		let ammo = this.sheet.actor.getEmbeddedDocument("Item", this.res.entity);
		if (!ammo) return;

		this.res.limit = false;
		this.res.current = ammo.system.quantity;
		this.res.target = "system.quantity";
		this.res.name = ammo.name;
	}
	/**
	 * Prepares items that consume consumables such as ammunition
	 *
	 * @memberof ResourcePreper
	 */
	prepConsume() {
		this.res.entity = this.item.id;
		this.res.limit = false;
		this.res.current = this.item.system.quantity;
		this.res.target = "system.quantity";
	}
}
