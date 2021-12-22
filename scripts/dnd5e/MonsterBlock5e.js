import ActorSheet5eNPC from "../../../../systems/dnd5e/module/actor/sheets/npc.js";
import TraitSelector from "../../../../systems/dnd5e/module/apps/trait-selector.js";
import { MenuItem, MenuTree } from "../MenuTree.js";
import { debug, ContentEditableAdapter } from "../utilities.js";
import { inputExpression } from "../../input-expressions/handler.js";
import ItemPrep from "./ItemPrep.js";
import Flags from "./Flags5e.js";

/* global QuickInsert:readonly */

/**
 * Main class for the Monster Blocks module
 *
 * @export
 * @class MonsterBlock5e
 * @extends {ActorSheet5eNPC}
 */
export default class MonsterBlock5e extends ActorSheet5eNPC {
	constructor(...args) {
		super(...args);
		
		this.position.default = true;
		
		this.flagManager = new Flags(this);

		//this.flagManager.prep().then((p) => {
			this.options.classes.push(this.themes[this.currentTheme].class);
			//if (p) 
			if (!this.actor.compendium) this.setCurrentTheme(this.currentTheme);
		//});

		this.prepMenus();
	}

	get template() {
		return "modules/monsterblock/templates/dnd5e/monsterblock5e.hbs";
	}
	
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["monsterblock", "sheet", "actor"],
			width: 406,	// 406 Column width of 390, plus 8px of padding on each side.
			height: 400, // Arbitrary and basically meaningless.
			dragDrop: [{dragSelector: ".item .item-name"}, {dragSelector: ".spell-list .spell"}],
			resizable: false
		});
	}

	get flags() {
		return this.flagManager.flags;
	}
	get allFlags() {
		return this.flagManager.allFlags();
	}
	
	/**
	 * Provides the data used in Handlebars for the sheet template.
	 *
	 * @return {object} 
	 * @memberof MonsterBlock5e
	 * @override
	 */
	getData() {	// Override and add to the getData() function
		const data = super.getData();
		
		//console.debug(data);

		data.notOwner = !data.owner;
		data.limited = this.actor.limited;

		// Tweak a few properties to get a proper output
		data.data.details.xp.label = this.constructor.formatNumberCommas(data.data.details.xp.value);
		data.data.attributes.hp.average = this.constructor.averageRoll(data.data.attributes.hp.formula, this.actor.getRollData());
	
		this.prepAbilities(data);
		this.prepMovement(data);
		this.prepSenses(data);
		this.replaceNonMagPysicalText(data);

		//data.flags = duplicate(this.flags);	// Get the flags for this module, and make them available in the data
		data.flags = {};
		data.allFlags = [];

		for (let flag of this.allFlags) {
			data.flags[flag.name] = flag.value;
			data.allFlags.push(flag);
		}

		if (data.notOwner || !this.options.editable) data.flags.editing = false;
		if (!data.flags.editing) data.flags["show-delete"] = false;
		if (this.actor.limited) data.flags["show-bio"] = true;
		
		data.info = {		// A collection of extra information used mainly for conditionals
			hasSaveProfs: this.hasSaveProfs(),
			hasSkills: this.hasSkills(),							
			hasCastingFeature: Boolean(data.features.casting.items.length),
			isSpellcaster: this.isSpellcaster(),
			isInnateSpellcaster: this.isInnateSpellcaster(),
			isWarlock: this.isWarlock(),
			hasAtWillSpells: this.hasAtWillSpells(),
			hasLegendaryActions: Boolean(data.features.legendary.items.length),
			hasLair: Boolean(data.features.lair.items.length),
			hasReactions: Boolean(data.features.reaction.items.length),
			hasLoot: Boolean(data.features.equipment.items.length),
			vttatokenizer: Boolean(window.Tokenizer)
		}
		data.menus = this.menuTrees;
		Object.values(this.menuTrees).forEach(m => m.update(m, data));
				
		data.themes = this.themes;
		
		this.templateData = data;
		return data;
	}

	/**
	 * Constructs a FormData object using data from the sheet,
	 * this version gets data from `contenteditable` and other 
	 * custom fields rather than standard HTML form elements.
	 *
	 * @param {object} updateData     Additional data that should be merged with the form data
	 * @return {object} 
	 * @memberof MonsterBlock5e
	 * @override
	 */
	_getSubmitData(updateData={}) {	
		if (!this.form) throw new Error(`The FormApplication subclass has no registered form element`);
		
		const form = this.form;
		const formData = new FormDataExtended(this.form, { editors: this.editors });
				
		const dtypes = {};
		
		const fields = form.querySelectorAll("[data-field-key]");
		for (let field of fields) {
			let key = field.dataset.fieldKey;
			let type = field.dataset.dtype || "String";
			let value = field.innerText;
			
			value = this.handleSpecial(key, value);

			formData.append(key, value);
			dtypes[key] = type;
		}

		const selects = form.querySelectorAll("[data-select-key]");
		for (let select of selects) {
			let key = select.dataset.selectKey;
			let value = select.dataset.selectedValue;

			formData.append(key, value);
		}

		const skillCycles = form.querySelectorAll("[data-skill-id]");
		for (let skill of skillCycles) {
			let key = `data.skills.${skill.dataset.skillId}.value`;
			let value = skill.dataset.skillValue;

			formData.append(key, value);
			dtypes[key] = "Number";
		}

		const toggles = form.querySelectorAll("[data-toggle-key]");
		for (let toggle of toggles) {
			let key = toggle.dataset.toggleKey;
			let value = toggle.dataset.toggleValue == "true";

			formData.append(key, value);
			dtypes[key] = "Boolean";
		}

		// Process editable images
		const images = form.querySelectorAll("img[data-edit]")
		for (let img of images) {
			if (img.getAttribute("disabled")) continue;
			let basePath = window.location.origin + "/";
			if (ROUTE_PREFIX) basePath += ROUTE_PREFIX + "/";
			formData.append(img.dataset.edit, img.src.replace(basePath, ""));
		}
		
		formData.dtypes = dtypes;

		return flattenObject(
			mergeObject(
				formData.toObject(), 
				updateData
			)
		);
	}
	handleSpecial(key, value) {
		switch (key) {
			case "data.details.cr": {
				if (value.indexOf("/") > -1) {
					let cr = { "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 }[value];
					return cr != undefined ? cr : value;
				}
				break;
			}
		}

		return value;
	}
	async addFeature(event) {
		let type = event.currentTarget.dataset.type == "spell" ? "spell" : "item";
		let item = (await this._onItemCreate(event))[0];

		let id = item.id;
		if (type == "item") this.openItemEditor(event, id);
		else this.openSpellEditor(event, id);
	}
	prepMenus() {
		this.menuTrees = {
			attributes: this.prepAttributeMenu(),
			features: this.prepFeaturesMenu(),
			skills: this.addMenu("skill-roller"),
			saves: this.addMenu("save-roller")
		};
	}
	/**
	 * @param {...*} args - Array of arguments
	 * @return {MenuTree} 
	 * @memberof MonsterBlock5e
	 */
	addMenu(...args) {
		let menuTree = new MenuTree(this, ...args);
		if (!(this.menus)) this.menus = [];
		this.menus.push(menuTree);
		return menuTree;
	}
	/**
	* @return {MenuTree}
	* @memberof MonsterBlock5e
	*/
	prepFeaturesMenu() {
		let featMenu = this.addMenu("monster-features", `<i class="fa fa-plus"></i>`, undefined, undefined, ".main-section", "menu-active");

		featMenu.add(this.createFeatureAdder({ type: "feat" }, "MOBLOKS5E.AddFeat"));
		featMenu.add(this.createFeatureAdder({ 
			"type": "weapon",
			"activation.type": "action",
			"weapon-type": "natural",
			"action-type": "mwak",
			"target.value": "1",
			"range.value": "5",
			"range.units": "ft"
		}, "MOBLOKS5E.AddAttack"));
		featMenu.add(this.createFeatureAdder({ type: "feat", "activation.type": "action" }, "MOBLOKS5E.AddAct"));
		featMenu.add(this.createFeatureAdder({ type: "spell", "level": "0" }, "MOBLOKS5E.AddSpell"));
		featMenu.add(this.createFeatureAdder({ type: "loot" }, "MOBLOKS5E.AddInventory"));
		featMenu.add(this.createFeatureAdder({ type: "consumable" }, "MOBLOKS5E.AddConsumable"));

		if (window.QuickInsert) {
			featMenu.add(new MenuItem("trigger", {
				control: "quickInsert",
				icon: `<i class="fas fa-search"></i>`,
				label: game.i18n.localize("MOBLOKS5E.QuickInsert")
			}));
		}

		return featMenu;
	}
	createFeatureAdder(data, label) {
		return new MenuItem("trigger", {
			control: "addFeature",
			data: data,
			icon: `<i class="fa fa-plus"></i>`,
			label: game.i18n.localize(label)
		});
	}
	quickInsert() {
		QuickInsert.open({
			allowMultiple: true,
			restrictTypes: ["Item"],
			onSubmit: async (item) => {
				const theItem = await fromUuid(item.uuid);
				this.actor.createEmbeddedDocuments("Item", [theItem]);
			}
		});
	}

	/**
	 * @return {MenuTree} 
	 * @memberof MonsterBlock5e
	 */
	prepAttributeMenu() {
		let attrMenu = this.addMenu("monster-attributes", `<i class="fa fa-edit"></i>`, undefined, undefined, ".monster-attributes2", "menu-active");
		
		attrMenu.add(this.prepareSavingThrowsMenu(attrMenu));
		attrMenu.add(this.prepSkillsMenu(attrMenu));
		attrMenu.add(this.prepDamageTypeMenu("dv", "DND5E.DamVuln", attrMenu));
		attrMenu.add(this.prepDamageTypeMenu("dr", "DND5E.DamRes", attrMenu));
		attrMenu.add(this.prepDamageTypeMenu("di", "DND5E.DamImm", attrMenu));
		attrMenu.add(this.prepConditionTypeMenu("ci", "DND5E.ConImm", attrMenu));
		attrMenu.add(this.prepLanguageMenu("languages", "DND5E.Languages", attrMenu));
		
		return attrMenu;
	}
	prepareSavingThrowsMenu(attrMenu) {
		let menu = this.addMenu("saves", game.i18n.localize("MOBLOKS5E.SavingThrowS"), attrMenu);

		Object.entries(this.actor.data.data.abilities).forEach(([ab, ability]) => {
			let flag = Boolean(ability.proficient);
			menu.add(new MenuItem("save-toggle", {
				name: CONFIG.DND5E.abilities[ab], 
				flag, d: ab,
				target: `data.abilities.${ab}.proficient`,
				icon: flag ? '<i class="fas fa-check"></i>' : '<i class="far fa-circle"></i>'
			}, (m) => {
				m.flag = Boolean(this.actor.data.data.abilities[ab]?.proficient);
				m.icon = m.flag ? '<i class="fas fa-check"></i>' : '<i class="far fa-circle"></i>';
			}));
		});

		return menu;
	}
	prepSkillsMenu(attrMenu) {
		let menu = this.addMenu("skills", game.i18n.localize("MOBLOKS5E.SkillS"), attrMenu);

		Object.entries(this.actor.data.data.skills).forEach(([id, skill]) => {
			skill.abilityAbbr = game.i18n.localize(`MOBLOKS5E.Abbr${skill.ability}`);
			skill.icon = this._getProficiencyIcon(skill.value);
			skill.hover = CONFIG.DND5E.proficiencyLevels[skill.value];
			skill.label = CONFIG.DND5E.skills[id];
			menu.add(new MenuItem("skill", { id, skill }, (m, data) => {
				m.skill.icon = data.data.skills[m.id].icon,
				m.skill.value = data.data.skills[m.id].value
			}));
		});
			
		this._skillMenu = menu;
		return menu;
	}
	prepLanguageMenu(id, label, attrMenu) {
		let menu = this.addMenu("languages", game.i18n.localize(label), attrMenu);
		this.getTraitChecklist(id, menu, "data.traits.languages", "language-opt", CONFIG.DND5E.languages);
		return menu;
	}
	prepDamageTypeMenu(id, label, attrMenu) {
		let menu = this.addMenu(id, game.i18n.localize(label), attrMenu);
		this.getTraitChecklist(id, menu, `data.traits.${id}`, "damage-type", CONFIG.DND5E.damageResistanceTypes);
		return menu;
	}
	prepConditionTypeMenu(id, label, attrMenu) {
		let menu = this.addMenu(id, game.i18n.localize(label), attrMenu);
		this.getTraitChecklist(id, menu, `data.traits.${id}`, "condition-type", CONFIG.DND5E.conditionTypes);
		return menu;
	}
	/**
	 * Re-localizes the text for non-magical physical damage
	 * to match the working in the books.
	 *
	 * @memberof MonsterBlock5e
	 */
	replaceNonMagPysicalText(data) {
		["di", "dr", "dv"].forEach(damageSet => {
			const selected = data.actor.data.traits[damageSet]?.selected;
			if (selected.physical) selected.physical = game.i18n.localize("MOBLOKS5E.physicalDamage");
		});
	}
	/**
	 * This method creates MenuItems and populates the target menu for trait lists.
	 *
	 * @param {String} id - The id of the data attribute
	 * @param {MenuTree} menu - The parent menu
	 * @param {String} target - The data attribute target
	 * @param {String} itemType - The type of item
	 * @param {Object} traitList - The CONFIG.System.List of trait options.
	 * @memberof MonsterBlock5e
	 */
	getTraitChecklist(id, menu, target, itemType, traitList) {
		Object.entries(traitList).forEach(([d, name]) => {
			let flag = this.actor.data.data.traits[id].value.includes(d);
			menu.add(new MenuItem(itemType, {
				d, name, flag,
				target: target,
				icon: flag ? '<i class="fas fa-check"></i>' : '<i class="far fa-circle"></i>'
			}, (m) => {
				m.flag = this.actor.data.data.traits[id].value.includes(d);
				m.icon = m.flag ? '<i class="fas fa-check"></i>' : '<i class="far fa-circle"></i>';
			}));
		});
		menu.add(new MenuItem("custom-val", {
			d: "custom",
			name: game.i18n.localize("DND5E.TraitSelectorSpecial"),
			target: target + ".custom",
			icon: "",
			value: this.actor.data.data.traits[id].custom
		}, (m) => {
				m.value = this.actor.data.data.traits[id].custom;
		}));
	}

	hasSaveProfs() {
		return Object.values(this.actor.data?.data?.abilities)?.some(ability => ability.proficient);
	}
	hasSkills() {
		return Object.values(this.actor.data?.data?.skills)?.some(skill => skill.value);
	}
	isSpellcaster () {	// Regular spellcaster with typical spell slots.
		return this.actor.data.items.some((item) => {
			return item.data.level > 0.5 && (
				item.data.preparation?.mode === "prepared" || 
				item.data.preparation?.mode === "always"
			);
		});
	}
	isInnateSpellcaster() {	// Innate casters have lists of spells that can be cast a certain number of times per day
		return this.actor.data.items.some((item) => {
			return item.data.preparation?.mode === "innate";
		});
	}
	isWarlock() {
		return this.actor.data.items.some((item) => {
			return item.data.preparation?.mode === "pact";
		});
	}
	hasAtWillSpells() {	// Some normal casters also have a few spells that they can cast "At will"
		return this.actor.data.items.some((item) => {
			return item.data.preparation?.mode === "atwill";
		});
	}
	hasReactions() {
		return this.actor.data.items.some((item) => {
			return this.constructor.isReaction(item)
		});
	}
	hasLair() {
		return this.actor.data.items.some((item) => {
			return this.constructor.isLairAction(item)
		});
	}
	hasLegendaryActions() {
		return this.actor.data.items.some((item) => {
			return this.constructor.isLegendaryAction(item)
		});
	}
	async openTokenizer() {
		/* global Tokenizer */
		if (window.Tokenizer) {
			Tokenizer.tokenizeActor(this.object);
		}
	}
	async resetDefaults() {
		await this.setCurrentTheme(game.settings.get("monsterblock", "default-theme"));
		this.actor.update({"flags.monsterblock": this.defaultFlags});
	}
	static prop = "A String";
	static themes = {
		"default": { name: "MOBLOKS5E.DefaultThemeName", class: "default-theme" },
		"foundry": { name: "MOBLOKS5E.FoundryThemeName", class: "foundry-theme" },
		"srd":     { name: "MOBLOKS5E.SimpleThemeName", class: "srd-theme" },
		"dark":    { name: "MOBLOKS5E.DarkThemeName", class: "dark-theme" },
		"cool":    { name: "MOBLOKS5E.CoolThemeName", class: "cool-theme" },
		"hot":     { name: "MOBLOKS5E.HotThemeName", class: "hot-theme" },
		"system":  { name: "MOBLOKS5E.SystemThemeName", class: "system-theme" },
		"custom":  { name: "MOBLOKS5E.CustomThemeName", class: "" }
	}
	get themes() {
		if (this._themes) return this._themes;
		
		this._themes = MonsterBlock5e.themes;
		this._themes.custom = { name: "MOBLOKS5E.CustomThemeName", class: this.flagManager.flags["custom-theme-class"] };
		return this._themes;
	}
	get currentTheme() {
		return this.flags["theme-choice"];
	}
	set currentTheme(t) {
		this.setCurrentTheme(t);
	}
	async setCurrentTheme(theme) {
		if (!(theme in this.themes)) return this.currentTheme;
		let oldTheme = this.themes[this.currentTheme];
		let newTheme = this.themes[theme];
			
		this.element.removeClass(oldTheme.class);
		this.element.addClass(newTheme.class);
		
		let classes = this.options.classes;
		classes[classes.indexOf(oldTheme.class)] = newTheme.class;
		
		return await Flags.setFlag(this.flagManager, "theme-choice", theme);
	}
		
	async pickTheme(event) {
		let value = event.currentTarget.dataset.value;
		
		if (value == "custom") {
			await this.setCurrentTheme("default");
			const className = event.currentTarget.nextElementSibling.value;
			this.themes.custom.class = className;
			await Flags.setFlag(this.flagManager, "custom-theme-class", className);
		}
		
		this.setCurrentTheme(value);
	}
	async setFontSize(event) {
		const value = parseFloat(event.currentTarget.nextElementSibling.value);

		if (isNaN(value)) {
			ui.notifications.error(game.i18n.localize("MOBLOK5E.font-size.NaN-error"));
			throw new Error(game.i18n.localize("MOBLOK5E.font-size.NaN-error"));
		}

		await Flags.setFlag(this.flagManager, "font-size", value)
	}
	
	_prepareItems(data) {
		return new ItemPrep(this, data);
	}
	listsPassPercept(senses) {
		return senses?.toLowerCase().indexOf(game.i18n.localize("MOBLOKS5E.PerceptionLocator")) > -1;
	}
	getPassivePerception() {
		return game.i18n.format("MOBLOKS5E.PassivePerception", {
			pp: this.actor.data.data.skills.prc.passive
		});
	}
	prepAbilities(data) {
		Object.entries(data.data?.abilities)?.forEach(
			([id, ability]) => ability.abbr = game.i18n.localize("MOBLOKS5E.Abbr" + id)
		)
	}
	/**
	 * @typedef moveData 
	 * A set of data about a movement speed 
	 * used to generate the text to display on the sheet.
	 * 
	 * @property {string} name - The name of the movement type
	 * @property {Boolean} showLabel - True if the label should be shown, otherwise the label is hidden.
	 * @property {string} label - The label for this movement speed, should not be capitalized
	 * @property {number|string} value - The speed, if zero this is set to an empty string so that nothing is displayed
	 * @property {string} unit - The unit these measurements are in, typically an abbreviation ending in a character like a period
	 * @property {string} key - The data-field-key, the dot syntax idnetifier for the data this field mutates
	 */
	/**
	 * Prepares a new `movement` property on data
	 * containing information needed to format the
	 * various movements speeds on the sheet.
	 *
	 * @param {object} data - The data object returned by this.getData() for the template.
	 * @memberof MonsterBlock5e
	 */
	prepMovement(data) {
		const moveTpyes = ["walk", "burrow", "climb", "fly", "swim"];
		/** @type moveData[] */
		const movement = [];
		const hover = data.data.attributes.movement.hover;

		for (let move of moveTpyes) {
			const speed = data.data.attributes.movement[move];
			
			let moveName = move;
			if (moveName == "fly" && hover) moveName = "hover";
			const moveNameCaps = moveName.replace(moveName[0], moveName[0].toUpperCase());

			movement.push({
				name: move,
				fly: move == "fly",
				showLabel: move != "walk",
				label: game.i18n.localize(`DND5E.Movement${moveNameCaps}`).toLowerCase(),
				value: speed > 0 ? speed : "",
				unit: data.data.attributes.movement.units + game.i18n.localize("MOBLOKS5E.SpeedUnitAbbrEnd"),
				key: `data.attributes.movement.${move}`
			});
		}

		data.movement = movement;
	}

	/**
	 * @typedef senseData 
	 * A set of data about a sense 
	 * used to generate the text to display on the sheet.
	 * 
	 * @property {string} name - The name of the sense type
	 * @property {string} label - The label for this sense, should not be capitalized
	 * @property {number|string} value - The sense, if zero this is set to an empty string so that nothing is displayed
	 * @property {string} unit - The unit these measurements are in, typically an abbreviation ending in a character like a period
	 * @property {string} key - The data-field-key, the dot syntax idnetifier for the data this field mutates
	 */
	/**
	 * Prepares a new `senses` property on data
	 * containing information needed to format the
	 * various senses speeds on the sheet.
	 *
	 * @param {object} data - The data object returned by this.getData() for the template.
	 * @memberof MonsterBlock5e
	 */
	prepSenses(data) {
		const senseTypes = ["blindsight", "darkvision", "tremorsense", "truesight", "special"];
		/** @type senseData[] */
		const senses = [];

		for (let sense of senseTypes) {
			const range = data.data.attributes.senses[sense];

			let senseName = sense;
			const senseNameCaps = senseName.replace(senseName[0], senseName[0].toUpperCase());

			senses.push({
				name: sense,
				label: game.i18n.localize(`DND5E.Sense${senseNameCaps}`).toLowerCase(),
				value: sense == "special" ? range : range > 0 ? range : "",
				unit: data.data.attributes.senses.units + game.i18n.localize("MOBLOKS5E.SpeedUnitAbbrEnd"),
				key: `data.attributes.senses.${sense}`
			});
		}

		const special = senses.pop();
		data.senses = senses;
		data.specialSenses = {
			passivePerception: this.getPassivePerception(),
			special
		}
	}

	async switchToDefault() {
		const config = CONFIG[this.object.documentName];
		const type = this.object.data.type;
		const classes = Object.values(config.sheetClasses[type]);
		let defcls = classes.find(c => c.default).id;

		// When Monster Blocks *is* the default, use the system default instead.
		if (defcls == "dnd5e.MonsterBlock5e") defcls = "dnd5e.ActorSheet5eNPC";
		
		return await this.constructor.switchSheetTo(defcls, this);
	}
	static async switchSheetTo(sheetClass, that) {
		const sheet = that.object.sheet;
		await sheet.close();
		that.object._sheet = null;
		delete that.object.apps[sheet.appId];

		await that.object.setFlag("core", "sheetClass", sheetClass);

		return that.object.sheet.render(true)
	}

	get defaultFlags() {
		return duplicate({
			"initialized": true,
			"attack-descriptions": game.settings.get("monsterblock", "attack-descriptions"),
			"casting-feature": game.settings.get("monsterblock", "casting-feature"),
			"inline-secrets": game.settings.get("monsterblock", "inline-secrets"),
			"hidden-secrets": game.settings.get("monsterblock", "hidden-secrets"),
			"current-hit-points": game.settings.get("monsterblock", "current-hit-points"),
			"maximum-hit-points": game.settings.get("monsterblock", "maximum-hit-points"),
			"hide-profile-image": game.settings.get("monsterblock", "hide-profile-image"),
			"show-lair-actions": game.settings.get("monsterblock", "show-lair-actions"),
			"theme-choice": game.settings.get("monsterblock", "default-theme"),
			"custom-theme-class": game.settings.get("monsterblock", "custom-theme-class"),
			"editing": game.settings.get("monsterblock", "editing"),
			"show-not-prof": game.settings.get("monsterblock", "show-not-prof"),
			"show-resources": game.settings.get("monsterblock", "show-resources"),
			"show-skill-save": game.settings.get("monsterblock", "show-skill-save"),
			"show-delete": false,
			"show-bio": false,
			"scale": 1.0,
			"compact-window": game.settings.get("monsterblock", "compact-window"),
			"compact-feats": game.settings.get("monsterblock", "compact-feats"),
			"compact-layout": game.settings.get("monsterblock", "compact-layout"),
			"font-size": game.settings.get("monsterblock", "font-size")
		});
	}
	static async getQuickInserts() {
		if (game.data.modules.find(m => m.id == "quick-insert")?.active) {
			let { CharacterSheetContext, dnd5eFilters } = await import("../../../quick-insert/quick-insert.js");
			Object.assign(this, { CharacterSheetContext, dnd5eFilters });
		}
		else {
			this.CharacterSheetContext = false;
		}
	}
	async activateListeners(html) {	// We need listeners to provide interaction.
		this.setWindowClasses(html);
		this.applyFontSize(html);
		
		html.find(".switch").click((event) => {							// Switches are the primary way that settings are applied per-actor.
			event.preventDefault();
			let control = event.currentTarget.dataset.control;			// A data attribute is used on an element with the class .switch, and it contains the name of the switch to toggle.
			
			let state = !this.flagManager.flags[control];	            // Get the current setting of this flag, and reverse it.
			if (debug.enabled) console.debug(`Monster Block | %cSwitching: ${control} to: ${state}`, "color: orange")
			
			this.flagManager.flags[control] = state;                    // Set the flag to the new state.
		});
		html.find(".trigger").click((event) => {							
			event.preventDefault();
			let control = event.currentTarget.dataset.control;
			
			this[control](event);
		});
		html.find(".switch-input").keydown((event) => {							
			if (event.key !== "Enter") return;
			event.preventDefault();
			let target = event.currentTarget;
			let anchor = target.previousElementSibling;
			event.currentTarget = anchor;

			this[anchor.dataset.control](event);
		});
		html.find(".profile-image").click((event) => {
			event.preventDefault();

			new ImagePopout(this.actor.data.img, {
				title: this.actor.name,
				shareable: true,
				uuid: this.actor.uuid
			}).render(true);
		});
		
		html.find("[data-roll-formula]").click(async (event) => {			// Universal way to add an element that provides a roll, just add the data attribute "data-roll-formula" with a formula in it, and this applies.
			event.preventDefault();									// This handler makes "quick rolls" possible, it just takes some data stored on the HTML element, and rolls dice directly.
			event.stopPropagation();
			
			const formula = event.currentTarget.dataset.rollFormula;
			const target = event.currentTarget.dataset.rollTarget;
			const success = event.currentTarget.dataset.rollSuccess;
			const failure = event.currentTarget.dataset.rollFailure;
			const handler = event.currentTarget.dataset.rollHandler;
			let flavor = event.currentTarget.dataset.rollFlavor;	// Optionally, you can include data-roll-flavor to add text to the message.
			
			let roll;
			try { 
				roll = new Roll(formula);
				await roll.roll({ async: true }); 
			}
			catch (e) {
				console.error(e);
				ui.notifications.error(e);
				roll = new Roll("0");
				await roll.roll({ async: true });
			}
			
			if (target) {
				let s = roll.total >= parseInt(target, 10);
				if (handler) this[handler](s, event); 
				
				flavor += `<span style="font-weight: bold; color: ${s ? "green" : "red"};">${s ? success : failure}</span>`;
			}
			
			roll.toMessage({					// Creates a new Roll, rolls it, and sends the result as a message
				flavor: flavor,										// Including the text as defined
				speaker: ChatMessage.getSpeaker({actor: this.actor})// And setting the speaker to the actor this sheet represents
			});
		});
		
		// Special Roll Handlers
		html.find(".ability").click(async (event) => {
			event.preventDefault();
			let ability = event.currentTarget.dataset.ability;
			
			if (window.BetterRolls) window.BetterRolls.rollCheck(this.actor, ability, { event });
			else this.actor.rollAbilityTest(ability, {event: event});
		});
		html.find(".saving-throw").click(async (event) => {
			event.preventDefault();
			let ability = event.currentTarget.dataset.ability;
			
			if (window.BetterRolls) window.BetterRolls.rollSave(this.actor, ability, { event });
			else this.actor.rollAbilitySave(ability, {event: event});
		});
		html.find(".skill").click(async (event) => {
			event.preventDefault();
			let skill = event.currentTarget.dataset.skill;
			if (window.BetterRolls) window.BetterRolls.rollSkill(this.actor, skill, { event });
			else this.actor.rollSkill(skill, {event: event});
		});
		
		// Item and spell "roll" handlers. Really just pops their chat card into chat, allowing for rolling from there.
		html.find(".item-name, .spell").click(async (event) => {
			event.preventDefault();
			event.stopPropagation();
			let id = event.currentTarget.dataset.itemId;
			const item = this.actor.items.get(id);
			if (window.BetterRolls) {
				const preset = event.altKey ? 1 : 0;
				window.BetterRolls.rollItem(item, { event, preset }).toMessage();
			}
			else return item.roll(); // Conveniently, items have all this logic built in already.
		});
		
		// Item editing handlers. Allows right clicking on the description of any item (features, action, etc.) to open its own sheet to edit.
		html.find(".item").contextmenu(this.openItemEditor.bind(this));
		html.find(".spell").contextmenu(this.openSpellEditor.bind(this));
					
		html.find(".select-field").click((event) => {
			let control = event.currentTarget;
			let selection = event.target;
			let value = selection.dataset.selectionValue;
			if (!value) return false;
			let label = control.querySelector(".select-label");

			label.innerText = selection.innerText;
			control.dataset.selectedValue = value;

			this._onChangeInput(event);
		});
		html.find("[contenteditable=true]").click((event) => {
			event.stopPropagation();
		})
		html.find("[contenteditable=true]").keydown((event) => {
			//let el = event.currentTarget;

			switch (event.key) {
				case "Enter": {
					event.preventDefault();
					this._onChangeInput(event);
					break;
				}
			}
		});
		html.find(".toggle-button").click((event) => {
			const el = event.currentTarget;
			el.dataset.toggleValue = el.dataset.toggleValue != "true";
			this._onChangeInput(event);
		})
		html.find("[data-save-toggle], [data-damage-type], [data-condition-type], [data-language-opt]").click((event) => {
			let el = event.currentTarget;
			let state = (el.dataset.flag == "true");
			el.dataset.flag = !state;
			let updateData;

			if (el.dataset.saveToggle) {
				updateData = { [el.dataset.saveToggle]: !state ? 1 : 0 };
			}
			else updateData = this.getTogglesData(html);

			this._onSubmit(event, { updateData });
		});
		html.find(".custom-trait input").blur(this.onCustomTraitChange.bind(this));
		html.find(".custom-trait input").keydown((event) => {
			if (event.key == "Enter") this.onCustomTraitChange(event);
		});
		
		
		html.find("[contenteditable=true]").focusin(this._onFocusEditable.bind(this));
		
		html.find("[contenteditable=true]").focusout(this._onUnfocusEditable.bind(this));
		html.find(".trait-selector").contextmenu(this._onTraitSelector.bind(this));
		html.find(".trait-selector-add").click(this._onTraitSelector.bind(this));
		html.find("[data-skill-id]").contextmenu(this._onCycleSkillProficiency.bind(this));
		html.find("[data-skill-id]").click(this._onCycleSkillProficiency.bind(this));

		this.menus.forEach(m => m.attachHandler());

		html.find(".menu").click(e => e.stopPropagation());
		html.click(() => {
			Object.values(this.menuTrees).forEach(m => m.close());
		});

		html.find(".delete-item").click((event) => {
			event.preventDefault();
			event.stopPropagation();
			const el = event.currentTarget;
			this.actor.deleteEmbeddedDocuments("Item", [el.dataset.itemId]);
		});

		this._dragDrop.forEach(d => d.bind(html[0]));

		if (this.isEditable && this.flags.editing) {
			// Detect and activate TinyMCE rich text editors
			html.find(".editor-content[data-edit]").each((i, div) => this._activateEditor(div));
			html.find("img[data-edit]").contextmenu(ev => this._onEditImage(ev));
		}
		
		if (!this.lastSelection) this.lastSelection = {};
		const key    = this.lastSelection.key    ? `[data-field-key="${this.lastSelection.key}"]` : "";
		const entity = this.lastSelection.entity ? `[data-entity="${this.lastSelection.entity}"]` : "";
		if (key) this.selectElement(html.find(`${key}${entity}`)[0]);

		html.find(".editor-content img").click((event) => {
			event.preventDefault();
			let imgSource = event.target.src;
			new ImagePopout(imgSource, {
				title: this.actor.name,
				shareable: true,
				uuid: this.actor.uuid
			}).render(true);
		});

		html.find(".item").click(this.toggleExpanded.bind(this));

		// Configure Special Flags
		html.find(".config-button").click(this._onConfigMenu.bind(this));
	}
	
	toggleExpanded(event) {
		if (!this.flags["compact-feats"]) return;

		const element = event.currentTarget;
		const name = element.querySelector(".item-name");
		const id = name.dataset.itemId;

		const item = this.actor.items.get(id);
		const expanded = item.getFlag("monsterblock", "expanded");

		item.setFlag("monsterblock", "expanded", !expanded);
	}
	
	setWindowClasses(html) {
		const outer = html.parents(".monsterblock");

		const miniBlockFlags = [
		//	"mini-block",
			"compact-window",
			"compact-layout",
			"compact-feats"
		];

		miniBlockFlags.forEach(flag => {
			if (this.flags[flag]) outer.addClass(flag);
			else outer.removeClass(flag);
		});
	}
	applyFontSize(html) {
		const outer = html.parents(".monsterblock");
		const size = this.flags["font-size"] || parseFloat(window.getComputedStyle(document.body).fontSize);
		outer.css("font-size", `${size}px`);
	}
	selectInput(event) {
		let el = event.currentTarget;
		this.selectElement(el);
		this.lastSelection.key = el.dataset.fieldKey;
		this.lastSelection.entity = el.dataset.entity;
	}
	selectElement(el) {
		if (!el || !el.firstChild) return;
		let selection = window.getSelection();
		selection.removeAllRanges();
		let range = document.createRange();
		range.selectNode(el.firstChild);
		selection.addRange(range);
	}

	openItemEditor(event, d) {
		event.preventDefault();
		event.stopPropagation();
		let id = d ?? event.currentTarget.querySelector(".item-name").dataset.itemId;
		const item = this.actor.items.get(id);
		item.sheet.render(true);
	}

	openSpellEditor(event, d) {
		event.preventDefault();
		event.stopPropagation();
		let id = d ?? event.currentTarget.dataset.itemId;
		const item = this.actor.items.get(id);
		item.sheet.render(true);
	}

	onCustomTraitChange(event) {
		let input = event.currentTarget;
		let target = input.name
		let value = input.value;

		this._onSubmit(event, { updateData: { [target]: value } })
	}
	getTogglesData(html) {
		let data = {};

		["dv", "dr", "di"].forEach(dg => {
			let damageTypes = html.find(`[data-damage-type="data.traits.${dg}"]`);
			let key = `data.traits.${dg}.value`;
			let value = [];
			for (let dt of damageTypes) {
				let state = (dt.dataset.flag == "true");
				if (state) value.push(dt.dataset.option);
			}
			data[key] = value;
		});

		const traitReducer = (acc, n) => {
			if (n.dataset.flag == "true") acc.push(n.dataset.option);
			return acc; 
		}
		data["data.traits.languages.value"] =
		[...html.find(`[data-language-opt]`)].reduce(traitReducer, []);

		data["data.traits.ci.value"] =
		[...html.find(`[data-condition-type]`)].reduce(traitReducer, []);

		return data;
	}
	_onFocusEditable(event) {
		this.lastValue = event.currentTarget.innerText;
		this.selectInput(event);
	}
	_onUnfocusEditable(event) {
		if (event.currentTarget.innerText == this.lastValue) return;
		this._onChangeInput(event);
		this.lastValue = undefined;
	}
	/**
	 * This method is used as an event handler when an input is changed, updated, or submitted.
	 * The input value is passed to Input Expressions for numbers, Roll for roll formulas.
	 * If the input is attached to an item, it updates that item.
	 *
	 * @param {Event} event - The triggering event.
	 * @return {null} 
	 * @memberof MonsterBlock5e
	 */
	_onChangeInput(event) {
		const input = event.currentTarget;

		input.innerText = input.innerText.replace(/\s+/gm, " ");	// Strip excess whitespace
		let value = input.innerText;								// .innerText will not include any HTML tags
		
		const entity = input.dataset.entity ? 
			this.actor.getEmbeddedDocument("Item", input.dataset.entity) : 
			this.actor.data;
		const key = input.dataset.fieldKey
		const dtype = input.dataset.dtype;

		switch (dtype) {
			case "Number":
				if (value != "") value = this.handleNumberChange(entity, key, input, event);
				break;
			case "Roll": {
				try { 
					value ? new Roll(value).roll() : null;
				}
				catch (e) {
					console.error(e);
					ui.notifications.error(e);
					input.innerText = getProperty(entity, key);
				}
				break;
			}
		}

		if (input.dataset.entity) {		
			this.actor.updateEmbeddedDocuments("Item", [{
				_id: input.dataset.entity,
				[key]: value
			}]).then(()=> { super._onChangeInput(event); });
			return;
		}

		super._onChangeInput(event);
	}
	
	/**
	 * Evaluate numeric input, handling expressions using Input Expressions
	 *
	 * @param {Entity} entity - The entity (Actor, Item) for the sheet.
	 * @param {string} key - Data key for the value
	 * @param {JQuery} input - The input element
	 * @param {Event} event - The triggering event
	 * @memberof MonsterBlock5e
	 */
	handleNumberChange(entity, key, input, event) {
		const current = getProperty(entity, key);

		if (window.math?.roll)
			return inputExpression(new ContentEditableAdapter(input), current, { 
				entity, event, 
				data: this.templateData,
				actor: this.object
			});
		else {
			input.innerText = current;
			const msg = "Input Expressions for Monster Blocks appears to be missing or has failed to initialize.";
			ui.notifications.error(msg);
			throw Error(msg);
		}
	}

	_onConfigMenu(event) {
		event.stopPropagation();
		return super._onConfigMenu(event);
	}

	_onTraitSelector(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const label = $(a).find(".attribute-name");
		const options = {
			name: a.dataset.target,
			title: label.innerText,
			choices: CONFIG.DND5E[a.dataset.options]
		};
		new TraitSelector(this.actor, options).render(true)
	}
	_onCycleSkillProficiency(event) {
		event.preventDefault();
		let elem = event.currentTarget;
		let value = elem.dataset.skillValue;

		// Get the current level and the array of levels
		const level = parseFloat(value);
		const levels = [0, 1, 0.5, 2];
		let idx = levels.indexOf(level);

		// Toggle next level - forward on click, backwards on right
		if (event.type === "click") {
			elem.dataset.skillValue = levels[(idx === levels.length - 1) ? 0 : idx + 1];
		} else if (event.type === "contextmenu") {
			elem.dataset.skillValue = levels[(idx === 0) ? levels.length - 1 : idx - 1];
		}

		// Update the field value and save the form
		this._onSubmit(event);
	}
	
	/**
	 * Closes the sheet.
	 *
	 * This override adds clearing of some temporary properties
	 * to avoid potential errors.
	 *
	 * @override
	 * @param {object} args
	 * @return {Promise} 
	 * @memberof MonsterBlock5e
	 */
	async close(...args) {
		this.lastValue = undefined;
		this.lastSelection = {};
		return super.close(...args);
	}

	async maximize() {
		await super.maximize();
		await this.render(true);
	}

	/**
	 *
	 *
	 * @param {boolean} success - Whether or not the roll was a success.
	 * @param {Event} event - The event object associated with this roll.
	 * @memberof MonsterBlock5e
	 */
	async setCharged(success, event) {
		await this.actor.updateEmbeddedDocuments("Item", [{
			_id: event.currentTarget.dataset.itemId,
			"data.recharge.charged": success
		}])

		super._onChangeInput(event);
	}

	static isMultiAttack(item) {	// Checks if the item is the multiattack action.
		let name = item.name.toLowerCase().replace(/\s+/g, "");	// Convert the name of the item to all lower case, and remove whitespace.
		return game.i18n.translations["MOBLOKS5E"]["MultiattackLocators"].some(loc => name.includes(loc));
	}
	
	static isLegendaryResistance(item) {
		return item.data?.consume?.target === "resources.legres.value";
	}
	
	// Item purpose checks
	static isLegendaryAction(item) {
		return item.data?.activation?.type === "legendary";
	}
	
	static isLairAction(item) {
		return item.data?.activation?.type === "lair";
	}
	
	static isReaction(item) {
		return item.data?.activation?.type === "reaction";
	}
		

	static getItemAbility(item, actor, master) {
		return master.object.items.get(item._id).abilityMod;
	}

	static formatNumberCommas(number) {
		return number.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");	// https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
	}
	static averageRoll(formula, mods) {
		if (!formula) return 0;
		try { 
			const rollMin = new Roll(formula, mods);
			const rollMax = rollMin.clone();
			return Math.floor((		// The maximum roll plus the minimum roll, divided by two, rounded down.
				rollMax.evaluate({ maximize: true }).total +
				rollMin.evaluate({ minimize: true }).total
			) / 2);
		}
		catch (e) {
			console.error(e);
			ui.notifications.error(e);
			return 0;
		}
	}
	static handlebarsHelpers = {
		"moblok-hascontents": (obj) => { // Check if an array is empty.
			return Object.keys(obj).length > 0;
		},
		"moblok-enrichhtml": (str, owner, flags) => { // Formats any text to include proper inline rolls and links.
			return TextEditor.enrichHTML(str || "", { secrets: (owner && !flags["hidden-secrets"]) });
		}
	};

	static async preLoadTemplates() {
		return loadTemplates([
			// Shared Partials
			"modules/monsterblock/templates/dnd5e/switches.hbs",
			"modules/monsterblock/templates/dnd5e/parts/switch.hbs",

			// Actor Sheet Sections
			"modules/monsterblock/templates/dnd5e/bio.hbs",
			"modules/monsterblock/templates/dnd5e/header.hbs",
			"modules/monsterblock/templates/dnd5e/main.hbs",
			
			// Actor Sheet Partials
			"modules/monsterblock/templates/dnd5e/parts/header/identity.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes1.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/abilities.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes2.hbs",

			"modules/monsterblock/templates/dnd5e/parts/header/attributes/armorclass.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes/hitpoints.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes/movement.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes/saves.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes/skills.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes/senses.hbs",
			"modules/monsterblock/templates/dnd5e/parts/header/attributes/damage.hbs",

			"modules/monsterblock/templates/dnd5e/parts/main/spellcasting.hbs",
			"modules/monsterblock/templates/dnd5e/parts/main/attack.hbs",
			"modules/monsterblock/templates/dnd5e/parts/main/legendaryActs.hbs",
			"modules/monsterblock/templates/dnd5e/parts/main/lairActs.hbs",

			"modules/monsterblock/templates/dnd5e/parts/menuItem.hbs",
			"modules/monsterblock/templates/dnd5e/parts/resource.hbs",
			"modules/monsterblock/templates/dnd5e/parts/featureBlock.hbs",
			"modules/monsterblock/templates/dnd5e/parts/damageRoll.hbs"

		]);
	}
}
