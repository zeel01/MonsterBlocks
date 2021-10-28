import { InputAdapter } from "../input-expressions/handler.js"
export class debug {
	
	/**
	 * The current debug level setting for this module.
	 *
	 * @readonly
	 * @static
	 * @memberof debug
	 */
	static get level() {
		return game.modules.get("_dev-mode")?.api?.getPackageDebugValue("monsterblock", "level") ?? 0;
	}

	/**
	 * Whether or not the debug mode for Monster Blocks is enabled.
	 *
	 * @return {boolean} - True if debugging is enabled
	 */
	static get enabled() {
		return this.level > 0;
	}

	static get OFF()   { return this.level < 1; }
	static get INFO()  { return this.level > 0; }
	static get ERROR() { return this.level > 1; }
	static get DEBUG() { return this.level > 2; }
	static get WARN()  { return this.level > 3; }
	static get ALL()   { return this.level > 4; }
}

export class ContentEditableAdapter extends InputAdapter {
	get value() {
		return this.element.innerText;
	}
	set value(val) {
		this.element.innerText = val;
	}
}