/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports, module) {
    'use strict';

    /* Modules */
    var Dialogs             = brackets.getModule("widgets/Dialogs"),
        StringUtils         = brackets.getModule("utils/StringUtils"),
        FileSystem          = brackets.getModule("filesystem/FileSystem"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        NodeDomain          = brackets.getModule("utils/NodeDomain"),
        DropdownButton      = brackets.getModule("widgets/DropdownButton");

    // Initialize the Node domain.
    var domain = new NodeDomain("pelatxFSD", ExtensionUtils.getModulePath(module, "pFSDDomain"));
    // Saves the last directory where files were copied.
    var prefs = PreferencesManager.getExtensionPrefs("pelatx.brackets-open-dialog");
    prefs.definePreference("lastDir", "string");

    /* Variables */
    var currentDir = "", // Directory been shown.
        dialog; // Single dialog instance.

    /* Functions */

    /**
     * Sets a valid directory to show first.
     * @private
     * @author pelatx
     * @param   {string} dir A user supplied directory.
     * @returns {object} Promise with a valid directory string.
     */
    function _setValidDir(dir) {
        var fsRoot, lastDir, deferred = new $.Deferred();
        // Get the platform filesystem root.
        domain.exec("getPlatform").done(function (platform) {
            if (platform === "win32") {
                fsRoot = "C:/";
            } else {
                fsRoot = "/";
            }

            if (!dir) { // if no supplied directory ...
                lastDir = prefs.get("lastDir"); // try to read saved last dir.
                if (lastDir) {
                    dir = lastDir; // if exists, choose it.
                } else {
                    dir = fsRoot; // if not, use filesystem root.
                }
            }
            // Verify that the directory exists on disk.
            // Whether it is provided by the user or saved in the preferences.
            appshell.fs.stat(dir, function (err) {
                if (err === appshell.fs.ERR_NOT_FOUND) {
                    deferred.resolve(fsRoot); // if not found, return filesystem root.
                } else {
                    deferred.resolve(dir); // if found, return it.
                }
            });
        });
        return deferred.promise();
    }

    function _renderDirNavbar(dir) {
        var navbar = "", dirChain = [], root, rootLabel, label = "";

        dir = dir.slice(0, -1);
        dirChain = dir.split("/");
        root = dirChain.shift();
        if (root) {
            rootLabel = root;
        } else {
            rootLabel = "/";
        }
        if (dirChain.length > 0) {
            label += " > ";
        }
        label += dirChain.join(" > ");

        navbar += "<a class='btn pfsd-dir-link' href='#' role='button' data-path='";
        navbar += root + "/";
        navbar += "'>" + rootLabel + "</a><b><span style='color:#c52929;'>";
        navbar += label;
        navbar += "</span></b></br></br>";

        return navbar;
    }

    /**
     * Renders the directory contents HTML.
     * @private
     * @author pelatx
     * @param   {Array}  paths Array of full path strings.
     * @returns {string} HTML formated string.
     */
    function _renderContents(paths, dir) {
        var name, linkColor, result = "<section id='pfsd-list'>",
            extensionDir = FileUtils.getNativeModuleDirectoryPath(module),
            iconPath = extensionDir + "/ionicons/ionicons-folder-32x32.png";

        // Choose font color for directories according to theme
        if ($('body').hasClass('dark')) {
            linkColor = "#6bbeff";
        } else {
            linkColor = "#0083e8";
        }
        // Adds the current path.
        if (dir) {
            result += _renderDirNavbar(dir);
        }
        // Adds two points link to going up in the directory tree
        result += "<span><img src='" + iconPath + "' alt='Directorty' style='width:20px;height:20px;'></span>";
        result += "<a class='pfsd-dir-link' href='#' data-path='dir-up' style='text-decoration: none;color:" + linkColor + ";'>";
        result += StringUtils.breakableUrl("..") + "</a></br>";

        // Creates the list of items
        paths.forEach(function (path) {
            name = FileUtils.getBaseName(path);
            if (path.substr(-1) !== "/") {
                result += "<input type='checkbox' name='pfsd-file-checkbox' value='" + name + "' data-path='" + path + "'> ";
                result += StringUtils.breakableUrl(name);
            } else {
                result += "<span><img src='" + iconPath + "' alt='Directorty' style='width:20px;height:20px;'></span>";
                result += "<a class='pfsd-dir-link' href='#' data-path='" + path + "' style='text-decoration: none;color:" + linkColor + ";'>";
                result += StringUtils.breakableUrl(name) + "</a>";
            }
            result += "</br>";
        });
        result += "</section>";
        return result;
    }

    /**
     * Shows open files dialog.
     * @author pelatx
     * @param   {string}  scrDir Folder to show first.
     * @param   {boolean} update If it is a list update only.
     * @returns {object}  Promise with an array of selected items full path strings.
     */
    function show(title, scrDir, update) {
        var dir, i, name, path, paths = [], render, selected = [],
            btnProceed, btnCancel, btnCheckAll, btnUncheckAll,
            btnProceedHandler, btnCancelHandler, btnCheckAllHandler, btnUncheckAllHandler,
            deferred = new $.Deferred();

        // Default title
        if (!title) { title = "Select Files"; }

        // We always need a valid directory to show first.
        _setValidDir(scrDir).done(function (validDir) {
            currentDir = validDir;

            // Begins the directory scanning.
            dir = FileSystem.getDirectoryForPath(currentDir);
            dir.getContents(function (err, entries) {
                // Makes an array of full paths with directory entries.
                for (i = 0; i < entries.length; i++) {
                    path = entries[i].fullPath;
                    name = FileUtils.getBaseName(path);
                    // Do not show hidden files.
                    if (name.substr(0, 1) !== ".") {
                        paths.push(path);
                    }
                }
                // Renders full paths array.
                render = _renderContents(paths, currentDir);
                // If it is a new instance, show the custom dialog
                // and assigns button handlers.
                if (!update) {
                    dialog = Dialogs.showModalDialog(
                        brackets.DIALOG_ID_SAVE_CLOSE,
                        title,
                        render,
                        [{
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: "bod.checkall",
                            text: "Check All"
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: "bod.uncheckall",
                            text: "Uncheck All"
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: "bod.cancel",
                            text: "Cancel"
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: "bod.proceed",
                            text: "Proceed"
                        }],
                        false
                    );


                    // Buttons click handlers.
                    btnProceed = $('.dialog-button').filter('[data-button-id="bod.proceed"]');
                    btnProceed.click(function () {
                        $("input:checkbox[name=pfsd-file-checkbox]:checked").each(function () {
                            selected.push($(this).data('path'));
                        });
                        dialog.close();
                        // if there are selected files, saves directory on preferences
                        // and return them in an array.
                        if (selected.length > 0) {
                            prefs.set("lastDir", currentDir);
                            prefs.save();
                            deferred.resolve(selected);
                        } else {
                            deferred.reject();
                        }
                    });
                    btnCancel = $('.dialog-button').filter('[data-button-id="bod.cancel"]');
                    btnCancel.click(function () {
                        dialog.close();
                        deferred.reject();
                    });
                    btnCheckAll = $('.dialog-button').filter('[data-button-id="bod.checkall"]');
                    btnCheckAll.click(function () {
                        $("input:checkbox[name=pfsd-file-checkbox]").prop('checked', true);
                    });
                    btnUncheckAll = $('.dialog-button').filter('[data-button-id="bod.uncheckall"]');
                    btnUncheckAll.click(function () {
                        $("input:checkbox[name=pfsd-file-checkbox]").prop('checked', false);
                    });
                // If it is an update of the existing dialog, update list only.
                } else {
                    $("#pfsd-list").empty();
                    $("#pfsd-list").append(render);
                }

                // If a directory item is clicked ...
                $(".pfsd-dir-link").click(function () {
                    //dialog.close();
                    dir = $(this).data('path');
                    // and it is '..', goes one directory up.
                    if (dir === "dir-up") {
                        currentDir = currentDir.split("/");
                        currentDir.pop();
                        if (currentDir.length > 1) {
                            currentDir.pop();
                        }
                        currentDir = currentDir.join("/") + "/";
                    // if normal directory item, uses it.
                    } else {
                        currentDir = dir;
                    }
                    // Updates dialog with the selected directory (update flag switched on).
                    show("", currentDir, true);
                });
            });
        });
        return deferred.promise();
    }
    /* Exports */
    exports.show = show;
});
