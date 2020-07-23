import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

export class MonsterBlock5e extends ActorSheet5eNPC {
	constructor(...args) {
		super(...args);
		
		this.position.default = true;
		
		this.prepFlags().then((p) => {
			this.options.classes.push(this.themes[this.currentTheme].class);
			if (p) this.setCurrentTheme(this.currentTheme);
		});
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
	
	// getData() provides the data used in Handlebars for the sheet template.
	getData() {	// Override and add to the getData() function
		const data = super.getData();
		data.master = this;
		data.flags = this.actor.data.flags.monsterblock;	// Get the flags for this module, and make them available in the data
		data.info = {										// A collection of extra information used mainly for conditionals
			hasCastingFeature: (this.isSpellcaster || this.isInnateSpellcaster),
			isSpellcaster: this.isSpellcaster,
			isInnateSpellcaster: this.isInnateSpellcaster,
			isWarlock: this.isWarlock,
			hasAtWillSpells: this.hasAtWillSpells,
			bigRedButton: false
		}
		data.special = {									// A collection of cherry-picked data used in special places.
			multiattack: this.getMultiattack(data),
			legresist: this.getLegendaryResistance(data)
		}
		data.innateSpellbook = this.prepareInnateSpellbook(data.spellbook); 
		
		data.themes = this.themes;
		
		return data;
	}
	
/*	_getFormData(form) {	// Work in progress, might not use.
		console.debug("_getFormData!");
		let formData = new FormData();
		let dtypes = {};
		
		let fields = form.querySelectorAll('[data-field-key]');
		
		for (let field of fields) {
			let key = field.dataset.fieldKey;
			let type = field.dataset.fieldType;
			let value = field.innerText;
			
			formData.append(key, value);
			if (type) dtypes[key] = type;
		}
		
		formData._dtypes = dtypes;
		return formData;
	}*/
	get isSpellcaster () {	// Regular spellcaster with typical spell slots.
		return this.actor.data.items.some((item) => {
			return item.data.preparation && item.data.level > 0.5 && (item.data.preparation.mode === "prepared" || item.data.preparation.mode === "always");
		});
	}
	get isInnateSpellcaster() {	// Innate casters have lists of spells that can be cast a certain number of times per day
		return this.actor.data.items.some((item) => {
			return item.data.preparation && item.data.preparation.mode === "innate";
		});
	}
	get isWarlock() {
		return this.actor.data.items.some((item) => {
			return item.data.preparation && item.data.preparation.mode === "pact";
		});
	}
	get hasAtWillSpells() {	// Some normal casters also have a few spells that they can cast "At will"
		for (let item of this.actor.items) {
			if (item.data.data.preparation && item.data.data.preparation.mode === "atwill") return true;
		}
	}
	
	static themes = {
		"default": { name: "Monster Manual", class: "default-theme" },
		"srd": { name: "5e SRD", class: "srd-theme" },
		"dark": { name: "Darkness", class: "dark-theme" },
		"cool": { name: "Icy Breeze", class: "cool-theme" },
		"hot": { name: "Smouldering Ember", class: "hot-theme" },
		"custom": { name: "Custom", class: "" }
	}
	get themes() {
		if (this._themes) return this._themes;
		
		this._themes = MonsterBlock5e.themes;
		this._themes.custom = { name: "Custom", class: this.actor.getFlag("monsterblock", "custom-theme-class") };
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
			
		this.element[0].classList.remove(oldTheme.class);
		this.element[0].classList.add(newTheme.class);
		
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
	
	getMultiattack(data) { // The Multiattack action is always first in the list, so we need to find it and seperate it out.
		for (let item of data.items) {
			if (MonsterBlock5e.isMultiAttack(item)) return item;
		}
		return false;
	}
	getLegendaryResistance(data) {
		for (let item of data.items) {
			if (MonsterBlock5e.isLegendaryResistance(item)) return item;
		}
		return false;
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
		"custom-theme-class": game.settings.get("monsterblock", "custom-theme-class")
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
		if (typeof BetterRolls !== 'undefined') {
			let { CustomItemRoll, CustomRoll } = await import("../betterrolls5e/scripts/custom-roll.js");
			Object.assign(this, { CustomItemRoll, CustomRoll });
		}
		else {
			this.CustomItemRoll = false;
			this.CustomRoll = false;
		}
	}
	async activateListeners(html) {	// We need listeners to provide interaction.
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
			
			let roll = new Roll(formula).roll();
			
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
		html.find('.item').contextmenu((event) => {
			event.preventDefault();
			let nameEl = event.currentTarget.querySelector('.item-name');
			const item = this.actor.getOwnedItem(nameEl.dataset.itemId);
			item.sheet.render(true);
		});
		html.find('.spell').contextmenu((event) => {	// Spells are done slightly differently
			event.preventDefault();
			console.log("Double Click!", event.currentTarget);
			let id = event.currentTarget.dataset.itemId;
			const item = this.actor.getOwnedItem(id);
			item.sheet.render(true);
		});
		
		html.find('.big-red-button').click((event) => {
			event.preventDefault();
			//this._onSubmit(event);
			new ActorSheet5eNPC(this.object).render(true);
			this._element[0].classList.remove("monsterblock");
			this._element[0].classList.add("dnd5e");
			this._element[0].classList.add("npc");
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
		
		this._dragDrop.forEach(d => d.bind(html[0]));
		html.on("change", "input,select,textarea", this._onChangeInput.bind(this));
		html.find('input[data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));
	}
	
	static isMultiAttack(item) {	// Checks if the item is the multiattack action.
		let name = item.name.toLowerCase().replace(/\s+/g, '');	// Convert the name of the item to all lower case, and remove whitespace.
		return [	// This is an array of possible names for the multiattack feature that seem likely to come up.
			"multiattack",
			"extraattack",
			"extraattacks",
			"multiattacks",
			"multipleattacks",
			"manyattacks"
		].includes(name); // Array.includes() checks if any item in the array matches the value given. This will determin if the name of the item is one of the options in the array.
	}
	
	static isLegendaryResistance(item) {
		return item.data.consume.target === "resources.legres.value";
	}
	
	// Item purpose checks
	static isLegendaryAction(item) {
		return item.data.activation.type === "legendary";
	}
	static isLairAction(item) {
		return item.data.activation.type === "lair";
	}
	static isReaction(item) {
		return item.data.activation.type === "reaction";
	}
	static isSpellcasting(item) {
		return item.name.toLowerCase().replace(/\s+/g, '') === "spellcasting";
	}
	static isInnateSpellcasting(item) {
		return [
			"innatespellcasting",
			"innatespellcasting(psionics)",
			"innatespellcastingpsionics"
		].includes(item.name.toLowerCase().replace(/\s+/g, ''));
	}
	static getItemAbility(item, actor, master) {
		return master.object.items.get(item._id).abilityMod;
	} 
	static handlebarsHelpers = {
		"hascontents": (obj) => { // Check if an array is empty.
			return Object.keys(obj).length > 0;
		},

		"mobloks5e-hasskills": (skills) => { // Check if the creature has any skill proficiencies
			for (let s in skills) {
				if (skills[s].value) return true;
			}
			return false;
		},
		"hassave": (saves) => {	// Check if it has saving-throw proficiencies
			for (let s in saves) {
				if (saves[s].proficient) return true;
			}
			return false;
		},
		
		"haslegendary": (features) => {	// Check for Legendary Actions
			for (let feature of features) {
				if (feature.label == game.i18n.localize("DND5E.ActionPl")) {
					let items = feature.items;
					for (let item of items) {
						if (this.isLegendaryAction(item)) return true;
					}
				}
			}
			return false;
		},
		"haslair": (features) => {			// Check for Lair actions
			for (let feature of features) {
				if (feature.label == game.i18n.localize("DND5E.ActionPl")) {
					let items = feature.items;
					for (let item of items) {
						if (this.isLairAction(item)) return true;
					}
				}
			}
			return false;
		},
		"hasreaction": (features) => {
			for (let feature of features) {
				if (feature.label == game.i18n.localize("DND5E.ActionPl")) {
					let items = feature.items;
					for (let item of items) {
						if (this.isReaction(item)) return true;
					}
				}
			}
			return false;
		},
		"islegendary": (item) => this.isLegendaryAction(item),
		"islegresist": (item) => this.isLegendaryResistance(item),
		"isspellcasting": (item) => this.isSpellcasting(item) || this.isInnateSpellcasting(item),
		"islair": (item)=> this.isLairAction(item),
		"isreaction": (item) => this.isReaction(item),
		"invalidspelllevel": (level) => level < 0,	// Spell levels less than 0 mean sometihng special, and need checkd for
		"notspecialaction": (item) => !(	// Used to ensure that actions that need seperated out aren't shown twice
			   this.isMultiAttack(item) 
			|| this.isLegendaryAction(item) 
			|| this.isLairAction(item) 
			|| this.isLegendaryResistance(item)
			|| this.isReaction(item)
		),
		
		// Feature type groups
		"getattacks": (features) => {
			for (let feature of features) {
				if (feature.label == game.i18n.localize("DND5E.AttackPl")) return feature.items;
			}
		},
		"getactions": (features) => {
			for (let feature of features) {
				if (feature.label == game.i18n.localize("DND5E.ActionPl")) return feature.items;
			}
		},
		"getfeatures": (features) => {
			for (let feature of features) {
				if (feature.label == game.i18n.localize("DND5E.Features")) return feature.items;
			}
		},
		
		
		"getattacktype": (attack) => { // Returns the localization string for the given type of attack.
			return "DND5E.Action" + attack.data.actionType.toUpperCase();
		},
		"israngedattack": (attack) => {
			return ["rwak", "rsak"].includes(attack.data.actionType);
		},
		"getattackbonus": (attack, data, actor, options) => { // Calculate the "+X to hit"
			let attr = this.getItemAbility(attack, actor, options.data.root.master);	// The ability the item says it uses
			let attackBonus = attack.data.attackBonus;		// Magical item or other bonus
			let abilityBonus = data.abilities[attr].mod;	// The ability bonus of the actor
			let isProf = attack.data.proficient;			// Is the actor proficient with this item?
			let profBonus = data.attributes.prof;			// The actor's proficiency bonus
			
			return abilityBonus + (isProf ? profBonus : 0) + attackBonus;
		},
		"getcastingability": (actor, spellbook, type) => {
			let main = actor.data.attributes.spellcasting;
			let castingability = main;
			
			let types = {
				"will": (l) => l.order == -20,
				"innate": (l) => l.order == -10,
				"pact": (l) => l.order == 0.5,
				"cantrip": (l) => l.order == 0,
				"prepared": (l) => l.order > 0.5
			}
			let spelllevel = spellbook.find(types[type])
			if (spelllevel !== undefined) {
				let spell = spelllevel.spells.find((s) => s.data.ability && s.data.ability != actor.data.attributes.spellcasting);
				if (spell !== undefined) castingability = spell.data.ability;
			}
			return actor.data.abilities[castingability].label;
			 
		},
		"getchathtml": (item, actor) => {	// Finds the *real* instance of the actor and the item, and uses the .getChatData() method to get the the description with inline rolls and links properly formatted.
			return game.actors.get(actor._id).getOwnedItem(item._id).getChatData().description.value;
		},
		"enrichhtml": (str) => { // Formats any text to include proper inline rolls and links.
			return TextEditor.enrichHTML(str, {secrets: true});
		},
		"averagedamage": (item, actor, options) => {	// Calculates the average damage from an attack
			let formula = item.data.damage.parts[0][0];
			let attr = this.getItemAbility(item, actor, options.data.root.master);
			let abilityBonus = actor.data.abilities[attr].mod;
			let roll = new Roll(formula, {mod: abilityBonus}).roll();
			return Math.floor((											// The maximum roll plus the minimum roll, divided by two, rounded down.
					Roll.maximize(roll.formula)._total + 
					Roll.minimize(roll.formula)._total 
				)	/ 2
			);
		},
		"averageroll": (formula) => {			// Calculates the average of a roll
			if (!formula) return 0;
			let roll = new Roll(formula).roll();
			return Math.floor((											// The maximum roll plus the minimum roll, divided by two, rounded down.
					Roll.maximize(roll.formula)._total + 
					Roll.minimize(roll.formula)._total 
				)	/ 2
			);
		},
		"formatnumbercommas": (number) => {
			return number.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");	// https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
		},
		"damageformula": (item, actor, options) => {	// Extract and re-format the damage formula
			let formula = item.data.damage.parts[0][0];	// This is the existing formula, typicallys contains a non-number like @mod
			let attr = this.getItemAbility(item, actor, options.data.root.master);				// The ability used for this attack
			let abilityBonus = actor.data.abilities[attr].mod;	// The ability bonus of the actor
			let roll = new Roll(formula, {mod: abilityBonus}).roll();	// Create a new Roll, giving the ability modifier to sub in for @mod
			
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
		},
		"damagetype": (item) => {
			return item.data.damage.parts[0][1];
		},
		"toinlineroll": (flag, options) => { // Takes a roll formula, and runs it through the enrichHTML method to create an inline roll link.
			if (!flag) return options.fn(this);
			
			return TextEditor.enrichHTML(`[[/gmr ${options.fn(this)}]]`);
		},
		"spelllevellocalization": (level) => { // Returns the localization string for a given spell level
			return "DND5E.SpellLevel" + parseInt(level, 10); // Never allow this to be a fraction, the results aren't good.
		},
		"getatwill": (spellbook) => { // Retuns the spellbook section marked "atwill"
			for (let level of spellbook) {
				if (level.prop === "atwill") return level.spells;
			}
			return [];
		},
		"hasresource": (item) => {
			return Boolean(item.data.consume.target);
		},
		"getresourcelimit": (item, actor) => {
			let res = item.data.consume.target.match(/(.+)\.(.+)\.(.+)/);
			return actor.data[res[1]][res[2]].max;
		},
		"getresourcerefresh": (item, actor) => {
			return "Day";
		},
		"warlockslotlevel": (spelllevel) => {
			return spelllevel.spells.reduce((a, b) => a > b.data.level ? a : b.data.level, 0);
		},
		"getspellattackbonus": (actor)=> {	// Calculate the spell attack bonus
			let data = actor.data;
			let attr = data.attributes.spellcasting;
			if (!attr) return 0;
			let abilityBonus = data.abilities[attr].mod;
			let profBonus = data.attributes.prof;
			
			return abilityBonus + profBonus;
		},
		"handlesenses": (senses, actor) => {
			if (senses.toLowerCase().indexOf("perception") > -1) return senses;
			
			let perception = actor.data.skills.prc.passive;
			
			return `${senses}${senses ? ", " : ""}passive Perception ${perception}`
		},
		"isprepared": (item) => {
			return item.data.preparation.mode === "prepared" || item.data.preparation.mode === "always";
		},
		
		// Logical operations
		"not": (arg) => {
			return !arg;
		},
		"and": (...args) => {
			args.pop();
			return args.reduce((v, c) => v && c);
		},
		"or": (...args) => {
			args.pop();
			return args.reduce((v, c) => v || c);
		},
		"greater": (a, b) => {
			return a > b;
		},
		"less": (a, b) => {
			return a < b;
		},
		"equal": (a, b) => {
			return a == b;
		},
		"notequal": (a, b) => {
			return a != b;
		},
		
		"formatordinal": (number) => { // Format numbers like "1st", "2nd", "3rd", "4th", etc.
			if (number == 1) return number + "st";
			if (number == 2) return number + "nd";
			if (number == 3) return number + "rd";
			return number + "th";
		},
		"getnumber": (number) => {
			number = Number(number);
			if (number > 9 || number < 0) return number.toString();
			return "MOBLOKS5E."+["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][number];
		}
	};
}

Hooks.once("init", () => {
	Handlebars.registerHelper(MonsterBlock5e.handlebarsHelpers); // Register all the helpers needed for Handlebars
	
	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.once('ready', () => {
	MonsterBlock5e.getBetterRolls();
	
	game.settings.register("monsterblock", "attack-descriptions", {
		name: "Generated Attack Descriptions",
		hint: "Show automatically generated attack descriptions by default.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "casting-feature", {
		name: "Generated Casting Features",
		hint: "Show automatically generated casting features by default.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "inline-secrets", {
		name: "Display Secrets Inline",
		hint: "By default, display blocks of secret text inline like all other text? Otherwise, display inline blocks as styled blocks of text.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "hidden-secrets", {
		name: "Hide Secrets",
		hint: "By default, hide secret blocks of text from the sheet.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "hide-profile-image", {
		name: "Hide Image",
		hint: "By default, don't show the creature's image on the sheet (more accurate).",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "show-lair-actions", {
		name: "Show Lair Actions",
		hint: "By default, show Lair Actions (not normally included in 5e monster stat-blocks).",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "current-hit-points", {
		name: "Show Current Hit Points",
		hint: "By default, display the current hit point in the hit points field. If neither maximum nor minimum Hit Points are shown, the average will be calculated and displayed.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "maximum-hit-points", {
		name: "Show Maximum Hit Points",
		hint: "By default, display the current hit point in the hit points field. If neither maximum nor minimum Hit Points are shown, the average will be calculated and displayed.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "max-height-offset", {
		name: "Maximum Height Offset",
		hint: "The maximum height of a Monster Blocks window is based on the height of the browser viewport, minus this offset. The default value of 72 is the height of the macro bar plus 10px of padding. If you prefer statblocks to be tall and narrow, reduce this value. If you prefer that stat blocks be wider (more columns) increase this value.",
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
	for (let theme in MonsterBlock5e.themes) themeChoices[theme] = MonsterBlock5e.themes[theme].name;
	game.settings.register("monsterblock", "default-theme", {
		name: "Default Theme",
		hint: "Choose which theme applies by default.",
		scope: "world",
		config: true,
		type: String,
		choices: themeChoices,
		default: "default"
	});
	game.settings.register("monsterblock", "custom-theme-class", {
		name: "Default Custom Theme Class",
		hint: "The class name used for your default custom theme.",
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

class PopupHandler {
	constructor(application, layoutselector, defaultWidth, defaultHeight, padding) {
		this.application = application;
		this.padding = padding;
		this.element = application.element[0];
		this._height = defaultHeight;
		this._width = defaultWidth;
		
		this.width = this._width;	// Actually set the width and height to the default values,
		this.height = this._height;	// allowing the column layout to correctly set the number of columns needed.
		
		let flexcol = this.element.querySelector(layoutselector);
		this.layout = Array.from(	// Converting to an array because it has so many useful methods.
			flexcol.children		// All children of the column layout, which is the form.flexcol
		);
	}
	
	// These set both the real height of the element (adding the "px" unit because it's a CSS property) and the stored numeric value
	set height(h) {
		this._height = h;
		this.element.style.height = h + "px";
		this.position.height = h;
	}
	set width(w) {
		this._width = w;
		this.element.style.width = w + "px";
		this.position.width = w;
	}
	
	get height() { return this._height; }
	get width() { return this._width; }
	get position() { return this.application.position; }
	
	// Returns the largest offset from the left side of the layout that any element's right edge has (this is the maximum width of the layout).
	get layoutWidth() {											
		return this.layout.reduce((width, el) => {							// Iterate over all the children of the layout, searching for the one with a right edge furthest from 0
			let right = el.offsetLeft + el.getBoundingClientRect().width;	// The left edge offset of the element, plus the width, is the right edge offset
			return right > width ? right : width;							// If this element has a right side further from 0 than the previous record, its offset is the new record.
		}, 391);
	}
	// Returns the greatest offset from the top of the layout of any element's bottom (this is the maximum height of the layout).
	get layoutHeight() {													
		let top = this.element.getBoundingClientRect().top;			// Find the offset of the top of the bounding element from the top of the displayport
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
		this.element.style.left = this.position.left + "px";
	}
	fixTop() {
		let dh = this.height - this.application.options.height;
		let top = dh / 2;
		this.position.top -= top;
		this.element.style.top = this.position.top + "px";
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
	
//	let theme = monsterblock.actor.getFlag("monsterblock", "theme-choice");
//	monsterblock
	
//	monsterblock.position.height = popup.height;
});

Hooks.on("renderActorSheet5eNPC", (sheet, html, data) => {
	console.debug("Adding Control...");
	let nav = document.createElement("nav");
	nav.innerHTML = `
		<i class="fas fa-cog"></i>
		<ul>
			<li>
				<a class="trigger" data-control="switchToMonsterBlock">Switch to Monster Blocks</a>
			</li>
		</ul>
	`;
	nav.classList.add("switches");

	$(sheet.element[0]).find('.window-content .editable')[0].appendChild(nav);
	
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

