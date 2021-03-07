import PopupHandler from "./scripts/PopupHandler.js"

	damageFormula(attack, index=0) {	// Extract and re-format the damage formula
		return simplifyRollFormula(this.getAttackFormula(attack, index), attack.getRollData());
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

	/**
	 *
	 *
	 * @param {boolean} success - Whether or not the roll was a success.
	 * @param {Event} event - The event object associated with this roll.
	 * @memberof MonsterBlock5e
	 */
	async setCharged(success, event) {
		await this.actor.updateEmbeddedEntity("OwnedItem", {
			_id: event.currentTarget.dataset.itemId,
			"data.recharge.charged": success
		})

		super._onChangeInput(event);
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
				this.prepResources(spell, this.object.items.get(spell._id));
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
	async switchToDefault() {
		const config = CONFIG[this.object.entity];
		const type = this.object.data.type;
		const classes = Object.values(config.sheetClasses[type]);
		let defcls = classes.find(c => c.default).id;

		// When Monster Blocks *is* the default, use the system default instead.
		if (defcls == "dnd5e.MonsterBlock5e") defcls = "dnd5e.ActorSheet5eNPC";
		
		await this.close();
		await this.actor.setFlag("core", "sheetClass", defcls);
		
		return this.actor.sheet.render(true)
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
	async prepFlags() {
		if (this.actor.compendium) return;
		
		this.preparingFlags = false;

		if (!this.actor.getFlag("monsterblock", "initialized")) {
			this.preparingFlags = true;
			await this.actor.update({
				"flags": { "monsterblock": this.defaultFlags }
			}, {});

			this.preparingFlags = false;
			return true;
		}
		
		// Verify that there are no missing flags, which could cause an error.
		let changes = false;
		for (let flag in this.defaultFlags) {
			if (this.actor.getFlag("monsterblock", flag) !== undefined) continue;
			
			changes = true;
			this.preparingFlags = true;
			await this.actor.setFlag("monsterblock", flag, this.defaultFlags[flag]);
		}
		
		this.preparingFlags = false;
		return changes;
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
	static async getQuickInserts() {
		if (game.data.modules.find(m => m.id == "quick-insert")?.active) {
			let { CharacterSheetContext, dnd5eFilters } = await import("../quick-insert/quick-insert.js");
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
			
			let state = !this.actor.getFlag("monsterblock", control);	
			if (debugging()) console.debug(`Monster Block | %cSwitching: ${control} to: ${state}`, "color: orange")
			
			this.actor.setFlag(											
				"monsterblock", 
				control, 
				!this.actor.getFlag("monsterblock", control)			// Get the current setting of this flag, and reverse it.
			);
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
		
		html.find("[data-roll-formula]").click((event) => {			// Universal way to add an element that provides a roll, just add the data attribute "data-roll-formula" with a formula in it, and this applies.
			event.preventDefault();									// This handler makes "quick rolls" possible, it just takes some data stored on the HTML element, and rolls dice directly.
			event.stopPropagation();
			
			const formula = event.currentTarget.dataset.rollFormula;
			const target = event.currentTarget.dataset.rollTarget;
			const success = event.currentTarget.dataset.rollSuccess;
			const failure = event.currentTarget.dataset.rollFailure;
			const handler = event.currentTarget.dataset.rollHandler;
			let flavor = event.currentTarget.dataset.rollFlavor;	// Optionally, you can include data-roll-flavor to add text to the message.
			
			let roll;
			try { roll = new Roll(formula).roll(); }
			catch (e) {
				console.error(e);
				ui.notifications.error(e);
				roll = new Roll("0").roll();
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
			const item = this.actor.getOwnedItem(id);
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
			this.actor.deleteOwnedItem(el.dataset.itemId);
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
	}
	
	toggleExpanded(event) {
		if (!this.flags["compact-feats"]) return;

		const element = event.currentTarget;
		const name = element.querySelector(".item-name");
		const id = name.dataset.itemId;

		const item = this.actor.getOwnedItem(id);
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
			this.actor.getEmbeddedEntity("OwnedItem", input.dataset.entity) : 
			this.actor.data;
		const key = input.dataset.fieldKey
		const dtype = input.dataset.dtype;

		switch (dtype) {
			case "Number":
				if (value != "") value = this.handleNumberChange(entity, key, input, event);
				break;
			case "Roll": {
				try { new Roll(value).roll(); }
				catch (e) {
					console.error(e);
					ui.notifications.error(e);
					input.innerText = getProperty(entity, key);
				}
				break;
			}
		}

		if (input.dataset.entity) {		
			this.actor.updateEmbeddedEntity("OwnedItem", {
				_id: input.dataset.entity,
				[key]: value
			}).then(()=> { super._onChangeInput(event); });
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
	 *//* global inputExpression:readonly */
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

	static isMultiAttack(item) {	// Checks if the item is the multiattack action.
		let name = item.name.toLowerCase().replace(/\s+/g, "");	// Convert the name of the item to all lower case, and remove whitespace.
		return game.i18n.localize("MOBLOKS5E.MultiattackLocators").some(loc => name.includes(loc));
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
		const name = item.name.toLowerCase().replace(/\s+/g, "");
		return !this.isInnateSpellcasting(item) &&
			game.i18n.localize("MOBLOKS5E.SpellcastingLocators").some(loc => name.includes(loc));
	}

	static isInnateSpellcasting(item) {
		let name = item.name.toLowerCase().replace(/\s+/g, "");
		return game.i18n.localize("MOBLOKS5E.InnateCastingLocators").some(loc => name.includes(loc));
	}
		
	static isPactMagic(item) {
		let desc = item.data.description?.value?.toLowerCase().replace(/\s+/g, "");
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

		this.update = updateFn ?? (() => false);
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
	 * @param {MonsterBlock5e} monsterblock - The object representing the sheet itself
	 * @param {string} id - A unique identifier for this menu
	 * @param {string} label - The text of the label, doubles as the button for open/close clicks
	 * @param {MenuTree|false} parent - A reference to the parent menu, or false if this menu is the root
	 * @param {function} updateFn - A function used to update any data that might need changed on render
	 * @param {string} auxSelect - A selector for an auxilary element to toggle a class on
	 * @param {string} auxClass - A class to toggle on the auxilary element
	 * @param {Boolean} visible - Set the initial state of visible or not
	 * @param {JQuery} element - Set the jQuery object for the HTML element associated with this menu
	 * @param {MenuItem[]} children - An array of items in this menu
	 * @memberof MenuTree
	 */
	constructor(monsterblock, id, label, parent, updateFn, auxSelect, auxClass, visible, element, children) {
		let fn = updateFn ?? (() => false);
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
		this.button.click(() => {
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
/* global InputAdapter:readonly */
class ContentEditableAdapter extends InputAdapter {
	get value() {
		return this.element.innerText;
	}
	set value(val) {
		this.element.innerText = val;
	}
}

Hooks.once("init", () => {
	Handlebars.registerHelper(MonsterBlock5e.handlebarsHelpers); // Register all the helpers needed for Handlebars
	
	/* global inputExprInitHandler:readonly */
	inputExprInitHandler();

	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.once("ready", () => {
	MonsterBlock5e.getTokenizer();
	MonsterBlock5e.getQuickInserts();
	
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
	game.settings.register("monsterblock", "show-skill-save", {
		name: game.i18n.localize("MOBLOKS5E.show-skill-save-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-skill-save-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "show-resources", {
		name: game.i18n.localize("MOBLOKS5E.show-resources-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-resources-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
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
	game.settings.register("monsterblock", "compact-window", {
		name: game.i18n.localize("MOBLOKS5E.compact-window.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.compact-window.settings.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "compact-layout", {
		name: game.i18n.localize("MOBLOKS5E.compact-layout.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.compact-layout.settings.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "compact-feats", {
		name: game.i18n.localize("MOBLOKS5E.compact-feats.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.compact-feats.settings.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "font-size", {
		name: game.i18n.localize("MOBLOKS5E.font-size.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.font-size.settings.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 14
	});
});

// This is how the box sizing is corrected to fit the statblock
// eslint-disable-next-line no-unused-vars
Hooks.on("renderMonsterBlock5e", (monsterblock, html, data) => {	// When the sheet is rendered
	//console.debug(`Monster Block |`, monsterblock, html, data);
	if (html.parent().hasClass("grid-cell-content")) return;

	let popup = new PopupHandler(
		monsterblock, 	// The Application window
		"form.flexcol",
		monsterblock.options.width,													// From default options
		window.innerHeight - game.settings.get("monsterblock", "max-height-offset"),	// Configurable offset, default is 72 to give space for the macro bar and 10px of padding.
	//	(window.innerHeight - game.settings.get("monsterblock", "max-height-offset")) * (1 / monsterblock.flags.scale),	// Configurable offset, default is 72 to give space for the macro bar and 10px of padding.
		8,
		monsterblock.flags.scale																				// The margins on the window content are 8px
	);
	popup.fix();
});

Hooks.on("renderActorSheet5eNPC", (sheet) => {
	if (sheet.constructor.name != "ActorSheet5eNPC") return;

	//console.debug("Adding Control...");
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

	sheet.element.find(".window-content .editable").append(nav);
	
	nav.addEventListener("click", async () => {
		await sheet.close();
		await sheet.actor.setFlag("core", "sheetClass", "dnd5e.MonsterBlock5e");
		return sheet.actor.sheet.render(true)
	});
});

Actors.registerSheet("dnd5e", MonsterBlock5e, {
    types: ["npc"],
    makeDefault: false,
	label: "MOBLOKS5E.MonsterBlocks"
});

Hooks.on("renderActorSheet", (...args) => {	// This is just for debugging, it prevents this sheet's template from being cached.
	if (!debugging()) return; 

	let template = "modules/monsterblock/actor-sheet.html";
    delete _templateCache[template];
    console.debug(`Monster Block | removed "${template}" from _templateCache.`);
	console.log(args);
})

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag("monsterblock");
});