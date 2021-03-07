/**
 * Returns whether or not the debug mode for Monster Blocks is enabled.
 *
 * @return {boolean} - True if debugging is enabled
 */
export function debugging() {
	return window.DEV?.getPackageDebugValue("monsterblock");
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