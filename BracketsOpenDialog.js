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
        NodeDomain          = brackets.getModule("utils/NodeDomain");

    // Initialize the Node domain.
    var simpleDomain = new NodeDomain("simple", ExtensionUtils.getModulePath(module, "node/SimpleDomain"));
    // Saves the last directory where files were copied.
    var prefs = PreferencesManager.getExtensionPrefs("pelatx.brackets-open-dialog");
    prefs.definePreference("lastDir", "string");

    /* Functions */
    /**
     * Evaluate which platform is running Brackets
     * and determines the root of the file system.
     * @private
     * @author pelatx
     * @returns {object} Promise with the root string.
     */
    function _getPlatformRoot() {
        var root = "",
            deferred = new $.Deferred();
        // Node command to get platform string.
        simpleDomain.exec("getPlatform")
            .done(function (platform) {
                // Choose the root according to platform.
                switch (platform) {
                    case "linux":
                        root = "/";
                        break;
                    case "win32":
                        root = "C:/";
                        break;
                    default:
                        root = "/";
                }
                deferred.resolve(root);
            }).fail(function (err) {
                console.error("[brackets-simple-node] failed to run simple.getPlatform", err);
                deferred.reject();
            });
        return deferred.promise();
    }

    /**
     * Sets a valid directory to show first.
     * @private
     * @author pelatx
     * @param   {string} dir A user supplied directory.
     * @returns {object} Promise with a valid directory string.
     */
    function _setValidDir(dir) {
        var lastDir, deferred = new $.Deferred();
        // Get the platform filesystem root.
        _getPlatformRoot().done(function (fsRoot) {
            if (!dir) { // if no supplied directory ...
                lastDir = prefs.get("lastDir"); // try to read saved last.
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

    /**
     * Renders the directory contents HTML.
     * @private
     * @author pelatx
     * @param   {Array}  paths Array of full path strings.
     * @returns {string} HTML formated string.
     */
    function _renderContents(paths) {
        var name, linkColor, result = "",
            extensionDir = FileUtils.getNativeModuleDirectoryPath(module),
            iconPath = extensionDir + "/ionicons/ionicons-folder-32x32.png";

        // Choose font color for directories according to theme
        if ($('body').hasClass('dark')) {
            linkColor = "#6bbeff";
        } else {
            linkColor = "#0083e8";
        }

        // Adds two points link to going up in the directory tree
        result += "<span><img src='" + iconPath + "' alt='Directorty' style='width:20px;height:20px;'></span>";
        result += "<a class='bod-dir-link' href='#' data-path='dir-up' style='text-decoration: none;color:" + linkColor + ";'>";
        result += StringUtils.breakableUrl("..") + "</a></br>";

        // Creates the list of items
        paths.forEach(function (path) {
            name = FileUtils.getBaseName(path);
            if (path.substr(-1) !== "/") {
                result += "<input type='checkbox' name='bod-file-checkbox' value='" + name + "' data-path='" + path + "'> ";
                result += StringUtils.breakableUrl(name);
            } else {
                result += "<span><img src='" + iconPath + "' alt='Directorty' style='width:20px;height:20px;'></span>";
                result += "<a class='bod-dir-link' href='#' data-path='" + path + "' style='text-decoration: none;color:" + linkColor + ";'>";
                result += StringUtils.breakableUrl(name) + "</a>";
            }
            result += "</br>";
        });
        return result;
    }

    /**
    * Shows open files dialog.
    * @author pelatx
    * @param   {string}   scrDir Folder to show first.
    * @returns {object}   Promise with an array of selected items full path strings.
    */
    function show(scrDir) {
        var dir, i, name, path, paths = [], render, selected = [],
            dialog, btnProceed, btnCancel, btnCheckAll, btnUncheckAll,
            newScrDir = "", deferred = new $.Deferred();

        // We always need a valid directory to show first.
        _setValidDir(scrDir).done(function (validDir) {
            scrDir = validDir;
            dir = FileSystem.getDirectoryForPath(scrDir);
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
                render = _renderContents(paths);
                // Show custom dialog.
                dialog = Dialogs.showModalDialog(
                    brackets.DIALOG_ID_SAVE_CLOSE,
                    scrDir,
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
                    $("input:checkbox[name=bod-file-checkbox]:checked").each(function () {
                        selected.push($(this).data('path'));
                    });
                    dialog.close();
                    // if there are selected files, saves directory on preferences
                    // and return them in an array.
                    if (selected.length > 0) {
                        prefs.set("lastDir", scrDir);
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
                    $("input:checkbox[name=bod-file-checkbox]").prop('checked', true);
                });

                btnUncheckAll = $('.dialog-button').filter('[data-button-id="bod.uncheckall"]');
                btnUncheckAll.click(function () {
                    $("input:checkbox[name=bod-file-checkbox]").prop('checked', false);
                });
                // If a directory item is clicked ...
                $(".bod-dir-link").click(function () {
                    dialog.close();
                    dir = $(this).data('path');
                    // and it is '..', goes one directory up.
                    if (dir === "dir-up") {
                        scrDir = scrDir.split("/");
                        scrDir.pop();
                        if (scrDir.length > 1) {
                            scrDir.pop();
                        }
                        newScrDir += scrDir.join("/") + "/";
                    // if normal directory item, uses it.
                    } else {
                        newScrDir = dir;
                    }
                    // Show a new dialog with the selected directory.
                    show(newScrDir).done(function (sel) {
                        deferred.resolve(sel);
                    });
                });
            });
        });
        return deferred.promise();
    }
    /* Exports */
    exports.show = show;
});