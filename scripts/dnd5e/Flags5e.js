import Flags from "../Flags.js";

export default class Flags5e extends Flags {
	/**
	 * @inheritdoc
	 * @type {Object<string, FlagDetails>}
	 * @readonly
	 * @static
	 * @memberof Flags5e
	 */
	static get flagDefaults() {
		return mergeObject(super.flagDefaults, {
			"attack-descriptions": { type: Boolean, default: true , hidden: false },
			"casting-feature"    : { type: Boolean, default: true , hidden: false },
			"current-hit-points" : { type: Boolean, default: true , hidden: false },
			"maximum-hit-points" : { type: Boolean, default: true , hidden: false },
			"show-lair-actions"  : { type: Boolean, default: false, hidden: false },
			"show-not-prof"      : { type: Boolean, default: false, hidden: false },
			"show-resources"     : { type: Boolean, default: true , hidden: false },
			"show-skill-save"    : { type: Boolean, default: true , hidden: false },
			"show-bio"           : { type: Boolean, default: false, hidden: false }
		});
	}	
}
