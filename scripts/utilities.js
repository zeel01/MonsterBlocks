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

export function getTranslationArray(stringId) {
	let v = foundry.utils.getProperty(game.i18n.translations, stringId);
	if (v) return typeof v == "string" ? [v] : v;

	v = foundry.utils.getProperty(game.i18n._fallback, stringId);
	if (v) return typeof v === "string" ? [v] : v;

	return [stringId];
}

export function getSetting(scope, name) {
	try {
		return game.settings.get(scope, name);
	}
	catch (e) {
		return null;
	}
}

export function isDndV4OrNewer() {
	return foundry.utils.isNewerVersion(game.system.version, "3.9");
}

/**
 * Included From Foundry VTT FormDataExtended#castType
 * Used under the Limited License Agreement for Module Development
 * @see https://foundryvtt.com/article/license/
 * No other license is granted for this code.
 */

/**
 * Cast a processed value to a desired data type.
 * @param {any} value         The raw field value
 * @param {string} dataType   The desired data type
 * @returns {any}             The resulting data type
 * @private
 */
export function castType(value, dataType) {
	if (value instanceof Array) return value.map(v => castType(v, dataType));
	if ([undefined, null].includes(value) || (dataType === "String")) return value;

	// Boolean
	if (dataType === "Boolean") {
		if (value === "false") return false;
		return Boolean(value);
	}

	// Number
	else if (dataType === "Number") {
		if ((value === "") || (value === "null")) return null;
		return Number(value);
	}

	// Serialized JSON
	else if (dataType === "JSON") {
		return JSON.parse(value);
	}

	// Other data types
	if (window[dataType] instanceof Function) {
		try {
			return window[dataType](value);
		} catch (err) {
			console.warn(`The form field value "${value}" was not able to be cast to the requested data type ${dataType}`);
		}
	}
	return value;
}

/** End of Foundry VTT Code */