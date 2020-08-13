import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";
import TraitSelector from "../../systems/dnd5e/module/apps/trait-selector.js";

/**
 * Main class for the Monster Blocks module
 *
 * @export
 * @class MonsterBlock5e
 * @extends {ActorSheet5eNPC}
 */
export class MonsterBlock5e extends ActorSheet5eNPC {
	constructor(...args) {
		super(...args);
		
		this.position.default = true;
		
		this.prepFlags().then((p) => {
			this.options.classes.push(this.themes[this.currentTheme].class);
			if (p) this.setCurrentTheme(this.currentTheme);
		});
		this.prepMenus();
	}

	get template() {
		return "modules/monsterblock/actor-sheet.html";
	}
	
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["monsterblock", "sheet", "actor"],
			width: 406,	// Column width of 390, plus 8px of padding on each side.
			height: 400, // Arbitrary and basically meaningless.
			dragDrop: [{dragSelector: ".item .item-name"}, {dragSelector: ".spell-list .spell"}],
			resizable: false
		});
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
		
		console.debug(data);

		// Tweak a few properties to get a proper output
		data.data.details.xp.label = this.constructor.formatNumberCommas(data.data.details.xp.value);
		data.data.traits.senses = this.prepSenses(data.data.traits.senses);
		data.data.attributes.hp.average = this.constructor.averageRoll(data.data.attributes.hp.formula);
		this.prepAbilities(data);

		data.flags = duplicate(this.flags);	// Get the flags for this module, and make them available in the data
		if (!data.flags.editing) data.flags["show-delete"] = false;
		
		data.info = {		// A collection of extra information used mainly for conditionals
			hasSaveProfs: this.hasSaveProfs(),
			hasSkills: this.hasSkills(),							
			hasCastingFeature: Boolean(data.features.casting.items.length),
			isSpellcaster: this.isSpellcaster(),
			isInnateSpellcaster: this.isInnateSpellcaster(),
			isWarlock: this.isWarlock(),
			hasAtWillSpells: this.hasAtWillSpells(),
			hasLegendaryActions: Boolean(data.features.legendary.items.length),
			hasLair: Boolean(data.features.lair.items),
			hasReactions: Boolean(data.features.reaction.items.length),
			vttatokenizer: Boolean(this.constructor.Tokenizer)
		}
		data.menus = this.menuTrees;
		Object.values(this.menuTrees).forEach(m => m.update(m, data));
				
		data.themes = this.themes;
		
		return data;
	}
	get flags() {
		return this.actor.data.flags.monsterblock;
	}
	/**
	 * Constructs a FormData object using data from the sheet,
	 * this version gets data from `contenteditable` and other 
	 * custom fields rather than standard HTML form elements.
	 *
	 * @param {HTMLFormElement} form - The HTML form element being submitted
	 * @return {FormData} 
	 * @memberof MonsterBlock5e
	 * @override
	 */
	_getFormData(form) {	// Work in progress, might not use.
		//console.debug("_getFormData!");
		let formData = new FormData();
		let dtypes = {};
		
		let fields = form.querySelectorAll('[data-field-key]');
		for (let field of fields) {
			let key = field.dataset.fieldKey;
			let type = field.dataset.dtype;
			let value = field.innerText;
			
			formData.append(key, value);
			if (type) dtypes[key] = type;
		}
		
		let selects = form.querySelectorAll('[data-select-key]');
		for (let select of selects) {
			let key = select.dataset.selectKey;
			let value = select.dataset.selectedValue;

			formData.append(key, value);
		}

		let skillCycles = form.querySelectorAll('[data-skill-id]');
		for (let skill of skillCycles) {
			let key = `data.skills.${skill.dataset.skillId}.value`;
			let value = skill.dataset.skillValue;

			formData.append(key, value);
			dtypes[key] = "Number";
		}
		
		formData._dtypes = dtypes;
		return formData;
	}
	async addFeature(event) {
		let type = event.currentTarget.dataset.type == "spell" ? "spell" : "item";
		let items = [...this.actor.items].map(i => i.id);
		await this._onItemCreate(event);
		let item = [...this.actor.items].find(i => !items.includes(i.id));

		let id = item.id;
		if (type == "item") this.openItemEditor(event, id);
		else this.openSpellEditor(event, id);
	}
	prepMenus() {
		this.menuTrees = {
			attributes: this.prepAttributeMenu(),
			features: this.prepFeaturesMenu()
		};
	}
	/**
	 * @param {*} args - Array of arguments
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
	//	featMenu.add(this.createFeatureAdder({ type: "loot" }, "MOBLOKS5E.AddInventory"));

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
			}, (m, data) => {
				m.flag = Boolean(ability.proficient);
				m.icon = m.flag ? '<i class="fas fa-check"></i>' : '<i class="far fa-circle"></i>';
			}));
		});

		return menu;
	}
	prepSkillsMenu(attrMenu) {
		let menu = this.addMenu("skills", game.i18n.localize("DND5E.Skills"), attrMenu);

		Object.entries(this.actor.data.data.skills).forEach(([id, skill]) => {
			skill.abilityAbbr = game.i18n.localize(`MOBLOKS5E.Abbr${skill.ability}`);
			skill.icon = this._getProficiencyIcon(skill.value);
			skill.hover = CONFIG.DND5E.proficiencyLevels[skill.value];
			skill.label = CONFIG.DND5E.skills[id];
			menu.add(new MenuItem("skill", { id, skill }, (m, data) => {
				m.skill.icon = data.data.skills[m.id].icon
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
		this.getTraitChecklist(id, menu, `data.traits.${id}`, "damage-type", CONFIG.DND5E.damageTypes);
		return menu;
	}
	prepConditionTypeMenu(id, label, attrMenu) {
		let menu = this.addMenu(id, game.i18n.localize(label), attrMenu);
		this.getTraitChecklist(id, menu, `data.traits.${id}`, "condition-type", CONFIG.DND5E.conditionTypes);
		return menu;
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
			}, (m, data) => {
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
		}, (m, data) => {
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
		if (this.constructor.Tokenizer) {
			new this.constructor.Tokenizer({}, this.entity).render(true);
		}
	}
	
	static themes = {
		"default": { name: "MOBLOKS5E.DefaultThemeName", class: "default-theme" },
		"srd": { name: "MOBLOKS5E.SimpleThemeName", class: "srd-theme" },
		"dark": { name: "MOBLOKS5E.DarkThemeName", class: "dark-theme" },
		"cool": { name: "MOBLOKS5E.CoolThemeName", class: "cool-theme" },
		"hot": { name: "MOBLOKS5E.HotThemeName", class: "hot-theme" },
		"custom": { name: "MOBLOKS5E.CustomThemeName", class: "" }
	}
	get themes() {
		if (this._themes) return this._themes;
		
		this._themes = MonsterBlock5e.themes;
		this._themes.custom = { name: "MOBLOKS5E.CustomThemeName", class: this.actor.getFlag("monsterblock", "custom-theme-class") };
		return this._themes;
	}
	get currentTheme() {
		return this.actor.getFlag("monsterblock", "theme-choice");
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
		
		return await this.actor.setFlag("monsterblock", "theme-choice", theme);
	}
		
	async pickTheme(event) {
		let value = event.currentTarget.dataset.value;
		
		if (value == "custom") {
			await this.setCurrentTheme("default");
			const className = event.currentTarget.nextElementSibling.value;
			this.themes.custom.class = className;
			await this.actor.setFlag("monsterblock", "custom-theme-class", className);
		}
		
		this.setCurrentTheme(value);
	}
	
	_prepareItems(data) {

		// Categorize Items as Features and Spells
		const features = {
			legResist:	{ prep: this.prepFeature.bind(this), filter: this.constructor.isLegendaryResistance, label: game.i18n.localize("MOBLOKS5E.LegendaryResistance"), items: [] , dataset: {type: "feat"} },
			legendary:	{ prep: this.prepAction.bind(this), filter: this.constructor.isLegendaryAction, label: game.i18n.localize("DND5E.LegAct"), items: [] , dataset: {type: "feat"} },
			lair:		{ prep: this.prepAction.bind(this), filter: this.constructor.isLairAction, label: game.i18n.localize("MOBLOKS5E.LairActionsHeading"), items: [] , dataset: {type: "feat"} },
			multiattack:{ prep: this.prepAction.bind(this), filter: this.constructor.isMultiAttack, label: game.i18n.localize("MOBLOKS5E.Multiattack"), items: [] , dataset: {type: "feat"} },
			casting:	{ prep: this.prepCasting.bind(this), filter: this.constructor.isCasting.bind(this.constructor), label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
			reaction:	{ prep: this.prepAction.bind(this), filter: this.constructor.isReaction, label: game.i18n.localize("MOBLOKS5E.Reactions"), items: [], dataset: {type: "feat"} },
			attacks:	{ prep: this.prepAttack.bind(this), filter: item => item.type === "weapon", label: game.i18n.localize("DND5E.AttackPl"), items: [] , dataset: {type: "weapon"} },
			actions:	{ prep: this.prepAction.bind(this), filter: item => Boolean(item.data?.activation?.type), label: game.i18n.localize("DND5E.ActionPl"), items: [] , dataset: {type: "feat"} },
			features:	{ prep: this.prepFeature.bind(this), filter: item => item.type === "feat", label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
			equipment:	{ prep: ()=>{}, filter: i => true, label: game.i18n.localize("DND5E.Inventory"), items: [], dataset: {type: "loot"}}
		};

		// Start by classifying items into groups for rendering
		let [spells, other] = data.items.reduce((arr, item) => {
			if ( item.type === "spell" ) arr[0].push(item);
			else arr[1].push(item);
			return arr;
		}, [[], []]);

		// Apply item filters
		spells = this._filterItems(spells, this._filters.spellbook);
		other = this._filterItems(other, this._filters.features);

		// Organize Spellbook
		data.spellbook = this._prepareSpellbook(data, spells);
		data.innateSpellbook = this.prepareInnateSpellbook(data.spellbook); 

		// Organize Features
		for ( let item of other ) {
			let category = Object.values(features).find(cat => cat.filter(item));
			


			category.prep(item, data);
			category.items.push(item);
		}

		// Assign and return
		data.features = features;
	}
	prepSenses(senses) {
		if (senses.toLowerCase().indexOf(game.i18n.localize("MOBLOKS5E.PerceptionLocator")) > -1) return senses;

		return senses + (senses ? `${game.i18n.localize("MOBLOKS5E.Comma")} ` : "") +
			game.i18n.format("MOBLOKS5E.PassivePerception", {
				pp: this.actor.data.data.skills.prc.passive
			});
	}
	prepAbilities(data) {
		Object.entries(data.data?.abilities)?.forEach(
			([id, ability]) => ability.abbr = game.i18n.localize("MOBLOKS5E.Abbr" + id)
		)
	}
	prepResources(data, item) {
		data.hasresource = this.constructor.hasResource(item.data);
		data.resourcelimit = data.hasresource ? this.getResourceLimit(item) : 0;
		data.resourcerefresh = data.hasresource ? this.getResourceRefresh(item) : "";
	}
	prepAction(actionData) {
		let action = this.object.items.get(actionData._id);
			
		this.prepResources(actionData, action);
		
		actionData.is = { 
			multiAttaack: this.constructor.isMultiAttack(action.data),
			legendary: this.constructor.isLegendaryAction(action.data),
			lair: this.constructor.isLairAction(action.data),
			legResist: this.constructor.isLegendaryResistance(action.data),
			reaction: this.constructor.isReaction(action.data)
		};
		actionData.is.specialAction = Object.values(actionData.is).some(v => v == true);	// Used to ensure that actions that need seperated out aren't shown twice
	}
	prepFeature(featureData) {
		let feature = this.object.items.get(featureData._id);

		this.prepResources(featureData, feature)
	}
	prepAttack(attackData) {
		let attack = this.object.items.get(attackData._id);
		
		this.prepResources(attackData, attack);

		attackData.tohit = this.getAttackBonus(attack);
		
		attackData.description = this.getAttackDescription(attack);
	}
	castingTypes = {
		standard: Symbol("Standard Spellcasting"),
		innate: Symbol("Innate Spellcasting"),
		pact: Symbol("Pact Macgic")
	}
	/**
	 * Prepares the data for a spellcasting feature
	 *
	 * @param {Object} featureData
	 * @param {Object} data
	 * @memberof MonsterBlock5e
	 */
	prepCasting(featureData, data) {
		this.prepFeature(featureData);
		let cts = this.castingTypes;

		featureData.castingType = this.constructor.isSpellcasting(featureData) ?
			(this.constructor.isPactMagic(featureData) ? cts.pact : cts.standard) : cts.innate;
		featureData.hasAtWill = this.hasAtWillSpells();
		
		let ct = featureData.castingType;
		
		featureData.spellbook = this.reformatSpellbook(ct, cts, data);
		

		let [abilityTitle, castingAbility] = this.getCastingAbility(featureData.spellbook, ct, data);
		let tohit = this.getSpellAttackBonus(castingAbility);
		
		featureData.description = this.getCastingFeatureDescription(ct, cts, abilityTitle, tohit, featureData, data)

		
		console.debug(featureData);
	}
	/**
	 * Retuns the formatted spellbook data for the associated casting feature
	 *
	 * @param {Symbol} ct - The type of casting feature
	 * @param {Object} cts - The set of casting feature types
	 * @param {Object} data - The Handlebars data object
	 * @return {Object} The spellbook object
	 * @memberof MonsterBlock5e
	 */
	reformatSpellbook(ct, cts, data) {
		return ct == cts.innate ?
			this.filterInnateSpellbook(data) :
			this.filterSpellbook(data, ct, cts);
	}

	/**
	 * Filters and adds additional data for displaying the spellbook
	 *
	 * @param {Object} data - The Handlebars data object
	 * @param {Symbol} ct - The type of casting feature
	 * @param {Object} cts - The set of casting feature types
	 * @return {Object} The spellbook object
	 * @memberof MonsterBlock5e
	 */
	filterSpellbook(data, ct, cts) {
		return data.spellbook.filter(page => {
			if ((ct == cts.pact && !(page.order == 0.5 || page.order == 0)) || page.order == -20)
				return false;

			page.maxSpellLevel = page.spells.reduce(
				(max, spell) => spell.data.level > max ? spell.data.level : max,
				1);

			if (page.order == 0) {
				page.label = game.i18n.localize("MOBLOKS5E.Cantrips");
				page.slotLabel = game.i18n.localize("MOBLOKS5E.AtWill");
			}
			else {
				page.label = game.i18n.format("MOBLOCKS5E.SpellLevel", {
					level: ct == cts.pact ?
						`${this.constructor.formatOrdinal(1)}-${this.constructor.formatOrdinal(page.maxSpellLevel)}` :
						this.constructor.formatOrdinal(page.maxSpellLevel)
				});
				page.slotLabel = game.i18n.format(ct == cts.pact ?
					"MOBLOCKS5E.SpellPactSlots" : "MOBLOCKS5E.SpellSlots", {
					slots: page.slots,
					level: this.constructor.formatOrdinal(page.maxSpellLevel)
				});
			}
			return true;
		});
	}

	/**
	 * Filters and adds additional data for displaying the spellbook
	 *
	 * @param {Object} data - The Handlebars data object
	 * @return {Object} The spellbook object
	 * @memberof MonsterBlock5e
	 */
	filterInnateSpellbook(data) {
		return data.innateSpellbook.filter(page => {
			page.label = page.uses ? game.i18n.format("MOBLOCKS5E.SpellCost", {
				cost: page.label
			}) : page.label;
			page.slotLabel = false;
			return true;
		});
	}

	/**
	 * Compiles the data needed to display the text description of a spellcasting feature
	 * including appropriate transaltion.
	 *
	 * @param {Symbol} ct - The type of casting feature
	 * @param {Object} cts - The set of casting feature types
	 * @param {string} abilityTitle - The name of the casting ability for this feature
	 * @param {number} tohit - The spell-attack bonus for this casting ability
	 * @param {Object} featureData - The data object for this feature
	 * @param {Object} data - The Handlebars data object
	 * @return {Object} An object containing translated and filled sections of the casting feature description
	 * @memberof MonsterBlock5e
	 */
	getCastingFeatureDescription(ct, cts, abilityTitle, tohit, featureData, data) {
		const casterLevel = this.actor.data.data?.details?.spellLevel ?? 0;
		const suffix = this.constructor.getOrdinalSuffix(casterLevel);
		return {
			level: ct == cts.innate ? "" : game.i18n.format("MOBLOKS5E.CasterNameLevel", {
				name: this.actor.name,
				level: `<span class="caster-level"
							contenteditable="${this.flags.editing}"
							data-field-key="data.details.spellLevel"
							data-dtype="Number"
							placeholder="0"
							>${casterLevel}</span>${suffix}`
			}),
			ability: game.i18n.format(
				ct == cts.innate ? "MOBLOKS5E.InnateCastingAbility" : "MOBLOKS5E.CastingAbility", {
				name: this.actor.name,
				ability: abilityTitle
			}
			),
			stats: game.i18n.format("MOBLOKS5E.CastingStats", {
				savedc: this.actor.data.data?.attributes?.spelldc,
				bonus: `${tohit > -1 ? "+" : ""}${tohit}`
			}),
			warlockRecharge: ct == cts.pact ? game.i18n.localize("MOBLOKS5E.WarlockSlotRegain") : "",
			spellintro: game.i18n.format({
				[cts.standard]: "MOBLOKS5E.CasterSpellsPreped",
				[cts.pact]: "MOBLOKS5E.WarlockSpellsPreped",
				[cts.innate]: "MOBLOKS5E.InnateSpellsKnown"
			}[ct], {
				name: this.actor.name,
				atwill: featureData.hasAtWill ? game.i18n.format("MOBLOKS5E.CasterAtWill", {
					spells: data.spellbook.find(l => l.prop === "atwill")?.spells?.reduce((list, spell, i, a) => {
						return `${list}
							<li class="spell at-will-spell" data-item-id="${spell._id}">
								${this.flags["show-delete"] && this.flags["editing"] ?
								`<a class="delete-item" data-item-id="${spell._id}">
									<i class="fa fa-trash"></i>
								</a>` : ""}
								<span class="spell-name">${spell.name}</span></li>`;
					}, `<ul class="at-will-spells">`) + "</ul>"
				}) : ""
			})
		};
	}

	getSpellAttackBonus(attr) {
		let data = this.actor.data.data;
		let abilityBonus = data.abilities[attr]?.mod;
		let profBonus = data.attributes?.prof;
		
		return abilityBonus + profBonus;
	}
	getCastingAbility(spellbook, type, data) {
		let main = this.actor.data.data?.attributes?.spellcasting || "int";
		let castingability = main;
		
		let types = {
			"will": (l) => l.order == -20,
			[this.castingTypes.innate]: (l) => l.order == -10,
			[this.castingTypes.pact]: (l) => l.order == 0.5,
			"cantrip": (l) => l.order == 0,
			[this.castingTypes.standard]: (l) => l.order > 0.5
		}
		let spelllevel = spellbook.find(types[type])
		if (spelllevel !== undefined) {
			let spell = spelllevel.spells.find((s) => 
				s.data.ability && 
				s.data.ability != main
			);
			castingability = spell?.data?.ability ?? main;
		}
		return [data.actor.data?.abilities[castingability]?.label ?? game.i18n.localize("DND5E.AbilityInt"), castingability];
	}
	getAttackDescription(attack) {
		let atkd = attack.data.data;
		let tohit = this.getAttackBonus(attack);
		
		return {
			attackType: this.getAttackType(attack),
			tohit: game.i18n.format("MOBLOKS5E.AttackToHit", {
				bonus: `${tohit > -1 ? "+" : ""}${tohit}`,
			}),
			range: game.i18n.format("MOBLOKS5E.AttackRange", {
				reachRange: game.i18n.localize(this.isRangedAttack(attack) ? "MOBLOKS5E.range" : "MOBLOKS5E.reach"),
				range: atkd.range.value,
				sep: atkd.range.long ? "/" : "",
				max: atkd.range.long ? atkd.range.long : "",
				units: atkd.range.units
			}),
			target: game.i18n.format("MOBLOKS5E.AttackTarget", {
				quantity: this.getNumberString(atkd.target.value ? atkd.target.value : 1),
				type:	atkd.target.type ? 
						atkd.target.type : (
							atkd.target.value > 1 ?
							game.i18n.localize("MOBLOKS5E.targetS") :
							game.i18n.localize("MOBLOKS5E.target")
						),	
			}),
			damageFormula: this.damageFormula(attack),
			damage: this.dealsDamage(attack) ? game.i18n.format("MOBLOKS5E.AttackDamageTemplate",  {
				average: this.averageDamage(attack),
				formula: this.damageFormula(attack),
				type: game.i18n.localize(
					"DND5E.Damage" + atkd.damage.parts[0][1].replace(/./, l => l.toUpperCase())
				).toLowerCase()
			}) : false
		}
	}
	getAttackType(attack) {
		return "DND5E.Action" + attack?.data?.data?.actionType?.toUpperCase();
	}
	getAttackBonus(attack) {
		let attr = attack.abilityMod;									// The ability the item says it uses
		let attackBonus = attack.data.data?.attackBonus;				// Magical item or other bonus
		let abilityBonus = this.actor.data.data.abilities[attr]?.mod;	// The ability bonus of the actor
		let isProf = attack.data.data.proficient;						// Is the actor proficient with this item?
		let profBonus = this.actor.data.data.attributes?.prof;			// The actor's proficiency bonus
		
		return abilityBonus + (isProf ? profBonus : 0) + attackBonus;
	}
	isRangedAttack(attack) {
		return ["rwak", "rsak"].includes(attack.data.data?.actionType);
	}
	averageDamage(attack) {
		let formula = 	attack.data.data?.damage?.parts?.length > 0 ? 
						attack.data.data?.damage?.parts[0][0] :
						"0";	
		let attr = attack.abilityMod;
		let abilityBonus = this.actor.data.data?.abilities[attr]?.mod;
		return this.constructor.averageRoll(formula, {mod: abilityBonus});
	}
	damageFormula(attack) {	// Extract and re-format the damage formula
		let formula = 	attack.data.data?.damage?.parts?.length > 0 ? 
						attack.data.data?.damage?.parts[0][0] :
						"0";												// This is the existing formula, typicallys contains a non-number like @mod
		let attr = attack.abilityMod;										// The ability used for this attack
		let abilityBonus = this.actor.data.data?.abilities[attr]?.mod;		// The ability bonus of the actor
		let roll;
		try { roll = new Roll(formula, {mod: abilityBonus}).roll();	}	// Create a new Roll, giving the ability modifier to sub in for @mod
		catch (e) {
			console.error(e);
			ui.notifications.error(e);
			let roll = new Roll("0").roll();
		}
		let parts = [];
		let bonus = 0;
		let op = "+";
		
		for (let part of roll.parts) {	// Now the formula from Roll is broken down, and re-constructed to combine all the constants.
			if (typeof part == "object") parts.push(part.formula);
			else if (part === "+" || part === "-") op = part;
			else if (parseInt(part, 10) === NaN) console.error("Unexpected part in damage roll");
			else {
				let n = parseInt(part, 10);
				bonus = op === "+" ? bonus + n : bonus - n;
			}
		}
		if (bonus > 0) parts.push("+");
		if (bonus < 0) parts.push("-");
		if (bonus != 0) parts.push(bonus);
		
		return parts.join(" ");
		
	}
	dealsDamage(item) {
		return Boolean(item.data.data?.damage?.parts?.length);
	}
	getNumberString(number) {
		number = Number(number);
		if (number > 9 || number < 0) return number.toString();
		return game.i18n.localize("MOBLOKS5E."+["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][number]);
	}
	getMultiattack(data) { // The Multiattack action is always first in the list, so we need to find it and seperate it out.
		for (let item of data.items) {
			if (this.constructor.isMultiAttack(item)) return item;
		}
		return false;
	}
	getLegendaryResistance(data) {
		for (let item of data.items) {
			if (this.constructor.isLegendaryResistance(item)) return item;
		}
		return false;
	}
	getResourceLimit(item) {
		let res = item.data.data.consume.target.match(/(.+)\.(.+)\.(.+)/);
		return res ? this.actor.data?.data[res[1]][res[2]]?.max : item.data.data?.uses?.max;
	}
	// Is this information actually defined somewhere?
	getResourceRefresh(item) {
		// It just says "Day" becaause thats typically the deal, and I don't see any other option
		return game.i18n.localize("MOBLOKS5E.ResourceRefresh");
	}
	prepareInnateSpellbook(spellbook) { // We need to completely re-organize the spellbook for an innate spellcaster
		let innateSpellbook = [];

		for (let level of spellbook) {								// Spellbook is seperated into sections based on level, though all the innate spells are lumped together, we still want to check all the sections.
			if (level.prop !== "innate") continue;					// We don't care about sections that aren't marked as innate though
			for (let spell of level.spells) {						// Check all the spells
				let uses = spell.data.uses.max;						// The max uses are the only thing actually displayed, though the data tracks usage
																	// Max uses is what we are going to end up sorting the spellbook by.
				let finder = e => e.uses == uses;					// The conditional expression for later. We are going to check if our new spellbook has a section for this spells usage amount.
				
				if (!innateSpellbook.some(finder)) {				// Array.some() is used to check the whole array to see if the condition is ever satisfied.
					innateSpellbook.push({							// If there isn't a section to put this spell into, we create a new one.
						canCreate: false,							// Most of this is just intended to match the data in the regular spell book, though most isn't ultimately going to be used.
						canPrepare: false,
						dataset: { level: -10, type: "spell" },
						label: uses < 1 ? "At will" : (uses + "/day"),	// This is important, as this string will be used to display on the sheet.
						order: -10,
						override: 0,
						prop: "innate",
						slots: "-",
						spells: [],									// An empty array to put spells in later.
						uses: uses,									// How we will identify this type of spell later, rather than by spell level.
						usesSlots: false
					});
				}
				
				innateSpellbook.find(finder).spells.push(spell);	// We can use the same condition as above, this time to lacate the item that satisfies the condition. We then insert the current spell into that section.
			}
		}
		innateSpellbook.sort((a, b) => {	// This sorts the spellbook sections, so that the first section is the "0" useage one, which is actually infinite uses - At will, and Cantrips.
			if (a.uses == 0 && b.uses == 0) return 0;
			if (a.uses == 0) return -1;
			if (b.uses == 0) return 1;
			
			return a.uses < b.uses ? 1 : -1;
		});
		
		return innateSpellbook;
	}
	async switchToDefault(event) {
		const config = CONFIG[this.object.entity];
		const type = this.object.data.type;
		const classes = Object.values(config.sheetClasses[type]);
		const defcls = classes.find(c => c.default);
		
		await this.close();
		await this.actor.setFlag("core", "sheetClass", defcls);
		
		return this.actor.sheet.render(true)
	}
	defaultFlags = {
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
		"show-delete": false
	}
	async prepFlags() {
		if (!this.actor.getFlag("monsterblock", "initialized")) {
			await this.actor.update({
				"flags": { "monsterblock": this.defaultFlags }
			}, {});
			return true;
		}
		
		// Verify that there are no missing flags, which could cause an error.
		let changes = false;
		for (let flag in this.defaultFlags) {
			if (this.actor.getFlag("monsterblock", flag) !== undefined) continue;
			
			changes = true;
			await this.actor.setFlag("monsterblock", flag, this.defaultFlags[flag]);
		}
		
		return changes;
	}
	static async getBetterRolls() {
		if (game.data.modules.find(m => m.id == "betterrolls5e")?.active) {
			let { CustomItemRoll, CustomRoll } = await import("../betterrolls5e/scripts/custom-roll.js");
			Object.assign(this, { CustomItemRoll, CustomRoll });
		}
		else {
			this.CustomItemRoll = false;
			this.CustomRoll = false;
		}
	}
	static async getTokenizer() {
		if (game.data.modules.find(m => m.id == "vtta-tokenizer")?.active) {
			let Tokenizer = (await import("../vtta-tokenizer/src/tokenizer/index.js")).default;
			Object.assign(this, { Tokenizer });
		}
		else {
			this.Tokenizer = false;
		}
	}
	async activateListeners(html) {	// We need listeners to provide interaction.
	//	this.menuStates = this.menuStates ?? {};
		
		html.find('.switch').click((event) => {							// Switches are the primary way that settings are applied per-actor.
			event.preventDefault();
			let control = event.currentTarget.dataset.control;			// A data attribute is used on an element with the class .switch, and it contains the name of the switch to toggle.
			
			let state = !this.actor.getFlag("monsterblock", control);	
			console.debug(`Monster Block | %cSwitching: ${control} to: ${state}`, "color: orange")
			
			this.actor.setFlag(											
				"monsterblock", 
				control, 
				!this.actor.getFlag("monsterblock", control)			// Get the current setting of this flag, and reverse it.
			);
		});
		html.find('.trigger').click((event) => {							
			event.preventDefault();
			let control = event.currentTarget.dataset.control;
			
			this[control](event);
		});
		html.find('.custom-class-input').keydown((event) => {							
			if (event.key !== "Enter") return;
			event.preventDefault();
			let target = event.currentTarget;
			let anchor = target.previousElementSibling;
			event.currentTarget = anchor;
			
			this.pickTheme(event);
		});
		html.find('.profile-image').click((event) => {
			event.preventDefault();

			new ImagePopout(this.actor.data.img, {
				title: this.actor.name,
				shareable: true,
				uuid: this.actor.uuid
			}).render(true);
		});
		
		html.find('[data-roll-formula]').click((event) => {			// Universal way to add an element that provides a roll, just add the data attribute "data-roll-formula" with a formula in it, and this applies.
			event.preventDefault();									// This handler makes "quick rolls" possible, it just takes some data stored on the HTML element, and rolls dice directly.
			let formula = event.currentTarget.dataset.rollFormula;
			let flavor = event.currentTarget.dataset.rollFlavor;	// Optionally, you can include data-roll-flavor to add text to the message.
			let target = event.currentTarget.dataset.rollTarget;
			let success = event.currentTarget.dataset.rollSuccess;
			let failure = event.currentTarget.dataset.rollFailure;
			
			let roll;
			try { roll = new Roll(formula).roll(); }
			catch (e) {
				console.error(e);
				ui.notifications.error(e);
				let roll = new Roll("0").roll();
			}
			
			if (target) {
				let s = roll._total >= parseInt(target, 10);
				
				flavor += `<span style="font-weight: bold; color: ${s ? "green" : "red"};">${s ? success : failure}</span>`;
			}
			
			roll.toMessage({					// Creates a new Roll, rolls it, and sends the result as a message
				flavor: flavor,										// Including the text as defined
				speaker: ChatMessage.getSpeaker({actor: this.actor})// And setting the speaker to the actor this sheet represents
			});
		});
		
		// Special Roll Handlers
		html.find('.ability').click((event) => {
			event.preventDefault();
			let ability = event.currentTarget.dataset.ability;
			
			if (MonsterBlock5e.CustomRoll) MonsterBlock5e.CustomRoll.fullRollAttribute(this.actor, ability, "check", MonsterBlock5e.CustomRoll.eventToAdvantage(event));
			else this.actor.rollAbilityTest(ability, {event: event});
		});
		html.find('.saving-throw').click((event) => {
			event.preventDefault();
			let ability = event.currentTarget.dataset.ability;
			
			if (MonsterBlock5e.CustomRoll) MonsterBlock5e.CustomRoll.fullRollAttribute(this.actor, ability, "save", MonsterBlock5e.CustomRoll.eventToAdvantage(event));
			else this.actor.rollAbilitySave(ability, {event: event});
		});
		html.find('.skill').click((event) => {
			event.preventDefault();
			let skill = event.currentTarget.dataset.skill;
			if (MonsterBlock5e.CustomRoll) MonsterBlock5e.CustomRoll.fullRollSkill(this.actor, skill, MonsterBlock5e.CustomRoll.eventToAdvantage(event));
			else this.actor.rollSkill(skill, {event: event});
		});
		
		// Item and spell "roll" handlers. Really just pops their chat card into chat, allowing for rolling from there.
		html.find('.item-name').click((event) => {
			event.preventDefault();
			let id = event.currentTarget.dataset.itemId;
			const item = this.actor.getOwnedItem(id);
			if (MonsterBlock5e.CustomRoll) MonsterBlock5e.CustomRoll.newItemRoll(item, mergeObject(MonsterBlock5e.CustomRoll.eventToAdvantage(event), {preset:0})).toMessage();
			else return item.roll(); // Conveniently, items have all this logic built in already.
		});
		html.find('.spell').click((event) => {
			event.preventDefault();
			let id = event.currentTarget.dataset.itemId;
			const item = this.actor.getOwnedItem(id);
			if (MonsterBlock5e.CustomRoll && !event.shiftKey) MonsterBlock5e.CustomRoll.newItemRoll(item, mergeObject(MonsterBlock5e.CustomRoll.eventToAdvantage(event), {preset:0})).toMessage();
			else return this.actor.useSpell(item, {configureDialog: !event.shiftKey}); // Spells are used through the actor, to track slots.
		});
		
		// Item editing handlers. Allows right clicking on the description of any item (features, action, etc.) to open its own sheet to edit.
		html.find('.item').contextmenu(this.openItemEditor.bind(this));
		html.find('.spell').contextmenu(this.openSpellEditor.bind(this));
		
		html.find('.big-red-button').click((event) => {
			event.preventDefault();
			//this._onSubmit(event);
			new ActorSheet5eNPC(this.object).render(true);
			this._element.removeClass("monsterblock");
			this._element.addClass("dnd5e");
			this._element.addClass("npc");
		});
					
		html.find('.hasinput').click((event) => {
			event.currentTarget.classList.add("hidden");
			event.currentTarget.nextElementSibling.classList.remove("hidden");
			event.currentTarget.nextElementSibling.select();
		});
		html.find('.hiddeninput').blur((event) => {
			event.currentTarget.classList.add("hidden");
			event.currentTarget.previousElementSibling.classList.remove("hidden");
		});
		
		html.find('.select-field').click((event) => {
			let control = event.currentTarget;
			let selection = event.target;
			let value = selection.dataset.selectionValue;
			if (!value) return false;
			let label = control.querySelector(".select-label");

			label.innerText = CONFIG.DND5E.actorSizes[value];
			control.dataset.selectedValue = value;

			this._onChangeInput(event);
		});
		html.find('[contenteditable=true]').click((event) => {
			event.stopPropagation();
		})
		html.find('[contenteditable=true]').keydown((event) => {
			let el = event.currentTarget;

			switch (event.key) {
				case "Enter": this._onChangeInput(event); break;
				default: console.debug(event.key);
			}
			//if (el.innerText == "") el.innerText = "-";
		});

		html.find('[data-save-toggle], [data-damage-type], [data-condition-type], [data-language-opt]').click((event) => {
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
		html.find('.custom-trait input').blur(this.onCustomTraitChange.bind(this));
		html.find('.custom-trait input').keydown((event) => {
			if (event.key == "Enter") this.onCustomTraitChange(event);
		});
		html.find('[contenteditable=true]').focusout(this._onChangeInput.bind(this));
		html.find('.trait-selector').contextmenu(this._onTraitSelector.bind(this));
		html.find('.trait-selector-add').click(this._onTraitSelector.bind(this));
		html.find('[data-skill-id]').contextmenu(this._onCycleSkillProficiency.bind(this));
		html.find('[data-skill-id]').click(this._onCycleSkillProficiency.bind(this));

		this.menus.forEach(m => m.attachHandler());

		html.find('.menu').click(e => e.stopPropagation());
		html.click((event) => {
			Object.values(this.menuTrees).forEach(m => m.close());
		});

		html.find('.delete-item').click((event) => {
			event.preventDefault();
			event.stopPropagation();
			const el = event.currentTarget;
			this.actor.deleteOwnedItem(el.dataset.itemId);
		});

		this._dragDrop.forEach(d => d.bind(html[0]));
	}
	openItemEditor(event, d) {
		event.preventDefault();
		event.stopPropagation();
		let id = d ?? event.currentTarget.querySelector('.item-name').dataset.itemId;
		const item = this.actor.getOwnedItem(id);
		item.sheet.render(true);
	}

	openSpellEditor(event, d) {
		event.preventDefault();
		event.stopPropagation();
		let id = d ?? event.currentTarget.dataset.itemId;
		const item = this.actor.getOwnedItem(id);
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
				let state = (dt.dataset.flag == 'true');
				if (state) value.push(dt.dataset.option);
			}
			data[key] = value;
		});

		const traitReducer = (acc, n) => {
			if (n.dataset.flag == 'true') acc.push(n.dataset.option);
			return acc; 
		}
		data["data.traits.languages.value"] =
		[...html.find(`[data-language-opt]`)].reduce(traitReducer, []);

		data["data.traits.ci.value"] =
		[...html.find(`[data-condition-type]`)].reduce(traitReducer, []);

		return data;
	}
	_onChangeInput(event) {
		const input = event.currentTarget;
		const value = input.innerText;

		if (input.dataset.dtype == "Number") {
			if (["+", "-"].includes(value[0])) {
				let delta = parseFloat(value);
				input.innerText = getProperty(this.actor.data, input.dataset.fieldKey) + delta;
			} 
			else if (value[0] === "=") {
				input.innerText = value.slice(1);
			}
		}
		else if(input.dataset.dtype == "Roll") {
			try { new Roll(value).roll(); }
			catch (e) {
				console.error(e);
				ui.notifications.error(e);
				input.innerText = getProperty(this.actor.data, input.dataset.fieldKey);
			}
		}

		super._onChangeInput(event);
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
	static isMultiAttack(item) {	// Checks if the item is the multiattack action.
		let name = item.name.toLowerCase().replace(/\s+/g, '');	// Convert the name of the item to all lower case, and remove whitespace.
		return game.i18n.localize("MOBLOKS5E.MultiattackLocators").includes(name); // Array.includes() checks if any item in the array matches the value given. This will determin if the name of the item is one of the options in the array.
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
	static isSpellcasting(item) {
		let name = item.name.toLowerCase().replace(/\s+/g, '');
		return game.i18n.localize("MOBLOKS5E.SpellcastingLocators").includes(name);
	}
	static isInnateSpellcasting(item) {
		let name = item.name.toLowerCase().replace(/\s+/g, '');
		return game.i18n.localize("MOBLOKS5E.InnateCastingLocators").includes(name);
	}
	static isPactMagic(item) {
		let desc = item.data.description?.value?.toLowerCase().replace(/\s+/g, '');
		return game.i18n.localize("MOBLOKS5E.WarlockLocators").some(
			s => desc.indexOf(s) > -1
		);
	}
	static isCasting(item) {
		return this.isSpellcasting(item) || this.isInnateSpellcasting(item);
	}
	static getItemAbility(item, actor, master) {
		return master.object.items.get(item._id).abilityMod;
	}
	static hasResource(item) {
		return Boolean(item.data.consume?.target);
	}
	static getOrdinalSuffix(number) {
		let suffixes = game.i18n.localize("MOBLOKS5E.OrdinalSuffixes");
		if (number < 1 || suffixes.length < 1) return number.toString();
		if (number <= suffixes.length) return suffixes[number - 1];
		else return suffixes[suffixes.length - 1];
	}
	static formatOrdinal(number) {
		return number + this.getOrdinalSuffix(number);		
	}
	static formatNumberCommas(number) {
		return number.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");	// https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
	}
	static averageRoll(formula, mods) {
		if (!formula) return 0;
		let roll;
		try { roll = new Roll(formula, mods).roll(); }
		catch (e) {
			console.error(e);
			ui.notifications.error(e);
			return 0;
		}
		return Math.floor((		// The maximum roll plus the minimum roll, divided by two, rounded down.
			Roll.maximize(roll.formula)._total +
			Roll.minimize(roll.formula)._total
		) / 2);
	}
	static handlebarsHelpers = {
		"moblok-hascontents": (obj) => { // Check if an array is empty.
			return Object.keys(obj).length > 0;
		},
		"moblok-enrichhtml": (str) => { // Formats any text to include proper inline rolls and links.
			return TextEditor.enrichHTML(str, {secrets: true});
		}
	};
}
/**
 * A base class for items that might be in a menu
 * 
 * @class MenuItem
 */
class MenuItem {
	/**
	 * Creates an instance of MenuItem.
	 *
	 * @param {String} type - The type of item
	 * @param {Object} [data={}] - An object of data maintained by the menu item.
	 * @param {function} updateFn  - A function used to update any data that might need changed on render
	 * @memberof MenuItem
	 */
	constructor(type, data = {}, updateFn) {
		this.type = type;
		Object.assign(this, data);

		this.update = updateFn ?? (a => false);
	}
}
/**
 * A class to handle interactve menus
 *
 * @class MenuTree
 * @extends {MenuItem}
 */
class MenuTree extends MenuItem {
	/**
	 * Creates an instance of MenuTree.
	 * @param {MonsterBlock5e} monsterblock - The object representing the sheet itseld
	 * @param {string} id - A unique identifier for this menu
	 * @param {string} label - The text of the label, doubles as the button for open/close clicks
	 * @param {MenuTree|false} parent - A reference to the parent menu, or false if this menu is the root
	 * @param {function} updateFn - A function used to update any data that might need changed on render
	 * @param {Boolean} visible - Set the initial state of visible or not
	 * @param {jQuery} element - Set the jQuery object for the HTML element associated with this menu
	 * @param {MenuItem[]} children - An array of items in this menu
	 * @memberof MenuTree
	 */
	constructor(monsterblock, id, label, parent, updateFn, auxSelect, auxClass, visible, element, children) {
		let fn = updateFn ?? (a => false);
		super(parent ? "sub-menu" : "root-menu", {}, (m, ...args) => {
			fn(m, ...args);
			this.children.forEach(c => c.update(c, ...args));
		});

		this.auxSelect = auxSelect ?? false;
		this.auxClass = auxClass ?? "";
		this.id = id;
		this.monsterblock = monsterblock;
		this.parent = parent ?? false;
		this.label = label;
		this.visible = visible ?? false;
		this._element = element ?? false;
		this.children = children ?? [];
	}
	get element() {
		return this.button.parent();
	}
	get button() {
		return this.monsterblock._element.find(`[data-menu-id=${this.id}]`);
	}
	get auxElement() {
		if (!this.auxSelect) return false;
		return this.monsterblock._element.find(this.auxSelect);
	}
	attachHandler() {
		this.button.click((event) => {
			if (!this.visible) this.open();
			else this.close();
		});
	}
	open() {
		if (this.visible) return;
		if (this.parent) this.parent.closeChildren();
		this.element.addClass("menu-open");
		if (this.auxElement) this.auxElement.addClass(this.auxClass);
		this.visible = true;
	}
	close() {
		if (!this.visible) return;
		this.element.removeClass("menu-open");
		if (this.auxElement) this.auxElement.removeClass(this.auxClass);
		this.visible = false;
		this.closeChildren();
	}
	closeChildren() {
		this.children.forEach(m => { if (m.type == "sub-menu") m.close() });
	}
	add(item) {
		this.children.push(item);
	}
}

Hooks.once("init", () => {
	Handlebars.registerHelper(MonsterBlock5e.handlebarsHelpers); // Register all the helpers needed for Handlebars
	
	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.once('ready', () => {
	MonsterBlock5e.getBetterRolls();
	MonsterBlock5e.getTokenizer();
	
	game.settings.register("monsterblock", "attack-descriptions", {
		name: game.i18n.localize("MOBLOKS5E.attack-description-name"),
		hint: game.i18n.localize("MOBLOKS5E.attack-description-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "casting-feature", {
		name: game.i18n.localize("MOBLOKS5E.casting-feature-name"),
		hint: game.i18n.localize("MOBLOKS5E.casting-feature-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "inline-secrets", {
		name: game.i18n.localize("MOBLOKS5E.inline-secrets-name"),
		hint: game.i18n.localize("MOBLOKS5E.inline-secrets-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "hidden-secrets", {
		name: game.i18n.localize("MOBLOKS5E.hidden-secrets-name"),
		hint: game.i18n.localize("MOBLOKS5E.hidden-secrets-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "hide-profile-image", {
		name: game.i18n.localize("MOBLOKS5E.hide-profile-image-name"),
		hint: game.i18n.localize("MOBLOKS5E.hide-profile-image-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "show-lair-actions", {
		name: game.i18n.localize("MOBLOKS5E.show-lair-actions-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-lair-actions-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "current-hit-points", {
		name: game.i18n.localize("MOBLOKS5E.current-hit-points-name"),
		hint: game.i18n.localize("MOBLOKS5E.current-hit-points-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "maximum-hit-points", {
		name: game.i18n.localize("MOBLOKS5E.maximum-hit-points-name"),
		hint: game.i18n.localize("MOBLOKS5E.maximum-hit-points-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "editing", {
		name: game.i18n.localize("MOBLOKS5E.editing-name"),
		hint: game.i18n.localize("MOBLOKS5E.editing-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "show-not-prof", {
		name: game.i18n.localize("MOBLOKS5E.show-not-prof-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-not-prof-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "max-height-offset", {
		name: game.i18n.localize("MOBLOKS5E.max-height-offset-name"),
		hint: game.i18n.localize("MOBLOKS5E.max-height-offset-hint"),
		scope: "world",
		config: true,
		type: Number,
		range: {
			min: 0,
			max: 670,
			step: 1
		},
		default: 72
	});
	
	let themeChoices = {};
	for (let theme in MonsterBlock5e.themes) themeChoices[theme] = game.i18n.localize(MonsterBlock5e.themes[theme].name);
	game.settings.register("monsterblock", "default-theme", {
		name: game.i18n.localize("MOBLOKS5E.default-theme-name"),
		hint: game.i18n.localize("MOBLOKS5E.default-theme-hint"),
		scope: "world",
		config: true,
		type: String,
		choices: themeChoices,
		default: "default"
	});
	game.settings.register("monsterblock", "custom-theme-class", {
		name: game.i18n.localize("MOBLOKS5E.custom-theme-class-name"),
		hint: game.i18n.localize("MOBLOKS5E.custom-theme-class-hint"),
		scope: "world",
		config: true,
		type: String,
		default: ""
	});
});

Hooks.on("renderActorSheet", () => {	// This is just for debugging, it prevents this sheet's template from being cached.
	let template = "modules/monsterblock/actor-sheet.html";
    delete _templateCache[template];
    console.debug(`Monster Block | removed "${template}" from _templateCache.`);
})

/**
 * A class to handle the sizing of a popup box like a character sheet.
 *
 * @class PopupHandler
 */
class PopupHandler {
	/**
	 * Creates an instance of PopupHandler.
	 * @param {Application} application - A reference to an application such as a character sheet
	 * @param {string} layoutselector - A CSS style selector that selects the main container for the layout
	 * @param {number} defaultWidth - The starting width of the popup
	 * @param {number} defaultHeight - The starting height of the popup
	 * @param {number} padding - The padding around the popup content
	 * @memberof PopupHandler
	 */
	constructor(application, layoutselector, defaultWidth, defaultHeight, padding) {
		this.application = application;
		this.padding = padding;
		this.element = application.element;
		this._height = defaultHeight;
		this._width = defaultWidth;
		
		this.width = this._width;	// Actually set the width and height to the default values,
		this.height = this._height;	// allowing the column layout to correctly set the number of columns needed.
		
		let flexcol = this.element.find(layoutselector)[0];
		this.layout = Array.from(	// Converting to an array because it has so many useful methods.
			flexcol.children		// All children of the column layout, which is the form.flexcol
		);
	}
	
	// These set both the real height of the element (adding the "px" unit because it's a CSS property) and the stored numeric value
	set height(h) {
		this._height = h;
		this.element.css("height", h + "px");
		this.position.height = h;
	}
	set width(w) {
		this._width = w;
		this.element.css("width", w + "px");
		this.position.width = w;
	}
	
	get height() { return this._height; }
	get width() { return this._width; }
	get position() { return this.application.position; }
	

	/**
	 * Returns the largest offset from the left side of the layout 
	 * that any element's right edge has (this is the maximum width of the layout).
	 * 
	 * @readonly
	 * @memberof PopupHandler
	 */
	get layoutWidth() {											
		return this.layout.reduce((width, el) => {						// Iterate over all the children of the layout, searching for the one with a right edge furthest from 0
			let right = el.offsetLeft + el.getBoundingClientRect().width;	// The left edge offset of the element, plus the width, is the right edge offset
			return right > width ? right : width;							// If this element has a right side further from 0 than the previous record, its offset is the new record.
		}, 391);
	}
	/**
	 * Returns the greatest offset from the top of the layout
	 * of any element's bottom (this is the maximum height of the layout).
	 *
	 * @readonly
	 * @memberof PopupHandler
	 */
	get layoutHeight() {													
		let top = this.element[0].getBoundingClientRect().top;			// Find the offset of the top of the bounding element from the top of the displayport
		return this.layout.reduce((height, el) => {					// Iterate over all the children, looking for the one with the lowest bottom
			let bottom = el.getBoundingClientRect().bottom - top;	// The bottom of the bounding rectangle is the *real* lowest point of the rendered element, even if the element is split between multiple columns. This is relative to the displayport though, so it needs corrected by the offest of the wrapper's top.
			return bottom > height ? bottom : height;				// If this element's bottom is lower than the record, the record is updated.
		}, 46);
	}
	
	fix() {
		this.fixWidth();	// Width needs corrected first, so that the column layout will expand and balance correctly.
		this.fixHeight();	// Once the layout is balanced, we can correct the height to match it.
		
		if (this.position.default) this.fixPos();
	}
	
	// The following simply add the calculated layout dimensions to the padding, and set the wrapper to that size
	fixWidth() {
		this.width = this.layoutWidth + this.padding;
	}
	fixHeight() {
		this.height = this.layoutHeight + this.padding;
	}
	
	fixPos() {
		this.fixLeft();
		this.fixTop();
		
		this.position.default = false;
	}
	fixLeft() {
		let dw = this.width - this.application.options.width;
		let left = dw / 2;
		this.position.left -= left;
		this.element.css("left", this.position.left + "px");
	}
	fixTop() {
		let dh = this.height - this.application.options.height;
		let top = dh / 2;
		this.position.top -= top;
		this.element.css("top", this.position.top + "px");
	}
}

// This is how the box sizing is corrected to fit the statblock
Hooks.on("renderMonsterBlock5e", (monsterblock, html, data) => {	// When the sheet is rendered
	console.debug(`Monster Block |`, monsterblock, html, data);

	let popup = new PopupHandler(
		monsterblock, 	// The Application window
		"form.flexcol",
		monsterblock.options.width, 													// From default options
		window.innerHeight - game.settings.get("monsterblock", "max-height-offset"),	// Configurable offset, default is 72 to give space for the macro bar and 10px of padding.
		8																				// The margins on the window content are 8px
	);
	popup.fix();
});

Hooks.on("renderActorSheet5eNPC", (sheet, html, data) => {
	console.debug("Adding Control...");
	let nav = document.createElement("nav");
	nav.innerHTML = `
		<i class="fas fa-cog"></i>
		<ul>
			<li>
				<a class="trigger" data-control="switchToMonsterBlock">${game.i18n.localize("MOBLOKS5E.SwitchToMobloks")}</a>
			</li>
		</ul>
	`;
	nav.classList.add("switches");

	sheet.element.find('.window-content .editable').append(nav);
	
	nav.addEventListener("click", async (event) => {
		await sheet.close();
		await sheet.actor.setFlag("core", "sheetClass", "dnd5e.MonsterBlock5e");
		return sheet.actor.sheet.render(true)
	});
});

Actors.registerSheet("dnd5e", MonsterBlock5e, {
    types: ["npc"],
    makeDefault: false
});