let shim;

if (!window.dnd5e) {
	const npc = await import("../../../../systems/dnd5e/module/actor/sheets/npc.js");
	const ts = await import("../../../../systems/dnd5e/module/apps/trait-selector.js");

	shim = {
		applications: {
			TraitSelector: ts.default,
			actor: {
				ActorSheet5eNPC: npc.default,
			}
		}
	}
}

export default window.dnd5e || shim;