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
		return foundry.utils.mergeObject(super.flagDefaults, {
			"attack-descriptions": { type: Boolean, default: true  },
			"casting-feature"    : { type: Boolean, default: true  },
			"current-hit-points" : { type: Boolean, default: true  },
			"maximum-hit-points" : { type: Boolean, default: true  },
			"show-lair-actions"  : { type: Boolean, default: false },
			"show-not-prof"      : { type: Boolean, default: false },
			"show-resources"     : { type: Boolean, default: true  },
			"show-skill-save"    : { type: Boolean, default: true  },
			"show-bio"           : { type: Boolean, default: false, hidden: true  }
		});
	}
}
