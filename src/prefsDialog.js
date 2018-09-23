/*global define, $, brackets*/

/**
* Link File Preferences Dialog
*/
define(function PrefsDialog(require, exports, module) {
    'use strict';

    var Dialogs             = brackets.getModule("widgets/Dialogs"),
        Menus               = brackets.getModule("command/Menus"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        Mustache            = brackets.getModule("thirdparty/mustache/mustache");

    var DropArea            = require("src/dropArea"),
        Watcher             = require("src/watcher"),
        Strings             = require("strings");

    var PrefsTemplate      = require("text!templates/prefsDialog.html");

    var DROPAREA_PREF = "droparea",
        WATCHER_PREF = "watchproject",
        DOWNLOADER_PREF = "downloader",
        FILEBROWSER_PREF = "filebrowser",

        CMD_LINK  = "bracketslf.link",
        CMD_DOWNLOADER = "bracketslf.downloader",
        CMD_SET_DROP_DEST = "bracketslf.dropdest";

    var prefs = PreferencesManager.getExtensionPrefs("brackets.linkfile");

    function init() {
        var Dialog = Dialogs.showModalDialog(
            brackets.DIALOG_ID_SAVE_CLOSE,
            Strings.PREFS_DIALOG_TITLE,
            Mustache.render(
                PrefsTemplate,
                {
                    droparea: Strings.PREF_DROP_AREA,
                    downloader: Strings.PREF_DOWNLOADER,
                    filebrowser: Strings.PREF_FILE_BROWSER,
                    watcher: Strings.PREF_WATCHER
                }
            ),
            [{
                className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                id: "blf.cancel",
                text: Strings.CANCEL_BUTTON
            },
             {
                 className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                 id: "blf.proceed",
                 text: Strings.PROCEED_BUTTON
             }],
            false
        );

        var $droparea = $("input[name='droparea']"),
            $watcher = $("input[name='watcher']"),
            $downloader = $("input[name='downloader']"),
            $filebrowser = $("input[name='filebrowser']");

        //Update checkboxes from preferences
        $droparea.prop("checked", prefs.get(DROPAREA_PREF));
        $watcher.prop("checked", prefs.get(WATCHER_PREF));
        $downloader.prop("checked", prefs.get(DOWNLOADER_PREF));
        $filebrowser.prop("checked", prefs.get(FILEBROWSER_PREF));

        // Cancel button handler.
        var btnCancel = $('.dialog-button').filter('[data-button-id="blf.cancel"]');
        btnCancel.click(function () {
            Dialog.close();
        });

        // Proceed button handler.
        var btnProceed = $('.dialog-button').filter('[data-button-id="blf.proceed"]');
        btnProceed.click(function () {
            var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
            // Set the Drop Area
            if ($droparea.is(":checked") && prefs.get(DROPAREA_PREF) === false) {
                DropArea.show();
                contextMenu.addMenuItem(CMD_SET_DROP_DEST, null, Menus.AFTER, CMD_LINK);
                prefs.set(DROPAREA_PREF, true);
            } else if (!$droparea.is(":checked") && prefs.get(DROPAREA_PREF) === true) {
                DropArea.hide();
                contextMenu.removeMenuItem(CMD_SET_DROP_DEST);
                prefs.set(DROPAREA_PREF, false);
            }
            // Set the Project Files Watcher
            if ($watcher.is(":checked") && prefs.get(WATCHER_PREF) === false) {
                Watcher.start();
                prefs.set(WATCHER_PREF, true);
            } else if (!$watcher.is(":checked") && prefs.get(WATCHER_PREF) === true) {
                Watcher.stop();
                prefs.set(WATCHER_PREF, false);
            }
            // Set the visibility of CDN Downloader context menu entry
            if ($downloader.is(":checked") && prefs.get(DOWNLOADER_PREF) === false) {
                contextMenu.addMenuItem(CMD_DOWNLOADER, null, Menus.AFTER, CMD_LINK);
                prefs.set(DOWNLOADER_PREF, true);
            } else if (!$downloader.is(":checked") && prefs.get(DOWNLOADER_PREF) === true) {
                contextMenu.removeMenuItem(CMD_DOWNLOADER);
                prefs.set(DOWNLOADER_PREF, false);
            }
            // Set the availability of the file selection dialog on directories
            if ($filebrowser.is(":checked") && prefs.get(FILEBROWSER_PREF) === false) {
                prefs.set(FILEBROWSER_PREF, true);
            } else if (!$filebrowser.is(":checked") && prefs.get(FILEBROWSER_PREF) === true) {
                prefs.set(FILEBROWSER_PREF, false);
            }
            prefs.save();
            Dialog.close();
        });
    }

    module.exports = {
        init: init
    }
});
