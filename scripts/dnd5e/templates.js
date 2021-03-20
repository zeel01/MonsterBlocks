/**
 * @typedef Option
 * @property {string}     value             - The data value of the option
 * @property {string}     label             - The display label of the option
 * @returns 
 *//**
 * Creates a <select> like menu that is fully stylable.
 *
 * @param {object}        args              - Arguments
 * @param {string?}       args.wrapperClass - Class name to add to the wrapper div
 * @param {string}        args.key          - The key for the select
 * @param {string}        args.value        - The current value of the select
 * @param {string?}       args.labelClass   - Class name to add to the label
 * @param {string}        args.label        - The label for the select
 * @param {string?}       args.listClass    - Class name to add to the ul
 * @param {Array<Option>} args.options      - Array of options
 * @param {Boolean}       args.enabled      - True if the options list should appear, false if only the label
 * @returns {string}                          Returns the HTML as a string
 */
export let selectField = ({
	wrapperClass="", key, value,
	labelClass="", label,
	listClass="", options, 
	enabled=true
}) => `\
<div class="select-field ${wrapperClass}"
	data-select-key="${key}"
	data-selected-value="${value}">
		<label class="${enabled ? "select-label" : ""} ${labelClass}">${label}</label>
	${ enabled ? 
		`<ul class="select-list ${listClass}">
		${ options.map(option => `\
			<li data-selection-value="${option.value}">${option.label}</li>
		`).reduce((a, v) => a + v)}
		</ul>`
	: ""}
</div>\
`;


/**
 * Creates a contenteditable input that can be styled like inline text
 * rather than a standard form <input>.
 *
 * @param {object}  args             - Arguments
 * @param {string}  args.key         - The key of the field being edited
 * @param {string?} args.className   - A class name for this field
 * @param {string?} args.dtype       - The type of filed (Text, Number)
 * @param {string?} args.placeholder - Placeholder text
 * @param {string?} args.value       - Current value
 * @param {string?} args.enabled     - Whether or not the field is editable
 * @returns {string}                   Returns the HTML as a string
 */
export let editable = ({
	key, className="", dtype="Text", placeholder="", value="", enabled=true
}) => `\
<span class="${className}"\
	contenteditable="${enabled}"\
	data-field-key="${key}"\
	data-dtype="${dtype}"\
	placeholder="${placeholder}">${value}</span>\
`;

/**
 * @typedef Item
 * @property {string} name           - The display name of the item
 * @property {string} id             - The _id of the item
 *//**
 * Creates a list of named items which may or may not be editable
 *
 * @param {object}    args                - Arguments
 * @param {string}    args.className      - The name of the class for this list
 * @param {Item[]}    args.items          - A set of items in the list
 * @param {string}    args.itemClass      - The class to put on each item li
 * @param {string}    args.itemLabelClass - The class to put on each item label span
 * @param {Boolean}   args.editing        - Whether or not the items can be deleted
 * @returns {string}
 */
export let itemList = ({
	className, items, itemClass, itemLabelClass, deletable
}) => `\
<ul class="${className}">
${ items.map(item => 
`<li class="${itemClass}" data-item-id="${item.id}">\
${ deletable ?
	`<a class="delete-item" data-item-id="${item.id}">\
		<i class="fa fa-trash"></i>\
	</a>`
: ""}<span class="${itemLabelClass}">${item.name}</span>\
</li>\
`).reduce((a, v) => a + v)}	
</ul>
`