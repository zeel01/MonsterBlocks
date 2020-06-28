import ActorSheet5eNPC from "../../systems/dnd5e/module/actor/sheets/npc.js";

export class MonsterBlock5e extends ActorSheet5eNPC {
	get template() {
		return "modules/monsterblock/actor-sheet.html";
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["monsterblock", "sheet", "actor"],
		//	template: "modules/monsterblock/actor-sheet.html",
			width: 856,
			height: 800,
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
function isMultiAttack(item) {
	let name = item.name.toLowerCase().replace(/\s+/g, '');
	return [
		"multiattack",
		"extraattack",
		"extraattacks",
		"multiattacks",
		"multipleattacks",
		"manyattacks"
	].includes(name);
}
function isLegendaryAction(item) {
	console.log(item);
	return item.data.activation.type === "legendary";
}
function isLairAction(item) {
	console.log(item);
	return item.data.activation.type === "lair";
}
Handlebars.registerHelper("haslegendary", (features)=> {
	return false;
});
Handlebars.registerHelper("islegendary", (item)=> {
	return isLegendaryAction(item);
});
Handlebars.registerHelper("getmultiattack", (features)=> {
	for (let f in features) {
		let items = features[f].items;
		for (let i in items) {
			if (isMultiAttack(items[i])) {
				console.log(items[i]);
				return items[i];
			}
		}
	}
	return false;
});
Handlebars.registerHelper("notspecialaction", (item)=> {
	// Handlebars has no negation in conditions afik, so we have to create one.
	return !(isMultiAttack(item) || isLegendaryAction(item) || isLairAction(item));
});
Handlebars.registerHelper("getattacks", (features)=> {
	for (let f in features) {
		if (features[f].label == "Attacks") return features[f].items;
	}
});
Handlebars.registerHelper("getactions", (features)=> {
	for (let f in features) {
		if (features[f].label == "Actions") return features[f].items;
	}
});
Handlebars.registerHelper("getfeatures", (features)=> {
	for (let f in features) {
		if (features[f].label == "Features") return features[f].items;
	}
});
Handlebars.registerHelper("getattacktype", (attack)=> {
	return "DND5E.Action" + attack.data.actionType.toUpperCase();
});
Handlebars.registerHelper("getattackbonus", (attack, data)=> {
	let attr = attack.data.ability;
	let abilityBonus = data.abilities[attr].mod;
	let isProf = attack.data.proficient;
	let profBonus = data.attributes.prof;
//	console.log(attr, abilityBonus, isProf, profBonus);
	
	return abilityBonus + (isProf ? profBonus : 0);
});
Handlebars.registerHelper("getchathtml", (item, actor)=> {
	return game.actors.get(actor._id).getOwnedItem(item._id).getChatData().description.value;
});
