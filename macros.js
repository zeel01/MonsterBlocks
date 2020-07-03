// Swap the sheet of the selected token between this and the standard 5e NPS sheet.

(async ()=> {
	await token.actor.sheet.close();
	if (token.actor.getFlag("core", "sheetClass") === "dnd5e.ActorSheet5eNPC") {
		await token.actor.setFlag("core", "sheetClass", "dnd5e.MonsterBlock5e")
	}
	else {
		await token.actor.setFlag("core", "sheetClass", "dnd5e.ActorSheet5eNPC")
	}
	await token.actor.sheet.render(true)
})();

// Set all NPC tokens that have the default sheet to use Monster Blocks. Switch the comments to do the opposite.
// Doesn't work on tokens that don't have a sheetClass flag set yet. If you have *no* PC tokens, you can remove the conditional and it will work.
(async ()=>{
	console.log("Macro | Setting all NPC token sheets to MonsterBlock5e...");
	console.time("Macro | Sheet conversion completed in");
	for (let tkn of canvas.tokens.objects.children) {
	//	if (token.actor.getFlag("core", "sheetClass") === "dnd5e.MonsterBlock5e") {
		if (tkn.actor.getFlag("core", "sheetClass") === "dnd5e.ActorSheet5eNPC") {
			await tkn.actor.sheet.close();
			await tkn.actor.setFlag("core", "sheetClass", "dnd5e.MonsterBlock5e")
		//	await tkn.actor.setFlag("core", "sheetClass", "dnd5e.ActorSheet5eNPC")
		}
	}
	console.log("Macro | ...Complete");
	console.timeEnd("Macro | Sheet conversion completed in");
	return true;
})();