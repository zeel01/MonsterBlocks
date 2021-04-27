
export class debug {
	static get level() {
		return window.DEV?.getPackageDebugValue("monsterblock", "level");
	}

	/**
	 * Returns whether or not the debug mode for Monster Blocks is enabled.
	 *
	 * @return {boolean} - True if debugging is enabled
	 */
	static get enabled() {
		return window.DEV?.getPackageDebugValue("monsterblock");
	}

	static get OFF()   { return this.level < 1; }
	static get INFO()  { return this.level > 0; }
	static get ERROR() { return this.level > 1; }
	static get DEBUG() { return this.level > 2; }
	static get WARN()  { return this.level > 3; }
	static get ALL()   { return this.level > 4; }
}

/* global InputAdapter:readonly */

export class ContentEditableAdapter extends InputAdapter {
	get value() {
		return this.element.innerText;
	}
	set value(val) {
		this.element.innerText = val;
	}
}