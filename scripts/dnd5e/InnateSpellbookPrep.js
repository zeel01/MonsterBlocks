import ResourcePreper from "./ResourcePreper.js";

export default class InnateSpellbookPrep {
	/**
	 * Creates an instance of InnateSpellbookPrep.
	 *
	 * @param {object} spellbook                            - The standard spellbook for the actor
	 * @param {import("./MonsterBlock5e.js").default} sheet - The Monster Block instance
	 * @memberof InnateSpellbookPrep
	 */
	constructor(spellbook, sheet) {
		this.spellbook = spellbook;
		this.sheet = sheet;
		this.book = [];
	}

	/**
	 * Find all the innate spells, prepare their resources, and sort them into pages by max uses.
	 *
	 * @return {object} The completed innate spellbook 
	 * @memberof InnateSpellbookPrep
	 */
	prepare() {                                              // We need to completely re-organize the spellbook for an innate spellcaster
		for (let level of this.spellbook) {                  // Spellbook is seperated into sections based on level, though all the innate spells are lumped together, we still want to check all the sections.
			if (level.prop !== "innate") continue;           // We don't care about sections that aren't marked as innate though
			this.prepareSpellLevel(level);
		}

		this.book.sort(this.constructor.pageSort);

		return this.book;
	}

	/**
	 * For a given level of spells, prepare those spell respurces and sort
	 * them into the book.
	 *
	 * @param {object} level - All spells of a given level from the original book
	 * @memberof InnateSpellbookPrep
	 */
	prepareSpellLevel(level) {
		for (let spell of level.spells) {
			this.prepSpellResource(spell);
			this.sortSpell(spell);
		}
	}

	/**
	 * Prepares the resource of a spell
	 *
	 * @param {object} spellData
	 * @memberof InnateSpellbookPrep
	 */
	prepSpellResource(spellData) {
		const spell = this.sheet.object.items.get(spellData._id);
		spellData.hasresource = ResourcePreper.hasResource(spell);
		if (!spellData.hasresource) return;
		
		spellData.resource = new ResourcePreper(
			spellData, spell, this.sheet
		).getResource();
	}

	/**
	 * Sorts the spell into the appropriate page of the new book.
	 *
	 * @param {object} spell
	 * @memberof InnateSpellbookPrep
	 */
	sortSpell(spell) {
		// Max uses is what we are going to end up sorting the spellbook by.
		this.getPage(spell.system.uses.max).spells.push(spell);
	}

	/**
	 * Finds or creates a page in the new spellbook for spells with a 
	 * certain number of maximum uses.
	 *
	 * @param {number} uses - The maximum number of uses that all spells on this page have
	 * @return {object}       The spellbook page 
	 * @memberof InnateSpellbookPrep
	 */
	getPage(uses) {
		return this.book.find(page => page.uses == uses) // Find the page
			|| this.addPage(uses);                       // Or add a new one
	}
	/**
	 * Creates a new empty page for the spellbook.
	 *
	 * Most of this is just intended to match the 
	 * data in the regular spell book, though most 
	 * isn't ultimately going to be used.
	 *
	 * @param {number} uses - The maximum number of uses that all spells on this page have
	 * @return {object}       The spellbook page
	 * @memberof InnateSpellbookPrep
	 */
	addPage(uses) {
		const page = {
			canCreate: false,
			canPrepare: false,
			dataset: { level: -10, type: "spell" },
			// This is important, as this string will be used to display on the sheet.
			label: uses < 1 ? "At will" : (uses + "/day"),
			order: -10,
			override: 0,
			prop: "innate",
			slots: "-",
			spells: [],      // An empty array to put spells in later.
			uses: uses,      // How we will identify this type of spell later, rather than by spell level.
			usesSlots: false
		}
		this.book.push(page);
		return page;
	}

	/**
	 * A sorting function for {@link Array.prototype.sort}
	 *
	 * Orders pages a and b descending by number of uses,
	 * but sorts a page with 0 (unlimited) uses to the start.
	 *
	 * @static
	 * @param {object} a - A spellbook page
	 * @param {object} b - A spellbook page
	 * @return {number}    The order to sort the twoo pages @see Array.prototype.sort
	 * @memberof InnateSpellbookPrep
	 */
	static pageSort(a, b) {
		if (a.uses == 0 && b.uses == 0) return 0;
		if (a.uses == 0) return -1;
		if (b.uses == 0) return 1;

		return a.uses < b.uses ? 1 : -1;
	}
}