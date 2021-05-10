/**
 * @typedef FlagDetails
 * @property {typeof Object} type     - The data type of the flag/setting
 * @property {any}           default  - The default value of the flag  
 * @property {Boolean}       hidden   - True if this flag should not be a configurable setting
 * @property {string}       [setting] - Optionally specify an alternative name for this flag's setting
 */

export default class Flags {
	static get scope() { return "monsterblock"; }

	/**
	 * The details of each flag/setting 
	 *
	 * @type {Object<string, FlagDetails>}
	 * @readonly
	 * @static
	 * @memberof Flags
	 */
	static get flagDefaults() {
		return {
			"inline-secrets"    : { type: Boolean, default: false    , hidden: false },
			"hidden-secrets"    : { type: Boolean, default: false    , hidden: false },
			"hide-profile-image": { type: Boolean, default: false    , hidden: false },
			"theme-choice"      : { type: String , default: "default", hidden: true, setting: "default-theme" },
			"custom-theme-class": { type: String , default: ""       , hidden: false },
			"editing"           : { type: Boolean, default: true     , hidden: false },
			"compact-window"    : { type: Boolean, default: false    , hidden: false },
			"compact-feats"     : { type: Boolean, default: false    , hidden: false },
			"compact-layout"    : { type: Boolean, default: false    , hidden: false },
			"show-delete"       : { type: Boolean, default: false    , hidden: true  },
			"font-size"         : { type: Number , default: 14       , hidden: false },
			"scale"             : { type: Number , default: 1        , hidden: true  }
		}
	}

	/**
	 * The default values of all flags
	 *
	 * @type {Object<string, any>}
	 * @readonly
	 * @static
	 * @memberof Flags
	 
	static get defaultFlags() {
		if (!this._defaultFlags) this._defaultFlags = new Proxy(this, {
			get: function(Flags, flag) {
				const details = Flags.flagDetails[flag];
				if (!details) return undefined;

				return duplicate(
					game.setting.get(Flags.scope, details.setting || flag)
					?? details.default
				);
			}
		});
		return this._defaultFlags;
	}*/

	static getFlag(flags, flag) {
		if (!(flag in this.flagDefaults)) return undefined;

		const setName = this.flagDefaults[flag]?.setting || flag;                    // The name of the setting containing this flag's default
		const hidden  = this.flagDefaults[flag]?.hidden;                             // Hidden means there is no setting registered
		const setting = hidden ? undefined : game.settings.get(this.scope, setName); // The value of the setting, undedfined if hidden
		const def     = this.flagDefaults[flag]?.default;                            // The default or configured default value of this flag
		const initial = setting ?? def;                                              // The starting value of this flag if not defined on the actor

		if (flags.actor.compendium) return initial;                                  // If the actor is in a compendium, just use initial

		return flags.actor.getFlag(this.scope, flag) ?? initial;                     // Return the stored flag value, or initial
	}

	static setFlag(flags, flag, value) {
		if (!(flag in flags.constructor.flagDefaults)) return;
		if (flags.actor.compendium) return;
		
		return flags.actor.setFlag(flags.scope, flag, value);
	}

	/**
	 * Creates an instance of Flags.
	 *
	 * @param {MonsterBlock5e} sheet
	 * @memberof Flags
	 */
	constructor(sheet) {
		this.sheet = sheet;
		this.actor = sheet.actor;

		this.flags = new Proxy(this, {
			get: this.constructor.getFlag.bind(this.constructor),
			set: this.constructor.setFlag.bind(this.constructor)
		});
	}

	/**
	 * 
	 *
	 * @memberof Flags
	 */
	*allFlags() {
		for (let [name, details] of Object.entries(this.constructor.flagDefaults)) {
			yield { name, ...details, value: this.flags[name] }
		}
	}

/*	async prep() {
		if (this.actor.compendium) return;

		this.preparingFlags = false;

		if (!this.actor.getFlag(this.scope, "initialized")) {
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
			if (this.actor.getFlag(this.scope, flag) !== undefined) continue;

			changes = true;
			this.preparingFlags = true;
			await this.actor.setFlag(this.scope, flag, this.defaultFlags[flag]);
		}

		this.preparingFlags = false;
		return changes;
	}*/
}