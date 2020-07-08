import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

export class MonsterBlock5e extends ActorSheet5eNPC {
	constructor(...args) {
		super(...args);
	}

	get template() {
		return "modules/monsterblock/actor-sheet.html";
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["monsterblock", "sheet", "actor"],
			width: 391,
			height: 800,
			dragDrop: [{dragSelector: ".item .item-name"}, {dragSelector: ".spell-list .spell"}]
		});
	}
	
	// getData() provides the data used in Handlebars for the sheet template.
	getData() {	// Override and add to the getData() function
		const data = super.getData();
		data.flags = this.actor.data.flags.monsterblock;	// Get the flags for this module, and make them available in the data
		data.info = {										// A collection of extra information used mainly for conditionals
			hasCastingFeature: (this.isSpellcaster || this.isInnateSpellcaster),
			isSpellcaster: this.isSpellcaster,
			isInnateSpellcaster: this.isInnateSpellcaster,
			hasAtWillSpells: this.hasAtWillSpells,
			bigRedButton: false
		}
		data.special = {									// A collection of cherry-picked data used in special places.
			multiattack: this.getMultiattack(data),
			legresist: this.getLegendaryResistance(data)
		}
		data.innateSpellbook = this.prepareInnateSpellbook(data.spellbook); 
		
		return data;
	}
	
	_getFormData(form) {	// Work in progress, might not use.
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
	}
	get isSpellcaster () {	// Regular spellcaster with typical spell slots.
		for (let item of this.actor.items) {
			if (MonsterBlock5e.isSpellcasting(item)) return true;
		}
		return false;
	}
	get isInnateSpellcaster() {	// Innate casters have lists of spells that can be cast a certain number of times per day
		for (let item of this.actor.items) {
			if (MonsterBlock5e.isInnateSpellcasting(item)) return true;
		}
		return false;
	}
	get hasAtWillSpells() {	// Some normal casters also have a few spells that they can cast "At will"
		for (let item of this.actor.items) {
			if (item.data.data.preparation && item.data.data.preparation.mode === "atwill") return true;
		}
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
	
	activateListeners(html) {	// We need listeners to provide interaction.
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
			this.actor.rollAbilityTest(ability, {event: event});
		});
		html.find('.saving-throw').click((event) => {
			event.preventDefault();
			let ability = event.currentTarget.dataset.ability;
			this.actor.rollAbilitySave(ability, {event: event});
		});
		html.find('.skill').click((event) => {
			event.preventDefault();
			let ability = event.currentTarget.dataset.skill;
			this.actor.rollSkill(ability, {event: event});
		});
		
		// Item and spell "roll" handlers. Really just pops their chat card into chat, allowing for rolling from there.
		html.find('.item-name').click((event) => {
			event.preventDefault();
			let id = event.currentTarget.dataset.itemId;
			const item = this.actor.getOwnedItem(id);
			return item.roll(); // Conveniently, items have all this logic built in already.
		});
		html.find('.spell').click((event) => {
			event.preventDefault();
			let id = event.currentTarget.dataset.itemId;
			const item = this.actor.getOwnedItem(id);
			return this.actor.useSpell(item, {configureDialog: !event.shiftKey}); // Spells are used through the actor, to track slots.
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
		
		this._dragDrop.forEach(d => d.bind(html[0]));
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
	static isSpellcasting(item) {
		return item.name.toLowerCase().replace(/\s+/g, '') === "spellcasting";
	}
	static isInnateSpellcasting(item) {
		return item.name.toLowerCase().replace(/\s+/g, '') === "innatespellcasting";
	}
	
	
	static createHandlebarsHelpers() {	// Register all the helpers needed for Handlebars
		Handlebars.registerHelper("hascontents", (obj)=> { // Check if an array is empty.
			return Object.keys(obj).length > 0;
		});

		Handlebars.registerHelper("hasskills", (skills)=> { // Check if the creature has any skill proficiencies
			for (let s in skills) {
				if (skills[s].value) return true;
			}
			return false;
		});
		Handlebars.registerHelper("hassave", (saves)=> {	// Check if it has saving-throw proficiencies
			for (let s in saves) {
				if (saves[s].proficient) return true;
			}
			return false;
		});
		
		Handlebars.registerHelper("haslegendary", (features)=> {	// Check for Legendary Actions
			for (let feature of features) {
				if (feature.label == "Actions") {
					let items = feature.items;
					for (let item of items) {
						if (this.isLegendaryAction(item)) return true;
					}
				}
			}
			return false;
		});
		Handlebars.registerHelper("haslair", (features)=> {			// Check for Lair actions
			for (let feature of features) {
				if (feature.label == "Actions") {
					let items = feature.items;
					for (let item of items) {
						if (this.isLairAction(item)) return true;
					}
				}
			}
			return false;
		});
		Handlebars.registerHelper("islegendary", (item)=> {			// Check if an action is a legendary action
			return this.isLegendaryAction(item);
		});
		Handlebars.registerHelper("islegresist", (item)=> {			// Check if an action is a legendary action
			return this.isLegendaryResistance(item);
		});
		Handlebars.registerHelper("isspellcasting", (item)=> {		// Check if this item is the spellcasting feature
			return this.isSpellcasting(item) || this.isInnateSpellcasting(item);
		});
		Handlebars.registerHelper("islair", (item)=> {				// Check if an action is a lair action
			return this.isLairAction(item);
		});
		Handlebars.registerHelper("invalidspelllevel", (level)=> {	// Spell levels less than 0 mean sometihng special, and need checkd for
			return level < 0;
		});
		Handlebars.registerHelper("notspecialaction", (item)=> {	// Used to unsure that actions that need seperated out aren't shown twice
			return !(this.isMultiAttack(item) || this.isLegendaryAction(item) || this.isLairAction(item) || this.isLegendaryResistance(item));
		});
		
		// Feature type groups
		Handlebars.registerHelper("getattacks", (features)=> {
			for (let feature of features) {
				if (feature.label == "Attacks") return feature.items;
			}
		});
		Handlebars.registerHelper("getactions", (features)=> {
			for (let feature of features) {
				if (feature.label == "Actions") return feature.items;
			}
		});
		Handlebars.registerHelper("getfeatures", (features)=> {
			for (let feature of features) {
				if (feature.label == "Features") return feature.items;
			}
		});
		
		
		Handlebars.registerHelper("getattacktype", (attack)=> { // Returns the localization string for the given type of attack.
			return "DND5E.Action" + attack.data.actionType.toUpperCase();
		});
		Handlebars.registerHelper("israngedattack", (attack)=> {
			return ["rwak", "rsak"].includes(attack.data.actionType);
		});
		Handlebars.registerHelper("getattackbonus", (attack, data)=> { // Calculate the "+X to hit"
			let attr = attack.data.ability;					// The ability the item says it uses
			let attackBonus = attack.data.attackBonus;		// Magical item or other bonus
			let abilityBonus = data.abilities[attr].mod;	// The ability bonus of the actor
			let isProf = attack.data.proficient;			// Is the actor proficient with this item?
			let profBonus = data.attributes.prof;			// The actor's proficiency bonus
			
			return abilityBonus + (isProf ? profBonus : 0) + attackBonus;
		});
		Handlebars.registerHelper("getchathtml", (item, actor)=> {	// Finds the *real* instance of the actor and the item, and uses the .getChatData() method to get the the description with inline rolls and links properly formatted.
			return game.actors.get(actor._id).getOwnedItem(item._id).getChatData().description.value;
		});
		Handlebars.registerHelper("enrichhtml", (str)=> { // Formats any text to include proper inline rolls and links.
			return TextEditor.enrichHTML(str, {secrets: true});
		});
		Handlebars.registerHelper("averagedamage", (item, actor)=> {	// Calculates the average damage from an attack
			let formula = item.data.damage.parts[0][0];
			let attr = item.data.ability;
			let abilityBonus = actor.data.abilities[attr].mod;
			let roll = new Roll(formula, {mod: abilityBonus}).roll();
			return Math.ceil((											// The maximum roll plus the minimum roll, divided by two, rounded up.
					Roll.maximize(roll.formula)._total + 
					Roll.minimize(roll.formula)._total 
				)	/ 2
			);
		});
		Handlebars.registerHelper("damageformula", (item, actor)=> {	// Extract and re-format the damage formula
			let formula = item.data.damage.parts[0][0];	// This is the existing formula, typicallys contains a non-number like @mod
			let attr = item.data.ability;				// The ability used for this attack
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
		});
		Handlebars.registerHelper("damagetype", (item)=> {
			return item.data.damage.parts[0][1];
		});
		Handlebars.registerHelper("toinlineroll", (flag, options) => { // Takes a roll formula, and runs it through the enrichHTML method to create an inline roll link.
			if (!flag) return options.fn(this);
			
			return TextEditor.enrichHTML(`[[/gmr ${options.fn(this)}]]`);
		});
		Handlebars.registerHelper("spelllevellocalization", (level)=> { // Returns the localization string for a given spell level
			return "DND5E.SpellLevel" + level;
		});
		Handlebars.registerHelper("getatwill", (spellbook)=> { // Retuns the spellbook section marked "atwill"
			for (let level of spellbook) {
				if (level.prop === "atwill") return level.spells;
			}
			return [];
		});
		Handlebars.registerHelper("hasresource", (item)=> {
			return Boolean(item.data.consume.target);
		});
		Handlebars.registerHelper("getresourcelimit", (item, actor)=> {
			let res = item.data.consume.target.match(/(.+)\.(.+)\.(.+)/);
			return actor.data[res[1]][res[2]].max;
		});
		Handlebars.registerHelper("getresourcerefresh", (item, actor)=> {
			return "Day";
		});
			
		Handlebars.registerHelper("getspellattackbonus", (actor)=> {	// Calculate the spell attack bonus
			let data = actor.data;
			let attr = data.attributes.spellcasting;
			if (!attr) return 0;
			let abilityBonus = data.abilities[attr].mod;
			let profBonus = data.attributes.prof;
			
			return abilityBonus + profBonus;
		});
		
		// Logical operations
		Handlebars.registerHelper("not", (arg)=> {
			return !arg;
		});
		Handlebars.registerHelper("and", (...args)=> {
			args.pop();
			return args.reduce((v, c) => v && c);
		});
		Handlebars.registerHelper("or", (...args)=> {
			args.pop();
			return args.reduce((v, c) => v || c);
		});
		Handlebars.registerHelper("greater", (a, b)=> {
			return a > b;
		});
		Handlebars.registerHelper("less", (a, b)=> {
			return a < b;
		});
		Handlebars.registerHelper("equals", (a, b)=> {
			return a == b;
		});
		
		Handlebars.registerHelper("formatordinal", (number)=> { // Format numbers like "1st", "2nd", "3rd", "4th", etc.
			if (number == 1) return number + "st";
			if (number == 2) return number + "nd";
			if (number == 3) return number + "rd";
			return number + "th";
		});
	}
}

Hooks.on("init", () => {
	MonsterBlock5e.createHandlebarsHelpers();
	
	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.on("renderActorSheet", () => {	// This is just for debugging, it prevents this sheet's template from being cached.
	let template = "modules/monsterblock/actor-sheet.html";
    delete _templateCache[template];
    console.debug(`Monster Block | removed "${template}" from _templateCache.`);
})

// This is how the box sizing is corrected to fit the statblock
Hooks.on("renderMonsterBlock5e", (monsterblock, html, data) => {	// When the sheet is rendered
	console.debug(`Monster Block |`, monsterblock, html, data);
	
	let popup = monsterblock._element[0]; // The window panel
	
	// There is a hidden element in the text at the end, we check its positional offset from its parent to find out where the real end of the text is.
	let anchorPosL = popup.querySelector("#endAnchor").offsetLeft; 
	let anchorPosT = popup.querySelector("#endAnchor").offsetTop;
		
	popup.style.width = anchorPosL + 375 + 8 + "px";	// Add the width of a column, and the width of the padding, to whatever offset it has.
	
	// Working on a more dynamic maximum height // let h = window.innerHeight - 72; // 72px Keeps the popup from covering the macro bar, plus some padding.
	let h = monsterblock.options.height;
	let w = monsterblock.options.width;
	
	if (anchorPosT < h) {	// If the anchor isn't at the bottom of the window, we make the window shorter.
		let shrink = (h - anchorPosT) / 2;
		let nh = h - shrink;
		if (anchorPosL < w) nh = anchorPosT;
		popup.style.height = nh + 16 + "px";
	}
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

	html.find('.window-content .editable')[0].appendChild(nav);
	
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

