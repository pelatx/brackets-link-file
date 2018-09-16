/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets */

/**
* Brackets Link File
*/
define(function Main(require, exports, module) {
    'use strict';

    /* Modules */
    var AppInit             = brackets.getModule("utils/AppInit"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        Menus               = brackets.getModule("command/Menus");

    var File                = require("src/pFileUtils"),
        Linker              = require("src/linker"),
        Dialog              = require("src/pFSD/pFileSelectionDialog"),
        DropArea            = require("src/dropArea"),
        Watcher             = require("src/watcher"),
        Downloader          = require("src/downloader"),
        Strings             = require("strings"),
        PrefsDialog         = require("src/prefsDialog");

    /* Constants */
    var CMD_LINK  = "bracketslf.link",
        CMD_SET_DROP_DEST = "bracketslf.dropdest",
        CMD_DOWNLOADER = "bracketslf.downloader",
        CMD_SHOW_PREFS = "bracketslf.showprefs",

        MENU_ITEM_LINK   = Strings.INSERT_TAGS,
        MENU_ITEM_DROP_DEST = Strings.DROP_AREA_DEST,
        MENU_ITEM_DOWNLOADER = Strings.DOWNLOADER,
        MENU_ITEM_PREFS = Strings.PREFERENCES,

        DROPAREA_PREF = "droparea",
        WATCHER_PREF = "watchproject",
        DOWNLOADER_PREF = "downloader",
        FILEBROWSER_PREF = "filebrowser";

    /* Preferences */
    var prefs = PreferencesManager.getExtensionPrefs("brackets.linkfile");

    // Styles
    ExtensionUtils.loadStyleSheet(module, "styles/styles.css");

    /* Functions */

    /**
     * Link files already in project tree and from the file selection dialog.
     */
    function doLinking() {
        var selectedItem = ProjectManager.getSelectedItem();
        if (selectedItem && !selectedItem.isDirectory) {
            var tag = Linker.getTagsFromFiles([selectedItem.fullPath]);
            Linker.insertTags(tag);
        } else if (selectedItem && selectedItem.isDirectory && prefs.get(FILEBROWSER_PREF)) {
            var options = {
                title: Strings.PFSD_TITLE,
                proceed: Strings.PROCEED_BUTTON,
                cancel: Strings.CANCEL_BUTTON,
                checkAll: Strings.CHECK_ALL_BUTTON,
                uncheckAll: Strings.UNCHECK_ALL_BUTTON,
                hiddenToggleLabel: Strings.HIDDEN_TOGGLE_LABEL,
                filterBoxPlaceholder: Strings.PFSD_FILTER_PLACEHOLDER,
                filterSets: {
                    Images: ".jpg .png .svg .gif",
                    Fonts: ".eot .otf .woff .woff2 .ttf .svg",
                    Audio: ".ogg .mp3 .wav",
                    Video: ".ogv .ogg .mp4 .webm",
                    Development: ".js .css .html .php"
                }
            };
            Dialog.show(options).done(function (paths) {
                if (paths.length > 0) {
                    File.batchCopy(paths, selectedItem.fullPath).done(function (copiedFiles) {
                        var tags = Linker.getTagsFromFiles(copiedFiles);
                        Linker.insertTags(tags);
                        ProjectManager.refreshFileTree();
                    });
                }
            });
        }
    }

    /* Initializes extension */
    AppInit.appReady(function () {
        var contextMenu, viewMenu;

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
        CommandManager.register(MENU_ITEM_DOWNLOADER, CMD_DOWNLOADER, Downloader.init);
        CommandManager.register(MENU_ITEM_PREFS, CMD_SHOW_PREFS, PrefsDialog.init);

        contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        contextMenu.addMenuDivider();
        contextMenu.addMenuItem(CMD_LINK);

        viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        viewMenu.addMenuItem(CMD_SHOW_PREFS);

        prefs.definePreference(DROPAREA_PREF, "boolean", true);
        prefs.definePreference(WATCHER_PREF, "boolean", false);
        prefs.definePreference(DOWNLOADER_PREF, "boolean", true);
        prefs.definePreference(FILEBROWSER_PREF, "boolean", true);
        prefs.save();

        // Show Drop Area or not on Brackets start.
        if (prefs.get(DROPAREA_PREF) === true) {
            DropArea.show();
            contextMenu.addMenuItem(CMD_SET_DROP_DEST);
        } else {
            DropArea.hide();
        }
        // Enable Watcher or not on Brackets start.
        if (prefs.get(WATCHER_PREF) === true) {
            Watcher.start();
        } else {
            Watcher.stop();
        }
        // Show CDN Downloader context menu entry or not on Brackets start.
        if (prefs.get(DOWNLOADER_PREF) === true)
            contextMenu.addMenuItem(CMD_DOWNLOADER);
    });
});
