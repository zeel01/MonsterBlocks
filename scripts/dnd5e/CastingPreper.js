import Helpers from "./Helpers5e.js";
import { debugging } from "../utilities.js";
import ItemPreper from "./ItemPreper.js";
import * as Templates from "./templates.js";

/**
 * @typedef {import{"../../../../systems/dnd5e/module/item/sheet.js"}.Item5e} Item5e
 */

export default class CastingPreper extends ItemPreper {
	/**
	 * Determine if the item is a spellcasting feature
	 *
	 * @static
	 * @param {Item5e} item - An item that might be a spellcasting feature
	 * @return {boolean} 
	 * @memberof CastingPreper
	 */
	static isCasting(item) {
		return this.isSpellcasting(item) || this.isInnateSpellcasting(item);
	}
	/**
	 * Determine if the item is a standard casting feature or pact magic,
	 * or if it's innate.
	 *
	 * @static
	 * @param {Item5e} item - An item that might be a spellcasting feature
	 * @return {boolean}      True for standard or pact magic, false for innate
	 * @memberof CastingPreper
	 */
	static isSpellcasting(item) {
		const name = item.name.toLowerCase().replace(/\s+/g, "");
		return !this.isInnateSpellcasting(item) &&
			game.i18n.localize("MOBLOKS5E.SpellcastingLocators").some(loc => name.includes(loc));
	}
	/**
	 * Determine is the item is an innate casting feature
	 *
	 * @static
	 * @param {Item5e} item - An item that might be a spellcasting feature
	 * @return {boolean} 
	 * @memberof CastingPreper
	 */
	static isInnateSpellcasting(item) {
		const name = item.name.toLowerCase().replace(/\s+/g, "");
		return game.i18n.localize("MOBLOKS5E.InnateCastingLocators").some(loc => name.includes(loc));
	}
	/**
	 * Determine if the item is a pact magic feature
	 *
	 * @static
	 * @param {Item5e} item - An item that might be a spellcasting feature
	 * @return {boolean} 
	 * @memberof CastingPreper
	 */
	static isPactMagic(item) {
		const desc = item.data.data.description?.value?.toLowerCase().replace(/\s+/g, "");
		return game.i18n.localize("MOBLOKS5E.WarlockLocators").some(
			s => desc.indexOf(s) > -1
		);
	}

	/**
	 * The available casting types
	 *
	 * @property {Symbol} standard - Standard spell slots and preparation, Ex: Wizard, Druid
	 * @property {Symbol} innate   - Innate casting, Ex: Devils, racial magic, magical creatures, psyonics
	 * @property {Symbol} pact     - Warlock pact magic
	 * @readonly
	 * @type {Object<string,Symbol>}
	 * @memberof CastingPreper
	 */
	cts = {
		standard: Symbol("Standard Spellcasting"),
		innate: Symbol("Innate Spellcasting"),
		pact: Symbol("Pact Macgic")
	}

	/**
	 * Map all the casting types to different translation
	 * strings since they all have different text.
	 *
	 * @readonly
	 * @type {Object<Symbol,string>}
	 * @memberof CastingPreper
	 */
	ctsSpIntroStrings = {
		[this.cts.standard]: "MOBLOKS5E.CasterSpellsPreped",
		[this.cts.pact]: "MOBLOKS5E.WarlockSpellsPreped",
		[this.cts.innate]: "MOBLOKS5E.InnateSpellsKnown"
	}

	/**
	 * The string id of the casting intro based on this caster's type
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get spellIntroStringId() {
		return this.ctsSpIntroStrings[this.ct];
	}

	/**
	 * Whether or not this casting feature is pact magic
	 *
	 * @type {boolean}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get pact() {
		return this.ct == this.cts.pact;
	}

	/**
	 * @override
	 * @memberof CastingPreper
	 */
	prepare() {		
		this.data.castingType = this.constructor.isSpellcasting(this.item) ?
			(this.constructor.isPactMagic(this.item) ? this.cts.pact : this.cts.standard) : this.cts.innate;

		this.data.hasAtWill = this.sheet.hasAtWillSpells();
		
		/** @type {string} The type of casting feature */
		this.ct = this.data.castingType;
		this.data.spellbook = this.reformatSpellbook();

		[this.abilityTitle, this.castingAbility] = this.getCastingAbility();
		this.tohit = this.getSpellAttackBonus();

		this.data.description =  this.castingFeatureDescriptionData;

		if (debugging()) console.debug(this);
	}


	/**
	 * Retuns the formatted spellbook data for the associated casting feature
	 *
	 * @return {Object} The spellbook object
	 * @memberof CastingPreper
	 */
	reformatSpellbook() {
		if (this.ct == this.cts.innate) return this.formatInnateSpellbook();
			
		const book = this.filterSpellbook();
		
		book.forEach(this.formatSpellBookPage.bind(this));

		return book;
	}

	/**
	 * Filters and adds additional data for displaying the spellbook
	 *
	 * @return {Object} The spellbook object
	 * @memberof CastingPreper
	 */
	filterSpellbook() {
		return this.templateData.spellbook
			.filter(this.spellBookFilter.bind(this));
	}

	/**
	 * Determin in a page in the book contains spells to include
	 *
	 * @param {object} page       - One "page" of the spellbook contains spells of one "level"
	 * @param {number} page.order - The spell level of the page, or a special value for pact magic, innate, or at-will
	 * @return {boolean}            Whether or not the page belongs in the spellbook 
	 * @memberof CastingPreper
	 */
	spellBookFilter({ order }) {
		const invalidPactMagic = (                                     // If this caster is even a pact magic user
			this.pact && !(order == 0.5 || order == 0)                 // Pact magic is only "0.5" and cantrips
		)
		const atWill = order == -20;                                   // Don't bother with at-will.
		const innate = this.ct != this.cts.innate && order == -10      // Only innate has -10
		
		return !(invalidPactMagic || atWill || innate)                 // If it's any of these, it should not be in the spellbook
	}

	/**
	 * Formats special labels for this spellbook page.
	 *
	 * @param {object} page - One "page" of the spellbook contains spells of one "level"
	 * @return {void} 
	 * @memberof CastingPreper
	 */
	formatSpellBookPage(page) {
		page.maxSpellLevel = this.getSpellPageLevel(page);

		if (page.order == 0) return this.formatCantripPage(page);

		page.label = this.getPageLabel(page);
		page.slotKey = this.getPageSlotKey(page)
		page.slotLabel = this.getPageSlotLabel(page);
	}

	/**
	 * Gets the maximum spell level on this spellbook page
	 *
	 * @param {object} page - One "page" of the spellbook contains spells of one "level"
	 * @return {number}       The highest level spell on this page
	 * @memberof CastingPreper
	 */
	getSpellPageLevel(page) {
		return page.spells.reduce(
			(max, spell) => spell.data.level > max ? spell.data.level : max,
		1);
	}

	/**
	 * Constructs the label for this page of the spellbok
	 *
	 * @param {object} page - One "page" of the spellbook contains spells of one "level"
	 * @return {string} 
	 * @memberof CastingPreper
	 */
	getPageLabel(page) {
		let level = "";

		if (this.pact) level = `${Helpers.formatOrdinal(1)}-${Helpers.formatOrdinal(page.maxSpellLevel)}`;  // 1st-maxTh
		else           level = Helpers.formatOrdinal(page.maxSpellLevel);

		return game.i18n.format("MOBLOCKS5E.SpellLevel", { level });
	}

	/**
	 * Get the editable key for the spell slots
	 *
	 * @param {object} page          - One "page" of the spellbook contains spells of one "level"
	 * @param {number} page.maxSpellLevel - The highest number of spell slots on the page
	 * @return {string} 
	 * @memberof CastingPreper
	 */
	getPageSlotKey({ maxSpellLevel }) {
		const suffix = this.pact ? "pact" : `spell${maxSpellLevel}`;
		return `data.spells.${suffix}`;
	}

	/**
	 * Formats the label for the spell slots on this page
	 *
	 * @param {object} page - One "page" of the spellbook contains spells of one "level"
	 * @return {string} 
	 * @memberof CastingPreper
	 */
	getPageSlotLabel(page) {
		const string = this.pact          // Which translation key
			? "MOBLOCKS5E.SpellPactSlots" // pact magic
			: "MOBLOCKS5E.SpellSlots";    // or normal

		return game.i18n.format(string, {
			slots: Templates.editable({
				key: `${page.slotKey}.override`,
				className: "slot-count",
				dtype: "Number",
				placeholder: 0,
				value: page.slots,
				enabled: this.editing
			}),
			level: Helpers.formatOrdinal(page.maxSpellLevel)
		});
	}

	/**
	 * Simplified page formatting for cantrips
	 *
	 * @param {object} page - One "page" of the spellbook contains spells of one "level"
	 * @return {void}
	 * @memberof CastingPreper
	 */
	formatCantripPage(page) {
		page.label = game.i18n.localize("MOBLOKS5E.Cantrips");
		page.slotLabel = game.i18n.localize("MOBLOKS5E.AtWill");
	}

	/**
	 * Formats and adds additional data for displaying the spellbook
	 *
	 * @return {Object} The spellbook object
	 * @memberof CastingPreper
	 */
	formatInnateSpellbook() {
		const book = this.templateData.innateSpellbook;
		book.forEach(this.formatInnateSpellPage.bind(this));
		return book;
	}

	/**
	 * Formats a "page" of the innate spellbook
	 *
	 * @param {object} page - One "page" of the spellbook contains spells of one "level"
	 * @return {void}
	 * @memberof CastingPreper
	 */
	formatInnateSpellPage(page) {
		page.label = page.uses ? game.i18n.format("MOBLOCKS5E.SpellCost", {
			cost: page.label
		}) : page.label;
		page.slotLabel = false;
	}

	/**
	 * Compiles the data needed to display the text description of a spellcasting feature
	 * including appropriate translation.
	 *
	 * @type {Object} An object containing translated and filled sections of the casting feature description
	 * @readonly
	 * @memberof CastingPreper
	 */
	get castingFeatureDescriptionData() {
		return {
			level: this.spellLevelText,
			ability: this.castingAbilityText,
			stats: this.casterStatsText,
			warlockRecharge: this.warlockRechargeText,
			spellintro: this.spellIntroText
		};
	}

	/**
	 * The level, 0-20, of spellcaster the Actor is.
	 *
	 * If no level is set on the actor, their level is zero.
	 *
	 * @type {number}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get casterLevel() {
		return this.sheet.actor.data
			.data?.details?.spellLevel ?? 0;
	}

	/**
	 * Gets the ordinal suffix for the caster level of the Actor
	 *
	 * st, nd, rd, th... Will be localized appropriately.
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get levelSuffix() {
		return Helpers.getOrdinalSuffix(this.casterLevel);
	}

	/**
	 * Gets a list of { value, label } options for casting abilities
	 * excluding the currently selected casting ability.
	 *
	 * @type {Array<import("./templates.js").Option>}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get abilityOptions() {
		return Object.entries(CONFIG.DND5E.abilities)
			.map(([key, value]) => ({ 
				value: key, 
				label: value 
			}))
			.filter(opt => opt.value != this.castingAbility);
	} 

	/**
	 * Gets a list of spell items that are at-will spells.
	 * Or returns an empty array.
	 *
	 * @type {Array<Item5e>|Array}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get atWillSpells() {
		return this.templateData.spellbook
			.find(l => l.prop === "atwill")?.spells || [];
	}

	/**
	 * Whether or not editing is enabled on the sheet
	 *
	 * @type {Boolean}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get editing() {
		return this.sheet.flags.editing;
	}

	/**
	 * Generate the text describing the caster's name and level.
	 *
	 * Blank for innate casters.
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get spellLevelText() {
		if (this.ct == this.cts.innate) return "";

		return game.i18n.format("MOBLOKS5E.CasterNameLevel", {
			name: this.sheet.actor.name,
			level: Templates.editable({
				key: "data.details.spellLevel",
				value: this.casterLevel,
				className: "caster-level",
				dtype: "Number",
				placeholder: "0",
				enabled: this.editing
			}) + this.levelSuffix
		})
	}

	/**
	 * Generate the text describing the caster's spellcasting ability,
	 * including a control to change the ability if editing is enabled.
	 *
	 * Also shows the name on innate casters.
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get castingAbilityText() {
		const string = this.ct == this.cts.innate  // If it's an innate caster
			? "MOBLOKS5E.InnateCastingAbility"     // Use the text for innate casters
			: "MOBLOKS5E.CastingAbility";          // Otherwise use the normal text

		return game.i18n.format(string, {
			name: this.sheet.actor.name,           // Innate casters print thier name in this block
			ability: Templates.selectField({ 
				key: "data.attributes.spellcasting", 
				value: this.castingAbility, 
				label: this.abilityTitle, 
				listClass: "actor-size",
				options: this.abilityOptions, 
				enabled: this.editing
			})
		});
	}

	/**
	 * Generate the text describing key stats for the caster
	 * including spell save DC and spell attack bonus.
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get casterStatsText() {
		return game.i18n.format("MOBLOKS5E.CastingStats", {
			savedc: this.sheet.actor.data.data?.attributes?.spelldc,
			bonus: `${this.tohit > -1 ? "+" : ""}${this.tohit}`
		})
	}

	/**
	 * If this is a warlock, returns the string of text explaining
	 * how pact magic spell slots work.
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get warlockRechargeText() {
		if (this.ct != this.cts.pact) return "";
		return game.i18n.localize("MOBLOKS5E.WarlockSlotRegain");
	}

	/**
	 * Generate the text which introduces the spell list
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get spellIntroText() {
		return game.i18n.format(this.spellIntroStringId, {
			name: this.sheet.actor.name,
			atwill: this.atWillSpellListText
		})
	}

	/**
	 * Generate the text of the list of at-will spells if any exist
	 *
	 * @type {string}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get atWillSpellListText() {
		if (!this.data.hasAtWill) return "";

		return game.i18n.format("MOBLOKS5E.CasterAtWill", {
			spells: Templates.itemList({
				className: "at-will-spells",
				items: this.atWillSpellsForList,
				itemClass: "spell at-will-spell",
				itemLabelClass: "spell-name",
				deletable: this.sheet.flags["show-delete"] && this.editing  // When deletion and editing are both enabled
			}) 
		});
	}

	/**
	 * Re-form the list of at-will spells to be used by the itemList
	 * 
	 * @type {Array<import("./templates.js").Item>}
	 * @readonly
	 * @memberof CastingPreper
	 */
	get atWillSpellsForList() {
		return this.atWillSpells.map(s => ({
			name: s.name,
			id: s._id
		}));
	}

	getSpellAttackBonus() {
		let data = this.sheet.actor.data.data;
		let abilityBonus = data.abilities[this.castingAbility]?.mod;
		let profBonus = data.attributes?.prof;
		
		return abilityBonus + profBonus;
	}
	getCastingAbility() {
		let main = this.sheet.actor.data.data?.attributes?.spellcasting || "int";
		let castingability = main;
		
		let types = {
			"will": (l) => l.order == -20,
			[this.cts.innate]: (l) => l.order == -10,
			[this.cts.pact]: (l) => l.order == 0.5,
			"cantrip": (l) => l.order == 0,
			[this.cts.standard]: (l) => l.order > 0.5
		}
		let spelllevel = this.data.spellbook.find(types[this.ct])
		if (spelllevel !== undefined) {
			let spell = spelllevel.spells.find((s) => 
				s.data.ability && 
				s.data.ability != main
			);
			castingability = spell?.data?.ability ?? main;
		}
		return [this.templateData.actor.data?.abilities[castingability]?.label ?? game.i18n.localize("DND5E.AbilityInt"), castingability];
	}
}