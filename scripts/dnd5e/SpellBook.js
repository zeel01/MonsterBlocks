import Helpers from "./Helpers5e.js";
import { debug, getTranslationArray } from "../utilities.js";
import ItemPreper from "./ItemPreper.js";
import * as Templates from "./templates.js";

/**
 * @typedef {import("../../../../systems/dnd5e/module/item/sheet.js").Item5e} Item5e
 */
/** 
 * @typedef {import("./MonsterBlock5e.js").MonsterBlock5e} MonsterBlock5e
 */
/**
 * @typedef {("always"|"atwill"|"innate"|"pact"|"prepared")} PrepMode
 */
/**
 * @typedef {object} PageIdentity
 * @property {PrepMode} mode - The mode of the page
 * @property {number} level - The level of the page
 * @property {number} uses - The maximum number of uses of the page
 */

export default class SpellBook {
	/**
	 * Create a new spellbook from the pages of an existing one
	 *
	 * @static
	 * @param {SpellBook} book
	 * @param {Object<string, SpellPage>} pages
	 * @return {*} 
	 * @memberof SpellBook
	 */
	static fromPages(book, pages, type) {
		return new SpellBook(book.sheet, [].concat(...Object.values(pages).map(page => page.spells)), pages, type);
	}

	static getPrepared(book) {
		const entries = book.pageEntries;
		const pages   = entries.filter(([name, page]) => page.isPrepared);

		if (book.hasAtWillSpells && !book.hasInnateSpells) {
			const will = entries.find(([name, page]) => page.isAtWill);
			if (will) pages.push(will);
		}

		return this.fromPages(book, Object.fromEntries(pages), "prepared");
	}
	static getInnate(book) {
		const entries = book.pageEntries;
		const pages = entries.filter(([name, page]) => page.isInnate || page.isAtWill);
		return this.fromPages(book, Object.fromEntries(pages), "innate");
	}
	static getPact(book) {
		const entries = book.pageEntries;
		const pages = entries.filter(([name, page]) => page.isPact);

		if (!book.hasPreparedSpells) {
			const cantrips = entries.find(([name, page]) => page.isCantrip)
			if (cantrips) pages.push(cantrips);
		}

		return this.fromPages(book, Object.fromEntries(pages), "pact");
	}

	/**
	 * Creates an instance of SpellBook.
	 * @param {MonsterBlock5e} sheet - The sheet instance
	 * @param {Item5e[]} items - All the items in the spellbook
	 * @param {Object<string, SpellPage>} pages - Pages from another spellbook
	 * @memberof SpellBook
	 */
	constructor(sheet, items, pages, type) {
		/** 
		 * @type {MonsterBlock5e} The sheet this spellbook is for. 
		 */
		this.sheet = sheet;
		this.items = items;

		if (!pages) this.fillPages();
		else this.pages = pages;
	}

	/** @type {Object<string, SpellPage>} */
	pages = {};

	/**
	 * Whether or not this book has been used 
	 * @type {boolean} 
	 */
	shown = false;

	/**
	 * A spellcasting feature associated with this book
	 * @type {Item5e}
	 */
	feature = null;

	get pageEntries() {
		return Object.entries(this.pages);
	}
	get pageValues() {
		return Object.values(this.pages);
	}

	fillPages() {
		this.items.forEach(this.processItem.bind(this));
	}

	processItem(item) {
		const mode  = item.data.preparation.mode;
		const level = item.data.level;
		const uses  = item.data.uses.max;

		const page = this.getOrCreatePage({ mode, level, uses });

		page.add(item);
	}

	getOrCreatePage(pageIdent) {
		const name = SpellPage.getPageName(pageIdent);
		return this.pages[name] || (this.pages[name] = new SpellPage(pageIdent));
	}

	get hasPreparedSpells() {
		return this.pageValues.some(page => page.isPrepared);
	}
	get hasAtWillSpells() {
		return this.pageValues.some(page => page.isAtWill);
	}
	get hasInnateSpells() {
		return this.pageValues.some(page => page.isInnate);
	}
	get hasPactSpells() {
		return this.pageValues.some(page => page.isPact);
	}

	getPrepared() {
		return this.constructor.getPrepared(this);
	}
	getInnate() {
		return this.constructor.getInnate(this);
	}
	getPact() {
		return this.constructor.getPact(this);
	}
}

export class SpellPage {
	/**
	 * @static
	 * @param {PageIdentity} pageIdent
	 * @return {string} 
	 * @memberof SpellPage
	 */
	static getPageName({ mode, level, uses }) {
		if (this.isPact(mode) && this.isCantrip(level)) return "p0";
		if (this.isPrepared(mode)) return `l${level}`;
		if (this.isInnate(mode)) return `u${uses}`;
		if (this.isPact(mode)) return `pact`;
		if (this.isAtWill(mode, uses)) return `will`;

		throw("The specified spell page is not valid");
	}

	/**
	 * @static
	 * @param {PageIdentity} pageIdent
	 * @return {string} 
	 * @memberof SpellPage
	 */
	static getPageLabel({ mode, level, uses }) {
		if (this.isPact(mode) && this.isCantrip(level)) return "MOBLOKS5E.Spellcasting.CantripPl";
		if (this.isPrepared(mode)) return `${level}th level`;
		if (this.isInnate(mode)) return `${uses}/day`;
		if (this.isPact(mode)) return `levels 1-${level}`;
		if (this.isAtWill(mode, uses)) return "MOBLOKS5E.Spellcasting.AtWill";

		throw("The specified spell page is not valid");
	}

	static isPrepared(mode) {
		return mode === "prepared" || mode === "always"
	}
	static isPact(mode) {
		return mode === "pact";
	}
	static isInnate(mode) {
		return mode === "innate";
	}
	static isAtWill(mode, uses) {
		return mode === "atwill" || (this.isInnate(mode) && uses === 0);
	}
	static isCantrip(level) {
		return level === 0;
	}

	/**
	 * 
	 * @param {PageIdentity} pageIdent
	 */
	constructor({ mode, level, uses }={}) {
		/**  
		 * The spell preperation mode for this page 
		 * @type {PrepMode} 
		 */
		this.mode  = CONFIG.DND5E.spellPreparationModes[mode] ? mode : "innate";
		/**  
		 * The spell level for this page 
		 * @type {number} 
		 */
		this.level = level || 0;
		/**  
		 * The maximum number of uses for spells in this page
		 * @type {number} 
		 */
		this.uses  = uses  || 0;
	}

	/** 
	 * All of the spells on this page
	 * @type {Item5e[]} 
	 */
	spells = [];

	/**
	 * Whether or not this page has been used 
	 * @type {boolean} 
	 */
	shown = false;

	get name() {
		return this.constructor.getPageName(this);
	}
	get label() {
		return game.i18n.localize(this.constructor.getPageLabel(this));
	}

	get isInnate() {
		return this.constructor.isInnate(this.mode);
	}
	get isPrepared() {
		return this.constructor.isPrepared(this.mode);
	}
	get isPact() {
		return this.constructor.isPact(this.mode);
	}
	get isAtWill() {
		return this.constructor.isAtWill(this.mode, this.uses);
	}
	get isCantrip() {
		return this.constructor.isCantrip(this.mode, this.level);
	}

	get any() {
		return this.spells.length > 0;
	}

	get spellCount() {
		return this.spells.length;
	}

	/**
	 * Add a spell to this page
	 *
	 * @param {Item5e} spells
	 * @memberof SpellPage
	 */
	add(...spells) {
		this.spells.push(...spells);
	}
}