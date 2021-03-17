import Helpers from "./Helpers5e.js";
import { debugging } from "../utilities.js";
import ItemPreper from "./ItemPreper.js";
import * as Templates from "./templates.js";

export default class CastingPreper extends ItemPreper {
	static isCasting(item) {
		return this.isSpellcasting(item) || this.isInnateSpellcasting(item);
	}
	static isSpellcasting(item) {
		const name = item.name.toLowerCase().replace(/\s+/g, "");
		return !this.isInnateSpellcasting(item) &&
			game.i18n.localize("MOBLOKS5E.SpellcastingLocators").some(loc => name.includes(loc));
	}
	static isInnateSpellcasting(item) {
		const name = item.name.toLowerCase().replace(/\s+/g, "");
		return game.i18n.localize("MOBLOKS5E.InnateCastingLocators").some(loc => name.includes(loc));
	}
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
	 * @memberof CastingPreper
	 */
	cts = {
		standard: Symbol("Standard Spellcasting"),
		innate: Symbol("Innate Spellcasting"),
		pact: Symbol("Pact Macgic")
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
		this.data.spellbook = this.reformatSpellbook(this.templateData);

		[this.abilityTitle, this.castingAbility] = this.getCastingAbility();
		this.tohit = this.getSpellAttackBonus();

		this.data.description =  this.getCastingFeatureDescription();

		if (debugging()) console.debug(this);
	}


	/**
	 * Retuns the formatted spellbook data for the associated casting feature
	 *
	 * @return {Object} The spellbook object
	 * @memberof MonsterBlock5e
	 */
	reformatSpellbook() {
		return this.ct == this.cts.innate ?
			this.filterInnateSpellbook() :
			this.filterSpellbook();
	}

	/**
	 * Filters and adds additional data for displaying the spellbook
	 *
	 * @return {Object} The spellbook object
	 * @memberof MonsterBlock5e
	 */
	filterSpellbook() {
		return this.templateData.spellbook.filter(page => {
			if (   (this.ct == this.cts.pact && !(page.order == 0.5 || page.order == 0))	// Pact magic is only "0.5" and cantrips
				|| (page.order == -20)											// Don't bother with at-will.
				|| (this.ct != this.cts.innate && page.order == -10)						// Only innate has -10
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
					level: this.ct == this.cts.pact ?
						`${Helpers.formatOrdinal(1)}-${Helpers.formatOrdinal(page.maxSpellLevel)}` :
						Helpers.formatOrdinal(page.maxSpellLevel)
				});
				page.slotKey = `data.spells.${this.ct == this.cts.pact ? "pact" : `spell${page.maxSpellLevel}`}`
				page.slotLabel = game.i18n.format(this.ct == this.cts.pact ?
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
	 * @return {Object} The spellbook object
	 * @memberof MonsterBlock5e
	 */
	filterInnateSpellbook() {
		return this.templateData.innateSpellbook.filter(page => {
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
	 * @return {Object} An object containing translated and filled sections of the casting feature description
	 * @memberof MonsterBlock5e
	 */
	getCastingFeatureDescription() {
		const casterLevel = this.sheet.actor.data.data?.details?.spellLevel ?? 0;
		const suffix = Helpers.getOrdinalSuffix(casterLevel);
		let abilityOptions = Object.entries(CONFIG.DND5E.abilities).reduce((acc, [key, value]) => {
			if (key == this.castingAbility) return acc;
			return acc + `<li data-selection-value="${key}">${value}</li>`
		}, "")

		return {
			level: this.ct == this.cts.innate ? "" : game.i18n.format("MOBLOKS5E.CasterNameLevel", {
				name: this.sheet.actor.name,
				level: Templates.editable({
					key: "data.details.spellLevel",
					value: this.casterLevel,
					className: "caster-level",
					dtype: "Number",
					placeholder: "0",
					enabled: this.sheet.flags.editing
				})
			}),
			ability: game.i18n.format(
				this.ct == this.cts.innate ? "MOBLOKS5E.InnateCastingAbility" : "MOBLOKS5E.CastingAbility", {
				name: this.sheet.actor.name,
				ability: `
				<div class="select-field" data-select-key="data.attributes.spellcasting" data-selected-value="${this.castingAbility}">
					<label class="${this.sheet.flags.editing ? "select-label" : ""}">${this.abilityTitle}</label>
					${this.sheet.flags.editing ? `<ul class="actor-size select-list">${abilityOptions}</ul>`: ""}
				</div>`
			}
			),
			stats: game.i18n.format("MOBLOKS5E.CastingStats", {
				savedc: this.sheet.actor.data.data?.attributes?.spelldc,
				bonus: `${this.tohit > -1 ? "+" : ""}${this.tohit}`
			}),
			warlockRecharge: this.ct == this.cts.pact ? game.i18n.localize("MOBLOKS5E.WarlockSlotRegain") : "",
			spellintro: game.i18n.format({
				[this.cts.standard]: "MOBLOKS5E.CasterSpellsPreped",
				[this.cts.pact]: "MOBLOKS5E.WarlockSpellsPreped",
				[this.cts.innate]: "MOBLOKS5E.InnateSpellsKnown"
			}[this.ct], {
				name: this.sheet.actor.name,
				atwill: this.data.hasAtWill ? game.i18n.format("MOBLOKS5E.CasterAtWill", {
					spells: this.templateData.spellbook.find(l => l.prop === "atwill")?.spells?.reduce((list, spell) => {
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