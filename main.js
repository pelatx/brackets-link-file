/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File
*/
define(function Main(require, exports, module) {
    'use strict';

    /* Modules */
    var AppInit             = brackets.getModule("utils/AppInit"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        LanguageManager     = brackets.getModule("language/LanguageManager"),
        MainViewManager     = brackets.getModule("view/MainViewManager"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        Menus               = brackets.getModule("command/Menus"),
        Commands            = brackets.getModule("command/Commands"),
        FileUtils           = brackets.getModule("file/FileUtils");

    var File                = require("src/pFileUtils"),
        Linker              = require("src/linker"),
        Dialog              = require("src/pFSD/pFileSelectionDialog"),
        DropArea            = require("src/dropArea"),
        Watcher             = require("src/watcher"),
        Downloader          = require("src/downloader"),
        Strings             = require("strings");

    /* Constants */
    var CMD_LINK  = "bracketslf.link",
        CMD_SET_DROP_DEST = "bracketslf.dropdest",
        CMD_DOWNLOADER = "bracketslf.downloader",
        CMD_TOGGLE_DROP = "bracketslf.toggledrop",
        CMD_TOGGLE_WATCH = "bracketslf.togglewatch",

        MENU_ITEM_LINK   = Strings.INSERT_TAGS,
        MENU_ITEM_DROP_DEST = Strings.DROP_AREA_DEST,
        MENU_ITEM_DOWNLOADER = Strings.DOWNLOADER,
        MENU_ITEM_DROP_VIEW = Strings.DROP_AREA,
        MENU_ITEM_WATCH = Strings.WATCHER,

        DROPAREA_PREF = "droparea",
        WATCHER_PREF = "watchproject";

    /* Preferences */
    var prefs = PreferencesManager.getExtensionPrefs("brackets.linkfile");


    /* Functions */

    /**
     * Link files already in project tree and from the file selection dialog.
     */
    function doLinking() {
        var selectedItem = ProjectManager.getSelectedItem();
        if (selectedItem) {
            if (!selectedItem.isDirectory) {
                var tag = Linker.getTagsFromFiles([selectedItem.fullPath]);
                Linker.insertTags(tag)
            } else {
                Dialog.show("Add files to project").done(function (paths) {
                    if (paths.length > 0) {
                        File.batchCopy(paths, selectedItem.fullPath).done(function (copiedFiles) {
                            var tags = Linker.getTagsFromFiles(copiedFiles);
                            Linker.insertTags(tags)
                        });
                    }
                });
            }
        }
    }

    /**
     * Enables the drop area.
     */
    function enableDropArea() {
        DropArea.show();
        CommandManager.get(CMD_TOGGLE_DROP).setChecked(true);
        prefs.set(DROPAREA_PREF, true);
        prefs.save();
    }

    /**
     * Disables the drop area.
     */
    function disableDropArea() {
        DropArea.hide();
        CommandManager.get(CMD_TOGGLE_DROP).setChecked(false);
        prefs.set(DROPAREA_PREF, false);
        prefs.save();
    }

    /**
     * Toggles enabled/disabled the drop area.
     */
    function toggleDropArea() {
        if (prefs.get(DROPAREA_PREF) === true) {
            disableDropArea();
        } else {
            enableDropArea();
        }
    }

    /* Initializes extension */
    AppInit.appReady(function () {
        var contextMenu, viewMenu, fileMenu;

        CommandManager.register(MENU_ITEM_LINK, CMD_LINK, doLinking);
        CommandManager.register(MENU_ITEM_DROP_DEST, CMD_SET_DROP_DEST, function () {
            var selectedItem = ProjectManager.getSelectedItem();
            if (selectedItem) {
                if (selectedItem.isDirectory) {
                    DropArea.setDestinationDir(selectedItem.fullPath);
                }
            } else {
                DropArea.setDestinationDir(ProjectManager.getProjectRoot().fullPath);
            }
        });
        CommandManager.register(MENU_ITEM_DOWNLOADER, CMD_DOWNLOADER, function () {
            Downloader.show();
        });
        CommandManager.register(MENU_ITEM_DROP_VIEW, CMD_TOGGLE_DROP, toggleDropArea);
        CommandManager.register(MENU_ITEM_WATCH, CMD_TOGGLE_WATCH, function () {
            if (prefs.get(WATCHER_PREF) === true) {
                Watcher.stop();
                CommandManager.get(CMD_TOGGLE_WATCH).setChecked(false);
                prefs.set(WATCHER_PREF, false);
                prefs.save();
            } else {
                Watcher.start();
                CommandManager.get(CMD_TOGGLE_WATCH).setChecked(true);
                prefs.set(WATCHER_PREF, true);
                prefs.save();
            }
        });

        contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        contextMenu.addMenuItem(CMD_LINK);
        contextMenu.addMenuItem(CMD_SET_DROP_DEST);
        contextMenu.addMenuItem(CMD_DOWNLOADER);

        viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        viewMenu.addMenuItem(CMD_TOGGLE_DROP);

        fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(CMD_TOGGLE_WATCH, undefined, Menus.BEFORE, Commands.FILE_QUIT);

        prefs.definePreference(DROPAREA_PREF, "boolean", true);
        prefs.definePreference(WATCHER_PREF, "boolean", false);
        prefs.save();

        if (prefs.get(DROPAREA_PREF) === true) {
            enableDropArea();
        } else {
            disableDropArea();
        }

        if (prefs.get(WATCHER_PREF) === true) {
            Watcher.start();
            CommandManager.get(CMD_TOGGLE_WATCH).setChecked(true);
        } else {
            Watcher.stop();
            CommandManager.get(CMD_TOGGLE_WATCH).setChecked(false);
        }
    });
});
