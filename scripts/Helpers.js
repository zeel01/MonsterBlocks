export default class Helpers {
	static getOrdinalSuffix(number) {
		let suffixes = game.i18n.localize("MOBLOKS5E.OrdinalSuffixes");
		if (number < 1 || suffixes.length < 1) return number.toString();
		if (number <= suffixes.length) return suffixes[number - 1];
		else return suffixes[suffixes.length - 1];
	}
	static formatOrdinal(number) {
		return number + this.getOrdinalSuffix(number);		
	}
	static isContinuousDescription(desc) {
		if (desc === null) return false;
		// Either the start of input, or the first > character followed by one of the listed things (space, nbsp, seperators)
		return /(?:^|^[^>]*>)(?:\s|&nbsp;|,|;|:|\.)/.test(desc);
	}
}