import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

export class MonsterBlock5e extends ActorSheet5eNPC {
	get template() {
		return "modules/monsterblock/actor-sheet.html";
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["monsterblock", "sheet", "actor"],
		//	template: "modules/monsterblock/actor-sheet.html",
			width: 900,
			height: 900,
			tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
		});
	}
	
	 activateListeners(html) {
		 //
	 }
}

Hooks.on("init", () => {
	console.log(`Monster Block | Initialized.`);
});

Hooks.on("renderActorSheet", ()=> {
	let template = "modules/monsterblock/actor-sheet.html";
    delete _templateCache[template];
    console.log(`Monster Block | removed "${template}" from _templateCache.`);
})

Actors.registerSheet("dnd5e", MonsterBlock5e, {
    types: ["npc"],
    makeDefault: false
});

Handlebars.registerHelper("hascontents", (obj)=> {
	return Object.keys(obj).length > 0;
});

Handlebars.registerHelper("hasskills", (skills)=> {
	for (let s in skills) {
		if (skills[s].value) return true;
	}
	return false;
});
Handlebars.registerHelper("hassave", (saves)=> {
	for (let s in saves) {
		if (saves[s].proficient) return true;
	}
	return false;
});