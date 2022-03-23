import { getSetting } from "./utilities.js";

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
			"inline-secrets"    : { type: Boolean, default: false },
			"hidden-secrets"    : { type: Boolean, default: false },
			"hide-profile-image": { type: Boolean, default: false },
			"use-token-image"   : { type: Boolean, default: false },
			"theme-choice"      : { type: String , default: "default", hidden: true, setting: "default-theme" },
			"custom-theme-class": { type: String , default: ""    },
			"editing"           : { type: Boolean, default: true  },
			"compact-window"    : { type: Boolean, default: false },
			"compact-feats"     : { type: Boolean, default: false },
			"compact-layout"    : { type: Boolean, default: false },
			"show-collapsible"  : { type: Boolean, default: false },
			"show-delete"       : { type: Boolean, default: false  , hidden: true  },
			"font-size"         : { type: Number , default: 14    },
			"scale"             : { type: Number , default: 1      , hidden: true  },
			"collapsed"         : { type: Object,  default: {}     , hidden: true  }
		}
	}

	/**
	 * Returns an object of all the flag keys with their settings as configured in the module
	 * settings menu.
	 *
	 * @memberof Flags
	 */
	static get defaultFlags() {
		return Object.fromEntries(
			Object.entries(this.flagDefaults).map(([name, details]) => [name, duplicate(
				getSetting(this.scope, details.setting || name)
				?? details.default
			)])
		);
	}

	static getFlag(flags, flag) {
		if (!(flag in this.flagDefaults)) return undefined;

		const setName = this.flagDefaults[flag]?.setting || flag;                    // The name of the setting containing this flag's default
		const hidden  = this.flagDefaults[flag]?.hidden && setName == flag;          // Hidden means there is no setting registered unless there is an alternate setting name
		const setting = hidden ? undefined : getSetting(this.scope, setName);        // The value of the setting, undedfined if hidden
		const def     = this.flagDefaults[flag]?.default;                            // The default or configured default value of this flag
		const initial = setting ?? def;                                              // The starting value of this flag if not defined on the actor

		if (flags.actor.compendium) return initial;                                  // If the actor is in a compendium, just use initial

		return flags.actor.getFlag(this.scope, flag) ?? initial;                     // Return the stored flag value, or initial
	}

	static setFlag(flags, flag, value) {
		if (!(flag in flags.constructor.flagDefaults)) return;
		if (flags.actor.compendium) return;
		
		return flags.actor.setFlag(this.scope, flag, value);
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
	
	toggle(name) {
		this.flags[name] = !this.flags[name];
	}
}