// from https://github.com/megawac/SemVish/blob/a02cf2378c662bfbce34e1c77c78a5559ff815da/index.js#L68 for backward compatibility

/**
 * @param {string} version
 * @returns {string}
 */
module.exports = function (version) {
	return version.trim().replace(/^[=\-_\s]*(v(ersion)?)?[=\-_\s.]*/i, '');
};
