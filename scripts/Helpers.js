import { getTranslationArray } from "./utilities.js";

export default class Helpers {
	static get numbers() {
		return [
			"zero", "one",
			"two", "three",
			"four", "five",
			"six", "seven",
			"eight", "nine"
		]
	}

	static getOrdinalSuffix(number) {
		let suffixes = getTranslationArray("MOBLOKS5E.OrdinalSuffixes");
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
	static getNumberString(number) {
		number = Number(number);
		if (number > 9 || number < 0) return number.toString();
		return game.i18n.localize("MOBLOKS5E." + this.numbers[number]);
	}
}