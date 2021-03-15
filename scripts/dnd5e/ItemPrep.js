import MonsterBlock5e from "./MonsterBlock5e.js";
import { simplifyRollFormula } from "../../../../systems/dnd5e/module/dice.js";
import Helpers from "./Helpers5e.js";


export default class ItemPrep {
	constructor(sheet, data) {
		this.sheet = sheet;
		this.data = data;

		this._prepareItems(data);
	}
	
	_prepareItems(data) {
		

		// Categorize Items as Features and Spells
		/**
		 * @typedef Feature
		 * @property {typeof ItemPreper}    prep
		 * @property {Function} filter
		 * @property {string}   label
		 * @property {Array}    items
		 * @property {object}   dataset
		 *//**
		 * @type {Object.<string, Feature>}
		 */
		const features = {
			legResist:	{ prep: this.prepFeature.bind(this), filter: MonsterBlock5e.isLegendaryResistance, label: game.i18n.localize("MOBLOKS5E.LegendaryResistance"), items: [] , dataset: {type: "feat"} },
			legendary:	{ prep: this.prepAction.bind(this), filter: MonsterBlock5e.isLegendaryAction, label: game.i18n.localize("DND5E.LegAct"), items: [] , dataset: {type: "feat"} },
			lair:		{ prep: this.prepAction.bind(this), filter: MonsterBlock5e.isLairAction, label: game.i18n.localize("MOBLOKS5E.LairActionsHeading"), items: [] , dataset: {type: "feat"} },
			multiattack:{ prep: this.prepAction.bind(this), filter: MonsterBlock5e.isMultiAttack, label: game.i18n.localize("MOBLOKS5E.Multiattack"), items: [] , dataset: {type: "feat"} },
			casting:	{ prep: this.prepCasting.bind(this), filter: MonsterBlock5e.isCasting.bind(MonsterBlock5e), label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
			reaction:	{ prep: this.prepAction.bind(this), filter: MonsterBlock5e.isReaction, label: game.i18n.localize("MOBLOKS5E.Reactions"), items: [], dataset: {type: "feat"} },
			attacks:	{ prep: this.prepAttack.bind(this), filter: item => item.type === "weapon", label: game.i18n.localize("DND5E.AttackPl"), items: [] , dataset: {type: "weapon"} },
			actions:	{ prep: this.prepAction.bind(this), filter: item => Boolean(item.data?.activation?.type), label: game.i18n.localize("DND5E.ActionPl"), items: [] , dataset: {type: "feat"} },
			features:	{ prep: this.prepFeature.bind(this), filter: item => item.type === "feat", label: game.i18n.localize("DND5E.Features"), items: [], dataset: {type: "feat"} },
			equipment:	{ prep: this.prepEquipment.bind(this), filter: () => true, label: game.i18n.localize("DND5E.Inventory"), items: [], dataset: {type: "loot"}}
		};

		// Start by classifying items into groups for rendering
		let [spells, other] = data.items.reduce((arr, item) => {
			if ( item.type === "spell" ) arr[0].push(item);
			else arr[1].push(item);
			return arr;
		}, [[], []]);

		// Apply item filters
		spells = this.sheet._filterItems(spells, this.sheet._filters.spellbook);
		other = this.sheet._filterItems(other, this.sheet._filters.features);

		// Organize Spellbook
		data.spellbook = this.sheet._prepareSpellbook(data, spells);
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
	prepFeature(featureData) {
		let feature = this.sheet.object.items.get(featureData._id);

		this.prepResources(featureData, feature)
	}
	prepAction(actionData) {
		let action = this.sheet.object.items.get(actionData._id);
			
		this.prepResources(actionData, action);
		
		actionData.is = { 
			multiAttaack: MonsterBlock5e.isMultiAttack(action.data),
			legendary: MonsterBlock5e.isLegendaryAction(action.data),
			lair: MonsterBlock5e.isLairAction(action.data),
			legResist: MonsterBlock5e.isLegendaryResistance(action.data),
			reaction: MonsterBlock5e.isReaction(action.data)
		};
		actionData.is.specialAction = Object.values(actionData.is).some(v => v == true);	// Used to ensure that actions that need seperated out aren't shown twice
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

		featureData.castingType = MonsterBlock5e.isSpellcasting(featureData) ?
			(MonsterBlock5e.isPactMagic(featureData) ? cts.pact : cts.standard) : cts.innate;
		featureData.hasAtWill = this.sheet.hasAtWillSpells();
		
		let ct = featureData.castingType;
		
		featureData.spellbook = this.reformatSpellbook(ct, cts, data);
		

		let [abilityTitle, castingAbility] = this.getCastingAbility(featureData.spellbook, ct, data);
		let tohit = this.getSpellAttackBonus(castingAbility);
		
		featureData.description = this.getCastingFeatureDescription(ct, cts, castingAbility, abilityTitle, tohit, featureData, data)

		
		//console.debug(featureData);
	}
	prepAttack(attackData) {
		let attack = this.sheet.object.items.get(attackData._id);
		
		this.prepResources(attackData, attack);

		attackData.tohit = attack.labels.toHit;
		
		attackData.description = this.getAttackDescription(attack);

		attackData.continuousDescription = 
			MonsterBlock5e.isContinuousDescription(attackData.data.description.value);

		console.log(attackData.continuousDescription);
	}
	prepEquipment(equipData) {
		let item = this.sheet.object.items.get(equipData._id);

		this.prepResources(equipData, item);
	}

	prepResources(data, item) {
		data.hasresource 
			=  Boolean(item.data.data.consume?.target)
			|| item.type == "consumable"
			|| item.type == "loot"
			|| item.data.data.uses?.max;

		if (!data.hasresource) return;

		let res = data.resource = {};

		if (item.type == "consumable" || item.type == "loot") res.type = "consume";
		else if (item.data.data.uses?.max) res.type = "charges";
		else res.type = item.data.data.consume.type;

		switch (res.type) {
			case "attribute": {
				let t = item.data.data.consume.target;
				let r = t.match(/(.+)\.(.+)\.(.+)/);
				let max = `data.${r[1]}.${r[2]}.max`;
				
				res.target = "data." + t;
				res.current = getProperty(this.sheet.actor.data, res.target);
				res.limit = getProperty(this.sheet.actor.data, max);
				res.refresh = game.i18n.localize("MOBLOKS5E.ResourceRefresh"); // It just says "Day" becaause thats typically the deal, and I don't see any other option.
				break;
			}
			case "charges": {
				res.target = "data.uses.value";
				res.entity = item.data.data.consume.target || item.id;
				res.current = item.data.data.uses.value;
				res.limit = item.type == "spell" ? false : item.data.data.uses.max;
				res.limTarget = "data.uses.max";
				res.refresh = CONFIG.DND5E.limitedUsePeriods[item.data.data.uses.per];
				break;
			}
			case "material":
			case "ammo": {
				res.entity = item.data.data.consume.target;
				let ammo = this.sheet.actor.getEmbeddedEntity("OwnedItem", res.entity);
				if (!ammo) break;
				
				res.limit = false;
				res.current = ammo.data.quantity;
				res.target = "data.quantity";
				res.name = ammo.name;
				break;
			}
			case "consume": {
				res.entity = item._id;
				res.limit = false;
				res.current = item.data.data.quantity;
				res.target = "data.quantity";
				break;
			}
		}
	}
	castingTypes = {
		standard: Symbol("Standard Spellcasting"),
		innate: Symbol("Innate Spellcasting"),
		pact: Symbol("Pact Macgic")
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
			if (   (ct == cts.pact && !(page.order == 0.5 || page.order == 0))	// Pact magic is only "0.5" and cantrips
				|| (page.order == -20)											// Don't bother with at-will.
				|| (ct != cts.innate && page.order == -10)						// Only innate has -10
			) return false;

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
						`${Helpers.formatOrdinal(1)}-${Helpers.formatOrdinal(page.maxSpellLevel)}` :
						Helpers.formatOrdinal(page.maxSpellLevel)
				});
				page.slotKey = `data.spells.${ct == cts.pact ? "pact" : `spell${page.maxSpellLevel}`}`
				page.slotLabel = game.i18n.format(ct == cts.pact ?
					"MOBLOCKS5E.SpellPactSlots" : "MOBLOCKS5E.SpellSlots", {
					slots: `<span class="slot-count"
								contenteditable="${this.sheet.flags.editing}"
								data-field-key="${page.slotKey}.override"
								data-dtype="Number"
								placeholder="0"
							>${page.slots}</span>`,
					level: Helpers.formatOrdinal(page.maxSpellLevel)
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
	 * @param {string} castingAbility - The id of the casting ability for this feature
	 * @param {string} abilityTitle - The name of the casting ability for this feature
	 * @param {number} tohit - The spell-attack bonus for this casting ability
	 * @param {Object} featureData - The data object for this feature
	 * @param {Object} data - The Handlebars data object
	 * @return {Object} An object containing translated and filled sections of the casting feature description
	 * @memberof MonsterBlock5e
	 */
	getCastingFeatureDescription(ct, cts, castingAbility, abilityTitle, tohit, featureData, data) {
		const casterLevel = this.sheet.actor.data.data?.details?.spellLevel ?? 0;
		const suffix = MonsterBlock5e.getOrdinalSuffix(casterLevel);
		let abilityOptions = Object.entries(CONFIG.DND5E.abilities).reduce((acc, [key, value]) => {
			if (key == castingAbility) return acc;
			return acc + `<li data-selection-value="${key}">${value}</li>`
		}, "")

		return {
			level: ct == cts.innate ? "" : game.i18n.format("MOBLOKS5E.CasterNameLevel", {
				name: this.sheet.actor.name,
				level: `<span class="caster-level"
							contenteditable="${this.flags.editing}"
							data-field-key="data.details.spellLevel"
							data-dtype="Number"
							placeholder="0"
							>${casterLevel}</span>${suffix}`
			}),
			ability: game.i18n.format(
				ct == cts.innate ? "MOBLOKS5E.InnateCastingAbility" : "MOBLOKS5E.CastingAbility", {
				name: this.sheet.actor.name,
				ability: `
				<div class="select-field" data-select-key="data.attributes.spellcasting" data-selected-value="${castingAbility}">
					<label class="${this.sheet.flags.editing ? "select-label" : ""}">${abilityTitle}</label>
					${this.sheet.flags.editing ? `<ul class="actor-size select-list">${abilityOptions}</ul>`: ""}
				</div>`
			}
			),
			stats: game.i18n.format("MOBLOKS5E.CastingStats", {
				savedc: this.sheet.actor.data.data?.attributes?.spelldc,
				bonus: `${tohit > -1 ? "+" : ""}${tohit}`
			}),
			warlockRecharge: ct == cts.pact ? game.i18n.localize("MOBLOKS5E.WarlockSlotRegain") : "",
			spellintro: game.i18n.format({
				[cts.standard]: "MOBLOKS5E.CasterSpellsPreped",
				[cts.pact]: "MOBLOKS5E.WarlockSpellsPreped",
				[cts.innate]: "MOBLOKS5E.InnateSpellsKnown"
			}[ct], {
				name: this.sheet.actor.name,
				atwill: featureData.hasAtWill ? game.i18n.format("MOBLOKS5E.CasterAtWill", {
					spells: data.spellbook.find(l => l.prop === "atwill")?.spells?.reduce((list, spell) => {
						return `${list}
							<li class="spell at-will-spell" data-item-id="${spell._id}">
								${this.sheet.flags["show-delete"] && this.sheet.flags["editing"] ?
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
		let data = this.sheet.actor.data.data;
		let abilityBonus = data.abilities[attr]?.mod;
		let profBonus = data.attributes?.prof;
		
		return abilityBonus + profBonus;
	}
	getCastingAbility(spellbook, type, data) {
		let main = this.sheet.actor.data.data?.attributes?.spellcasting || "int";
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
		let tohit = attack.labels.toHit || "0";
		
		return {
			attackType: this.getAttackType(attack),
			tohit: game.i18n.format("MOBLOKS5E.AttackToHit", {
				bonus: ["+", "-"].includes(tohit.charAt(0))
					? tohit.charAt(1) == " " ? tohit.slice(0, 1) + tohit.slice(2) : tohit
					: `+${tohit}`
			}),
			range: game.i18n.format("MOBLOKS5E.AttackRange", {
				reachRange: game.i18n.localize(this.isRangedAttack(attack) ? "MOBLOKS5E.range" : "MOBLOKS5E.reach"),
				range: atkd.range?.value,
				sep: atkd.range?.long ? "/" : "",
				max: atkd.range?.long ? atkd.range.long : "",
				units: atkd.range?.units
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
			versatile: atkd.damage.versatile ? {
				text: this.formatAttackAndDamage(attack, "v", atkd.damage.parts[0]),
				formula: this.damageFormula(attack, "v")
			} : false,
			damage: this.dealsDamage(attack) ? atkd.damage.parts.map((part, i) => {
				return {
					text: this.formatAttackAndDamage(attack, i, part),
					formula: this.damageFormula(attack, i)
				}
			}) : []
		}
	}
	formatAttackAndDamage(attack, i, part) {
		return game.i18n.format("MOBLOKS5E.AttackDamageTemplate", {
			average: this.averageDamage(attack, i),
			formula: this.damageFormula(attack, i),
			type: game.i18n.localize(
				"DND5E.Damage" + part[1].replace(/./, l => l.toUpperCase())
			).toLowerCase()
		});
	}

	getAttackType(attack) {
		return CONFIG.DND5E.itemActionTypes[attack?.data?.data?.actionType] || "";
	}
	isRangedAttack(attack) {
		return ["rwak", "rsak"].includes(attack.data.data?.actionType);
	}

	/**
	 * Extract the specified roll formula from the item
	 *
	 * @param {Item5e} attack - The attack item
	 * @param {number|string} [index=0] - The index of the rollable formula within the parts of the damage. If 'v', this referes tot he versitile damage formual.
	 * @return {string} A rollable formula 
	 * @memberof MonsterBlock5e
	 */
	getAttackFormula(attack, index=0) {
		const atkd = attack.data.data;
		return index == "v" ?						// Versitile formula is index 'v'
				atkd?.damage?.versatile				
			:
				atkd?.damage?.parts?.length > 0 ?
					atkd?.damage?.parts[index][0]
				: "0";
	}
	averageDamage(attack, index=0) {
		return MonsterBlock5e.averageRoll(this.getAttackFormula(attack, index), attack.getRollData());
	}

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

	/**
	 *
	 *
	 * @param {boolean} success - Whether or not the roll was a success.
	 * @param {Event} event - The event object associated with this roll.
	 * @memberof MonsterBlock5e
	 */
	async setCharged(success, event) {
		await this.sheet.actor.updateEmbeddedEntity("OwnedItem", {
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
				this.prepResources(spell, this.sheet.object.items.get(spell._id));
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
}