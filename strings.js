/**
 * This file provides the interface to user visible strings in Brackets. Code that needs
 * to display strings should load this module by calling var Strings = require("strings").
 * The i18n plugin will dynamically load the strings for the right locale and populate
 * the exports variable. See nls/root/strings.js for the master file of English strings.
 */

/* global define */

define(function (require, exports, module) {
    "use strict";

    module.exports = require("i18n!nls/strings");
});
