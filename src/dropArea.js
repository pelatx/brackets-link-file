/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File Drop Zone.
*/
define(function (require, exports, module) {
    'use strict';

    var Resizer         = brackets.getModule("utils/Resizer"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager");

    var $dropArea = $("<div id=\"plf-droparea\" style=\"background-color:#2a2727;border-top:1px solid black;\" align=\"center\">Link File Drop Area</br><div class=\"plf-dest-dir\" style=\"position:absolute;right:4px;left:4px;bottom:4px;padding:2px 4px 2px 4px;background-color:#3c3838;overflow:hidden;\" data-toggle=\"popover\" data-trigger=\"hover\"></div></div>");

    var _dirPath;

    function initListeners(callback) {
        $dropArea.on("drop", function (event) {
            event.stopPropagation();
            event.preventDefault();

            var files = event.originalEvent.dataTransfer.files;

            if (files && files.length) {
                brackets.app.getDroppedFiles(function(err, paths) {
                    if (!err) {
                        callback(paths);
                    }
                });
            }
        });

        ProjectManager.on("projectOpen", function () {
            setDestinationDir(ProjectManager.getProjectRoot().fullPath);
        });
    }

    function setDestinationDir(dir) {
        _dirPath = dir;
        var name = FileUtils.getBaseName(_dirPath);
        var $dest = $(".plf-dest-dir");
        $dest.empty();
        $dest.append(name);
        $dest.attr("title", _dirPath);
    }

    function getDestinationPath() {
        return _dirPath;
    }

    function show() {
        $("#sidebar").append($dropArea);
        Resizer.makeResizable($dropArea, "vert", "top", 80);
        setDestinationDir(ProjectManager.getProjectRoot().fullPath);
    }

    module.exports = {
        initListeners: initListeners,
        getDestinationPath: getDestinationPath,
        show: show,
        setDestinationDir: setDestinationDir
    };
});
