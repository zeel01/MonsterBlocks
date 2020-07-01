import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

export class MonsterBlock5e extends ActorSheet5eNPC {
	constructor(...args) {
		super(...args);
		
		this.createHandlebarsHelpers();
	}

	get template() {
		return "modules/monsterblock/actor-sheet.html";
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["monsterblock", "sheet", "actor"],
		//	template: "modules/monsterblock/actor-sheet.html",
			width: 416,
			height: 800,
			tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
		});
	}
	
	getData() {
		const data = super.getData();
		data.flags = this.actor.data.flags.monsterblock;
		data.info = {
			hasCastingFeature: (this.isSpellcaster || this.isInnateSpellcaster),
			isSpellcaster: this.isSpellcaster,
			isInnateSpellcaster: this.isInnateSpellcaster,
			hasAtWillSpells: this.hasAtWillSpells
		}
		
		data.innateSpellbook = this.prepareInnateSpellbook(data.spellbook);
		
		return data;
	}
	get isSpellcaster () {
		for (let item of this.actor.items) {
			if (this.isSpellcasting(item)) return true;
		}
		return false;
	}
	get isInnateSpellcaster() {
		for (let item of this.actor.items) {
			if (this.isInnateSpellcasting(item)) return true;
		}
		return false;
	}
	get hasAtWillSpells() {
		for (let item of this.actor.items) {
			if (item.data.data.preparation && item.data.data.preparation.mode === "atwill") return true;
		}
	}
	prepareInnateSpellbook(spellbook) { // We need to completely re-organize the spellbook for an innate spellcaster
	//	let innateLevels = [];
	//	for (let level of spellbook) {
	//		if (level.prop !== "innate") continue;
	//		for (let spell of level.spells) {
	//			innateLevels.push(spell.data.uses.max);
	//		}
	//	}
		let innateSpellbook = [];
	//	for (let l of innateLevels) {
	//		
	//	}
		for (let level of spellbook) {
			if (level.prop !== "innate") continue;
			for (let spell of level.spells) {
				let uses = spell.data.uses.max;
				
				let finder = e => e.uses == uses;
				
				if (!innateSpellbook.some(finder)) {
					innateSpellbook.push({
						canCreate: false,
						canPrepare: false,
						dataset: { level: -10, type: "spell" },
						label: uses < 1 ? "At will" : (uses + "/day"),
						order: -10,
						override: 0,
						prop: "innate",
						slots: "-",
						spells: [],
						uses: uses,
						usesSlots: false
					});
				}
				
				innateSpellbook.find(finder).spells.push(spell);
			}
		}
		innateSpellbook.sort((a, b) => {
			if (a.uses == 0 && b.uses == 0) return 0;
			if (a.uses == 0) return -1;
			if (b.uses == 0) return 1;
			
			return a.uses < b.uses ? 1 : -1;
		});
		
		return innateSpellbook;
	}
	
	activateListeners(html) {
		html.find('.switch').click((event) => {
			let control = event.target.dataset.control;
			let state = !this.actor.getFlag("monsterblock", control);
			console.debug(`Monster Block | %cSwitching: ${control} to: ${state}`, "color: orange")
			this.actor.setFlag(
				"monsterblock", 
				control, 
				!this.actor.getFlag("monsterblock", control)
			);
		});
	}
	
	toggleAttackDescription() {
		
	}
	
	
	isMultiAttack(item) {
		let name = item.name.toLowerCase().replace(/\s+/g, '');
		return [
			"multiattack",
			"extraattack",
			"extraattacks",
			"multiattacks",
			"multipleattacks",
			"manyattacks"
		].includes(name);
	}
	isLegendaryAction(item) {
		return item.data.activation.type === "legendary";
	}
	isLairAction(item) {
		return item.data.activation.type === "lair";
	}
	isSpellcasting(item) {
		return item.name.toLowerCase().replace(/\s+/g, '') === "spellcasting";
	}
	isInnateSpellcasting(item) {
		return item.name.toLowerCase().replace(/\s+/g, '') === "innatespellcasting";
	}
	
	
	createHandlebarsHelpers() {
		Handlebars.registerHelper("hascontents", (obj)=> {
			return Object.keys(obj).length > 0;
		});

		Handlebars.registerHelper("hasskills", (skills)=> {
			for (let s in skills) {
				if (skills[s].value) return true;
			}
			return false;
		});
		Handlebars.registerHelper("hassave", (saves)=> {
			for (let s in saves) {
				if (saves[s].proficient) return true;
			}
			return false;
		});
		
		Handlebars.registerHelper("haslegendary", (features)=> {
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
		Handlebars.registerHelper("haslair", (features)=> {
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
		Handlebars.registerHelper("islegendary", (item)=> {
			return this.isLegendaryAction(item);
		});
		Handlebars.registerHelper("isspellcasting", (item)=> {
			return this.isSpellcasting(item) || this.isInnateSpellcasting(item);
		});
		Handlebars.registerHelper("islair", (item)=> {
			return this.isLairAction(item);
		});
		Handlebars.registerHelper("invalidspelllevel", (level)=> {
			return level < 0;
		});
		Handlebars.registerHelper("getmultiattack", ()=> {
			for (let item of this.actor.items) {
				if (this.isMultiAttack(item.data)) return item.data;
			}
			return false;
		});
		Handlebars.registerHelper("notspecialaction", (item)=> {
			// Handlebars has no negation in conditions afik, so we have to create one.
			return !(this.isMultiAttack(item) || this.isLegendaryAction(item) || this.isLairAction(item));
		});
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
		Handlebars.registerHelper("getattacktype", (attack)=> {
			return "DND5E.Action" + attack.data.actionType.toUpperCase();
		});
		Handlebars.registerHelper("israngedattack", (attack)=> {
			return ["rwak", "rsak"].includes(attack.data.actionType);
		});
		Handlebars.registerHelper("getattackbonus", (attack, data)=> {
			let attr = attack.data.ability;
			let abilityBonus = data.abilities[attr].mod;
			let isProf = attack.data.proficient;
			let profBonus = data.attributes.prof;
		//	console.debug(attr, abilityBonus, isProf, profBonus);
			
			return abilityBonus + (isProf ? profBonus : 0);
		});
		Handlebars.registerHelper("getchathtml", (item, actor)=> {
			return game.actors.get(actor._id).getOwnedItem(item._id).getChatData().description.value;
		});
		Handlebars.registerHelper("enrichhtml", (str)=> {
			return TextEditor.enrichHTML(str, {secrets: true});
		});
		Handlebars.registerHelper("averagedamage", (item)=> {
			let formula = item.data.damage.parts[0][0];
			let attr = item.data.ability;
			let abilityBonus = this.actor.data.data.abilities[attr].mod;
			let roll = new Roll(formula, {mod: abilityBonus}).roll();
			return Math.ceil((
					Roll.maximize(roll.formula)._total + 
					Roll.minimize(roll.formula)._total 
				)	/ 2
			);
		});
		Handlebars.registerHelper("damageformula", (item)=> {
			let formula = item.data.damage.parts[0][0];
			let attr = item.data.ability;
			let abilityBonus = this.actor.data.data.abilities[attr].mod;
			let roll = new Roll(formula, {mod: abilityBonus}).roll();
			return roll.formula;
		});
		Handlebars.registerHelper("damagetype", (item)=> {
			return item.data.damage.parts[0][1];
		});
		Handlebars.registerHelper("toinlineroll", (flag, options) => {
			console.debug(flag, options.fn(this));
			if (!flag) return options.fn(this);
			
			return TextEditor.enrichHTML(`[[/gmr ${options.fn(this)}]]`);
		});
		Handlebars.registerHelper("spelllevellocalization", (level)=> {
			return "DND5E.SpellLevel" + level;
		});
		Handlebars.registerHelper("getatwill", (spellbook)=> {
			for (let level of spellbook) {
				if (level.prop === "atwill") return level.spells;
			}
			return [];
		});
			
		Handlebars.registerHelper("getspellattackbonus", ()=> {
			let data = this.actor.data.data;
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
		
		Handlebars.registerHelper("formatordinal", (number)=> {
			if (number == 1) return number + "st";
			if (number == 2) return number + "nd";
			if (number == 3) return number + "rd";
			return number + "th";
		});
	}
}

Hooks.on("init", () => {
	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.on("renderActorSheet", ()=> {
	let template = "modules/monsterblock/actor-sheet.html";
    delete _templateCache[template];
    console.debug(`Monster Block | removed "${template}" from _templateCache.`);
})

Hooks.on("renderMonsterBlock5e", (monsterblock, html, data)=> {
	console.debug(`Monster Block |`, monsterblock, html, data);
	
	let popup = monsterblock._element[0];
	let anchorPosL = popup.querySelector("#endAnchor").offsetLeft;
	let anchorPosT = popup.querySelector("#endAnchor").offsetTop;
		
	popup.style.width = anchorPosL + 408 + "px";
	
	// Working on a more dynamic maximum height // let h = window.innerHeight - 72; // 72px Keeps the popup from covering the macro bar, plus some padding.
	let h = monsterblock.options.height;
	let w = monsterblock.options.width;
	
	if (anchorPosT < h) {
		let shrink = (h - anchorPosT) / 2;
		let nh = h - shrink;
		if (anchorPosL < w) nh = anchorPosT;
		popup.style.height = nh + 16 + "px";
	}
});

Actors.registerSheet("dnd5e", MonsterBlock5e, {
    types: ["npc"],
    makeDefault: false
});

