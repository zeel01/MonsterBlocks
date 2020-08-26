/* eslint-disable no-unused-vars */
/* global require exports*/
const Gulp = require("gulp");
const zip = require("gulp-zip");

function createRelease(cb) {
	return Gulp.src([
		"module.json",
		"monsterblock.js",
		"monsterblock.css",
		"actor-sheet.html",
		"lang/*",
		"input-expressions/handler.js",
		"input-expressions/math.min.js"
	], { base: "." })
		.pipe(zip("monsterblock.zip"))
		.pipe(Gulp.dest("./"));
}

exports.zip = createRelease;
exports.default = createRelease;