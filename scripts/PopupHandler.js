/**
 * A class to handle the sizing of a popup box like a character sheet.
 *
 * @class PopupHandler
 */
export class PopupHandler {
	/**
	 * Creates an instance of PopupHandler.
	 * @param {Application} application - A reference to an application such as a character sheet
	 * @param {selector} layoutselector - A CSS style selector that selects the main container for the layout
	 * @param {number} defaultWidth - The starting width of the popup
	 * @param {number} defaultHeight - The starting height of the popup
	 * @param {number} padding - The padding around the popup content
	 * @param {number} scale - The CSS transform scale to set on this sheet
	 * @memberof PopupHandler
	 */
	constructor(application, layoutselector, defaultWidth, defaultHeight, padding, scale) {
		this.application = application;
		this.padding = padding;
		this.element = application.element;
		this._height = defaultHeight;
		this._width = defaultWidth;
		this._scale = scale;
		
		this.width = this._width;	// Actually set the width and height to the default values,
		this.height = this._height;	// allowing the column layout to correctly set the number of columns needed.
		
		let flexcol = this.element.find(layoutselector)[0];
		this.layout = Array.from(	// Converting to an array because it has so many useful methods.
			flexcol.children		// All children of the column layout, which is the form.flexcol
		);
	}
	
	// These set both the real height of the element (adding the "px" unit because it's a CSS property) and the stored numeric value
	set height(h) {
		this._height = h;
		this.element.css("height", h + "px");
		this.position.height = h;
	}
	set width(w) {
		this._width = w;
		this.element.css("width", w);
		this.position.width = this.computedWidth;
	}
	
	get height() { return this._height; }
	get width() { return this._width; }
	get computedWidth() { return parseFloat(window.getComputedStyle(this.element[0]).width); }
	get position() { return this.application.position; }
	

	/**
	 * Returns the largest offset from the left side of the layout 
	 * that any element's right edge has (this is the maximum width of the layout).
	 * 
	 * @readonly
	 * @memberof PopupHandler
	 */
	get layoutWidth() {											
		return this.layout.reduce((width, el) => {						// Iterate over all the children of the layout, searching for the one with a right edge furthest from 0
			let right = el.offsetLeft + el.getBoundingClientRect().width;	// The left edge offset of the element, plus the width, is the right edge offset
			return right > width ? right : width;							// If this element has a right side further from 0 than the previous record, its offset is the new record.
		}, this.computedWidth); //391
	}
	/**
	 * Returns the greatest offset from the top of the layout
	 * of any element's bottom (this is the maximum height of the layout).
	 *
	 * @readonly
	 * @memberof PopupHandler
	 */
	get layoutHeight() {													
		let top = this.element[0].getBoundingClientRect().top;			// Find the offset of the top of the bounding element from the top of the displayport
		return this.layout.reduce((height, el) => {					// Iterate over all the children, looking for the one with the lowest bottom
			let bottom = el.getBoundingClientRect().bottom - top;	// The bottom of the bounding rectangle is the *real* lowest point of the rendered element, even if the element is split between multiple columns. This is relative to the displayport though, so it needs corrected by the offest of the wrapper's top.
			return bottom > height ? bottom : height;				// If this element's bottom is lower than the record, the record is updated.
		}, 46);
	}

	getWidthCSSString(columns) {
		const gaps = columns - 1;
		const gap = gaps ? `+ var(--column-gap) * ${gaps}` : ""

		return `
			calc(
				var(--column-width) * ${columns}
				${gap}
				+ var(--window-padding) * 2
			)
		`
	}
	
	fix() {
		this.element.css("transform", "");

		this.fixWidth();	// Width needs corrected first, so that the column layout will expand and balance correctly.
		this.fixHeight();	// Once the layout is balanced, we can correct the height to match it.
		
		if (this.position.default) this.fixPos();
		if (this._scale != 1) this.element.css("transform", `scale(${this._scale})`);
	}
	
	// The following simply add the calculated layout dimensions to the padding, and set the wrapper to that size
	fixWidth() {
		this.element.css("width", this.getWidthCSSString(1));
		const baseWidth = parseFloat(window.getComputedStyle(this.element[0]).width) - this.padding;
		const columns = parseInt(this.layoutWidth / baseWidth, 10);
		this.width = this.getWidthCSSString(columns);
	}
	fixHeight() {
		this.height = this.layoutHeight + this.padding;
	}
	
	fixPos() {
		this.fixLeft();
		this.fixTop();
		
		this.position.default = false;
	}
	fixLeft() {
		let dw = this.computedWidth - this.application.options.width;
		let left = dw / 2;
		this.position.left -= left;
		this.element.css("left", this.position.left + "px");
	}
	fixTop() {
		let dh = this.height - this.application.options.height;
		let top = dh / 2;
		this.position.top -= top;
		this.element.css("top", this.position.top + "px");
	}
}