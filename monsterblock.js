import MonsterBlock5e from "./scripts/dnd5e/MonsterBlock5e.js";
import { debug } from "./scripts/utilities.js";
import PopupHandler from "./scripts/PopupHandler.js"
import Flags5e from "./scripts/dnd5e/Flags5e.js";

Hooks.once("init", () => {
	Handlebars.registerHelper(MonsterBlock5e.handlebarsHelpers); // Register all the helpers needed for Handlebars
	
	/* global inputExprInitHandler:readonly */
	inputExprInitHandler();

	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.once("ready", () => {
	MonsterBlock5e.getTokenizer();
	MonsterBlock5e.getQuickInserts();
	
	MonsterBlock5e.preLoadTemplates();
	
	if (debug.INFO) console.debug("Monster Blocks | Registering Settings");

	Object.entries(Flags5e.flagDefaults)
		.filter(([n, d]) => !d.hidden)
		.forEach(([name, details]) =>
			game.settings.register(Flags5e.scope, details.setting || name, {
				name: game.i18n.localize(`MOBLOKS5E.${name}.settings.name`),
				hint: game.i18n.localize(`MOBLOKS5E.${name}.settings.hint`),
				scope: "world",
				config: true,
				type: details.type,
				default: details.default
			}
		)
	);

	game.settings.register("monsterblock", "max-height-offset", {
		name: game.i18n.localize("MOBLOKS5E.max-height-offset.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.max-height-offset.settings.hint"),
		scope: "world",
		config: true,
		type: Number,
		range: {
			min: 0,
			max: 670,
			step: 1
		},
		default: 72
	});
	
	let themeChoices = {};
	for (let theme in MonsterBlock5e.themes) 
		themeChoices[theme] = 
			game.i18n.localize(MonsterBlock5e.themes[theme].name);

	game.settings.register("monsterblock", "default-theme", {
		name: game.i18n.localize("MOBLOKS5E.default-theme.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.default-theme.settings.hint"),
		scope: "world",
		config: true,
		type: String,
		choices: themeChoices,
		default: "default"
	});
});

// This is how the box sizing is corrected to fit the statblock
// eslint-disable-next-line no-unused-vars
Hooks.on("renderMonsterBlock5e", (monsterblock, html, data) => {	// When the sheet is rendered
	if (debug.INFO)  console.log("Monster Block | Rendering sheet");
	if (debug.DEBUG) console.debug(`Monster Block |`, monsterblock, html, data);

	if (html.parent().hasClass("grid-cell-content")) return;

	let popup = new PopupHandler(
		monsterblock, 	// The Application window
		"form.flexcol",
		monsterblock.options.width,													// From default options
		window.innerHeight - game.settings.get("monsterblock", "max-height-offset"),	// Configurable offset, default is 72 to give space for the macro bar and 10px of padding.
	//	(window.innerHeight - game.settings.get("monsterblock", "max-height-offset")) * (1 / monsterblock.flags.scale),	// Configurable offset, default is 72 to give space for the macro bar and 10px of padding.
		8,
		monsterblock.flags.scale																				// The margins on the window content are 8px
	);
	popup.fix();
});

Hooks.on("renderActorSheet5eNPC", (sheet) => {
	if (sheet.constructor.name != "ActorSheet5eNPC") return;

	if (debug.INFO) console.log("Monster Block | Adding cog menu to standard sheet");
	let nav = document.createElement("nav");
	nav.innerHTML = `
		<i class="fas fa-cog"></i>
		<ul>
			<li>
				<a class="trigger" data-control="switchToMonsterBlock">${game.i18n.localize("MOBLOKS5E.SwitchToMobloks")}</a>
			</li>
		</ul>
	`;
	nav.classList.add("switches");

	sheet.element.find(".window-content .editable").append(nav);
	
	nav.addEventListener("click", async () => {
		await sheet.close();
		await sheet.actor.setFlag("core", "sheetClass", "dnd5e.MonsterBlock5e");
		return sheet.actor.sheet.render(true)
	});
});

Actors.registerSheet("dnd5e", MonsterBlock5e, {
    types: ["npc"],
    makeDefault: false,
	label: "MOBLOKS5E.MonsterBlocks"
});

Hooks.on("renderActorSheet", () => {	// This is just for debugging, it prevents this sheet's template from being cached.
	if (!debug.enabled) return; 
	window._templateCache = [];
});

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag("monsterblock", "level");
	if (debug.INFO) console.log(`Monster Block | Debug level: ${debug.level}`);
});