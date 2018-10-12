/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File Drop Area.
*/
define(function DropArea(require, exports, module) {
    'use strict';

    var Resizer         = brackets.getModule("utils/Resizer"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        Mustache        = brackets.getModule("thirdparty/mustache/mustache");

    var Strings         = require("strings"),
        Linker          = require("./linker"),
        File            = require("./pFileUtils");

    var dropAreaTemplate  = require("text!templates/dropArea.html");

    var $dropArea = $(Mustache.render(dropAreaTemplate, {
        title: Strings.DROP_AREA_LABEL
    }));

    var _dirPath;

    /**
     * Initializes listeners for drops and project change.
     * @param {function} callback The function to call for a drop event.
     */
    function _initListeners() {
        $dropArea.on("drop", function (event) {
            event.stopPropagation();
            event.preventDefault();

            var files = event.originalEvent.dataTransfer.files;

            if (files && files.length > 0) {
                brackets.app.getDroppedFiles(function(err, paths) {
                    if (!err) {
                        File.batchCopy(paths, _dirPath).done(function (copiedFiles) {
                            var tags = Linker.getTagsFromFiles(copiedFiles);
                            Linker.insertTags(tags);
                            ProjectManager.refreshFileTree();
                        });
                    }
                });
            }
        });

        ProjectManager.on("projectOpen", function () {
            setDestinationDir(ProjectManager.getProjectRoot().fullPath);
        });
    }

    /**
     * Sets the target directory for the dropped files to be copied and
     * tagged after.
     * @param {string} dir The target directory full path.
     */
    function setDestinationDir(dir) {
        _dirPath = dir;
        var name = FileUtils.getBaseName(_dirPath);
        var $dest = $(".blf-dest-dir");
        $dest.empty();
        $dest.append(name);
        $dest.attr("title", _dirPath);
    }

    /**
     * Appends the drop area to Brackets sidebar.
     */
    function show() {
        $("#sidebar").append($dropArea);
        Resizer.makeResizable($dropArea, "vert", "top", 80);
        setDestinationDir(ProjectManager.getProjectRoot().fullPath);
        _initListeners();
    }

    /**
     * Removes the drop area from Brackets sidebar.
     */
    function hide() {
        $dropArea.remove();
    }

    module.exports = {
        setDestinationDir: setDestinationDir,
        show: show,
        hide: hide
    };
});
