var cleanVersion = require('./clean-version');

var dPattern = /^\d+$/;
var pPattern = /[-.]|\d+|[^-.\d].*/g;
var tPattern = /[a-z]|-\d+$/;
var nPattern = /\d+|[^\d]+/g;

module.exports = function (versionA, versionB) {
	versionA = cleanVersion(versionA);
	versionB = cleanVersion(versionB);

	var ax = versionA.match(pPattern);
	var bx = versionB.match(pPattern);

	while (ax && bx && ax.length && bx.length) {
		var a = ax.shift();
		var b = bx.shift();

		if (a === b) {
			// continue
		} else if ((a === '-' || a === '.') && dPattern.test(a)) {
			return 1;
		} else if ((b === '-' || b === '.') && dPattern.test(b)) {
			return -1;
		} else if (dPattern.test(a) && dPattern.test(b)) {
			return b - a;
		} else {
			return compareStrings(a, b);
		}
	}

	// 1.1.0-alpha > 1.0
	if (ax.length > 2) {
		return -1;
	} else if (bx.length  > 2) {
		return 1;
	}

	return compareStrings(versionA, versionB);
};

function compareStrings (versionA, versionB) {
	versionA = versionA.toLowerCase();
	versionB = versionB.toLowerCase();

	// 1.0.0 > 1.0.0-alpha
	if (tPattern.test(versionA) && !tPattern.test(versionB)) {
		return 1;
	} else if (tPattern.test(versionB) && !tPattern.test(versionA)) {
		return -1;
	}

	// 1.0.0-alpha.10 > 1.0.0-alpha.9
	var ax = versionA.match(nPattern);
	var bx = versionB.match(nPattern);

	while (ax && bx && ax.length && bx.length) {
		var a = ax.shift();
		var b = bx.shift();

		if (dPattern.test(a)) {
			a = Number(a);
		}

		if (dPattern.test(b)) {
			b = Number(b);
		}

		if (a > b) {
			return -1;
		} else if (a < b) {
			return 1;
		}
	}

	// 1.0.0 > 1.0
	if (ax.length) {
		return -1;
	} else if (bx.length) {
		return 1;
	}

	return 0;
}
