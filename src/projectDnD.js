/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File Project Tree Drag&Drop on editor to link supported files.
*/
define(function ProjectDnD(require, exports, module) {
    'use strict';

    var Linker          = require("./linker");

    function init() {
        $("#editor-holder").on("dragover", function(e) {
            e.preventDefault();
        });

        $("#editor-holder").on("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();

            var data = JSON.parse(e.originalEvent.dataTransfer.getData("text"));
            var tag = Linker.getTagsFromFiles([data.path]);
            Linker.insertTags(tag);
        });
    }

    module.exports = {
        init: init
    };
});
