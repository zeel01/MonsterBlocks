/**
 * A base class for items that might be in a menu
 * 
 * @class MenuItem
 */
export class MenuItem {
	/**
	 * Creates an instance of MenuItem.
	 *
	 * @param {String} type - The type of item
	 * @param {Object} [data={}] - An object of data maintained by the menu item.
	 * @param {function} updateFn  - A function used to update any data that might need changed on render
	 * @memberof MenuItem
	 */
	constructor(type, data = {}, updateFn) {
		this.type = type;
		Object.assign(this, data);

		this.update = updateFn ?? (() => false);
	}
}
/**
 * A class to handle interactve menus
 *
 * @class MenuTree
 * @extends {MenuItem}
 */
export class MenuTree extends MenuItem {
	/**
	 * Creates an instance of MenuTree.
	 * @param {MonsterBlock5e} monsterblock - The object representing the sheet itself
	 * @param {string} id - A unique identifier for this menu
	 * @param {string} label - The text of the label, doubles as the button for open/close clicks
	 * @param {MenuTree|false} parent - A reference to the parent menu, or false if this menu is the root
	 * @param {function} updateFn - A function used to update any data that might need changed on render
	 * @param {string} auxSelect - A selector for an auxilary element to toggle a class on
	 * @param {string} auxClass - A class to toggle on the auxilary element
	 * @param {Boolean} visible - Set the initial state of visible or not
	 * @param {JQuery} element - Set the jQuery object for the HTML element associated with this menu
	 * @param {MenuItem[]} children - An array of items in this menu
	 * @memberof MenuTree
	 */
	constructor(monsterblock, id, label, parent, updateFn, auxSelect, auxClass, visible, element, children) {
		let fn = updateFn ?? (() => false);
		super(parent ? "sub-menu" : "root-menu", {}, (m, ...args) => {
			fn(m, ...args);
			this.children.forEach(c => c.update(c, ...args));
		});

		this.auxSelect = auxSelect ?? false;
		this.auxClass = auxClass ?? "";
		this.id = id;
		this.monsterblock = monsterblock;
		this.parent = parent ?? false;
		this.label = label;
		this.visible = visible ?? false;
		this._element = element ?? false;
		this.children = children ?? [];
	}
	get element() {
		return this.button.parent();
	}
	get button() {
		return this.monsterblock._element.find(`[data-menu-id=${this.id}]`);
	}
	get auxElement() {
		if (!this.auxSelect) return false;
		return this.monsterblock._element.find(this.auxSelect);
	}
	attachHandler() {
		this.button.click(() => {
			if (!this.visible) this.open();
			else this.close();
		});
	}
	open() {
		if (this.visible) return;
		if (this.parent) this.parent.closeChildren();
		this.element.addClass("menu-open");
		if (this.auxElement) this.auxElement.addClass(this.auxClass);
		this.visible = true;
	}
	close() {
		if (!this.visible) return;
		this.element.removeClass("menu-open");
		if (this.auxElement) this.auxElement.removeClass(this.auxClass);
		this.visible = false;
		this.closeChildren();
	}
	closeChildren() {
		this.children.forEach(m => { if (m.type == "sub-menu") m.close() });
	}
	add(item) {
		this.children.push(item);
	}
}