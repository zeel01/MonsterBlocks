import MonsterBlock5e from "./scripts/dnd5e/MonsterBlock5e.js";
import  { debugging } from "./scripts/utilities.js";
import PopupHandler from "./scripts/PopupHandler.js"

Hooks.once("init", () => {
	Handlebars.registerHelper(MonsterBlock5e.handlebarsHelpers); // Register all the helpers needed for Handlebars
	
	/* global inputExprInitHandler:readonly */
	inputExprInitHandler();

	console.log(`Monster Block | %cInitialized.`, "color: orange");
});

Hooks.once("ready", () => {
	MonsterBlock5e.getTokenizer();
	MonsterBlock5e.getQuickInserts();
	
	/*if (!debugging())*/ MonsterBlock5e.preLoadTemplates();
	
	game.settings.register("monsterblock", "attack-descriptions", {
		name: game.i18n.localize("MOBLOKS5E.attack-description-name"),
		hint: game.i18n.localize("MOBLOKS5E.attack-description-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "casting-feature", {
		name: game.i18n.localize("MOBLOKS5E.casting-feature-name"),
		hint: game.i18n.localize("MOBLOKS5E.casting-feature-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "inline-secrets", {
		name: game.i18n.localize("MOBLOKS5E.inline-secrets-name"),
		hint: game.i18n.localize("MOBLOKS5E.inline-secrets-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "hidden-secrets", {
		name: game.i18n.localize("MOBLOKS5E.hidden-secrets-name"),
		hint: game.i18n.localize("MOBLOKS5E.hidden-secrets-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "hide-profile-image", {
		name: game.i18n.localize("MOBLOKS5E.hide-profile-image-name"),
		hint: game.i18n.localize("MOBLOKS5E.hide-profile-image-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "show-lair-actions", {
		name: game.i18n.localize("MOBLOKS5E.show-lair-actions-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-lair-actions-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "current-hit-points", {
		name: game.i18n.localize("MOBLOKS5E.current-hit-points-name"),
		hint: game.i18n.localize("MOBLOKS5E.current-hit-points-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "maximum-hit-points", {
		name: game.i18n.localize("MOBLOKS5E.maximum-hit-points-name"),
		hint: game.i18n.localize("MOBLOKS5E.maximum-hit-points-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "editing", {
		name: game.i18n.localize("MOBLOKS5E.editing-name"),
		hint: game.i18n.localize("MOBLOKS5E.editing-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "show-not-prof", {
		name: game.i18n.localize("MOBLOKS5E.show-not-prof-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-not-prof-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "show-skill-save", {
		name: game.i18n.localize("MOBLOKS5E.show-skill-save-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-skill-save-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "show-resources", {
		name: game.i18n.localize("MOBLOKS5E.show-resources-name"),
		hint: game.i18n.localize("MOBLOKS5E.show-resources-hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("monsterblock", "max-height-offset", {
		name: game.i18n.localize("MOBLOKS5E.max-height-offset-name"),
		hint: game.i18n.localize("MOBLOKS5E.max-height-offset-hint"),
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
	for (let theme in MonsterBlock5e.themes) themeChoices[theme] = game.i18n.localize(MonsterBlock5e.themes[theme].name);
	game.settings.register("monsterblock", "default-theme", {
		name: game.i18n.localize("MOBLOKS5E.default-theme-name"),
		hint: game.i18n.localize("MOBLOKS5E.default-theme-hint"),
		scope: "world",
		config: true,
		type: String,
		choices: themeChoices,
		default: "default"
	});
	game.settings.register("monsterblock", "custom-theme-class", {
		name: game.i18n.localize("MOBLOKS5E.custom-theme-class-name"),
		hint: game.i18n.localize("MOBLOKS5E.custom-theme-class-hint"),
		scope: "world",
		config: true,
		type: String,
		default: ""
	});
	game.settings.register("monsterblock", "compact-window", {
		name: game.i18n.localize("MOBLOKS5E.compact-window.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.compact-window.settings.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "compact-layout", {
		name: game.i18n.localize("MOBLOKS5E.compact-layout.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.compact-layout.settings.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "compact-feats", {
		name: game.i18n.localize("MOBLOKS5E.compact-feats.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.compact-feats.settings.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register("monsterblock", "font-size", {
		name: game.i18n.localize("MOBLOKS5E.font-size.settings.name"),
		hint: game.i18n.localize("MOBLOKS5E.font-size.settings.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 14
	});
});

// This is how the box sizing is corrected to fit the statblock
// eslint-disable-next-line no-unused-vars
Hooks.on("renderMonsterBlock5e", (monsterblock, html, data) => {	// When the sheet is rendered
	//console.debug(`Monster Block |`, monsterblock, html, data);
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

	//console.debug("Adding Control...");
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

Hooks.on("renderActorSheet", (...args) => {	// This is just for debugging, it prevents this sheet's template from being cached.
	if (!debugging()) return; 

	//let template = "modules/monsterblock/templates/dnd5e/monsterblock5e.hbs";
    //delete _templateCache[template];
	window._templateCache = [];
    //console.debug(`Monster Block | removed "${template}" from _templateCache.`);
	console.log(args);
});

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag("monsterblock");
});