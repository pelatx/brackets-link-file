/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File
*/
define(function (require, exports, module) {
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
        Dialog              = require("src/pFSD/pFileSelectionDialog"),
        DropArea            = require("src/dropArea"),
        Watcher             = require("src/watcher"),
        Strings             = require("strings");

    /* Constants */
    var CMD_LINK  = "bracketslf.link",
        CMD_SET_DROP_DEST = "bracketslf.dropdest",
        CMD_TOGGLE_DROP = "bracketslf.toggledrop",
        CMD_TOGGLE_WATCH = "bracketslf.togglewatch",

        MENU_ITEM_LINK   = Strings.INSERT_TAGS,
        MENU_ITEM_DROP_DEST = Strings.DROP_AREA_DEST,
        MENU_ITEM_DROP_VIEW = Strings.DROP_AREA,
        MENU_ITEM_WATCH = Strings.WATCHER,

        DROPAREA_PREF = "droparea",
        WATCHER_PREF = "watchproject",

        DOC_LANGUAGES = ['html', 'php', 'css'],
        LINK_TEMPLATES = {
            'javascript' : '<script type="text/javascript" src="{RELPATH}"></script>',
            'css' : '<link type="text/css" href="{RELPATH}" rel="stylesheet">',
            'php' : "include('{RELPATH}');",
            'image' : {
                'html' : '<img src="{RELPATH}" alt="" height="" width="">',
                'css' : 'url("{RELPATH}");'
            },
            'audio': '<audio controls src="{RELPATH}" type="audio/{TYPE}"></audio>',
            'video': '<video controls width="" height="" src="{RELPATH}" type="video/{TYPE}"></video>'
        },
        AUDIO_EXTENSIONS = {
            'ogg': 'ogg',
            'mp3': 'mpeg',
            'wav': 'wav'
        },
        VIDEO_EXTENSIONS = {
            'mp4': 'mp4',
            'ogg': 'ogg',
            'ogv': 'ogg',
            'webm': 'webm'
        };


    /* Preferences */
    var prefs = PreferencesManager.getExtensionPrefs("brackets.linkfile");


    /* Functions */

    /**
     * Find the relative path between two absolute paths.
     * @param   {string} filePath Target file path.
     * @param   {string} docPath  Path of the file that is focused in the editor.
     * @returns {string} Relative path.
     */
    function findRelativePath(filePath, docPath) {
        // Tests if valid file and document paths
        if (!filePath || !docPath) { return null; }
        // Don't link document to itself
        if (filePath === docPath) { return null; }

        var i, j, k,
            numIterations,
            lastCommonNode = null,
            relativePath = '',
            fileArray   = filePath.split('/'),
            docArray    = docPath.split('/'),
            // Keep file name but remove from array
            fileName    = fileArray.pop();

        // Remove the first empty item created by split('/')    
        fileArray.shift();
        docArray.shift();
        // Removes document name from array
        docArray.pop();

        // Find the shortest array to iterate
        numIterations = (fileArray.length <= docArray.length) ? fileArray.length : docArray.length;

        // Finds the last common node
        for (i = 0; i < numIterations; i++) {
            if (fileArray[i] !== docArray[i]) {
                break;
            }
            lastCommonNode = i;
        }
        //Updates each array with uncommon nodes only
        if (lastCommonNode !== null) {
            fileArray = fileArray.slice(lastCommonNode + 1);
            docArray = docArray.slice(lastCommonNode + 1);
        }

        // Appends needed '../'s to relative path
        for (j = 0; j < docArray.length; j++) {
            relativePath += '../';
        }
        // Appends the rest of the relative path
        for (k = 0; k < fileArray.length; k++) {
            relativePath += fileArray[k] + '/';
        }
        // Appends file name
        relativePath += fileName;

        return relativePath;
    }

    /**
     * Configures and creates the tag with the relative path,
     * depending on the file types.
     * @param   {string} relPath  Relative path.
     * @param   {string} fileLang Type/Language of the target file.
     * @param   {string} docLang  Type/Language of the focused document.
     * @returns {string} A tag that links the file.
     */
    function makeLink(relPath, fileLang, docLang) {
        var link = null, fileExt = null;

        // Finds lost parameters.
        if (!relPath || !fileLang || !docLang) { return null; }
        // If It is an audio file, save file extension.
        if (fileLang === "audio") {
            fileExt = FileUtils.getFileExtension(relPath);
        }
        // If Brackets don't know the file language, looks if It is video.
        if (fileLang === "unknown" || fileLang === "binary") {
            fileExt = FileUtils.getFileExtension(relPath);
            if (fileExt in VIDEO_EXTENSIONS) { fileLang = "video"; }
        }
        // If It is SVG file, treats it like an image.
        if (fileLang === "svg") { fileLang = "image"; }
        // Finds if document language is supported.
        if ($.inArray(docLang, DOC_LANGUAGES) < 0) { return null; }

        // Finds if file language is supported.
        if (fileLang in LINK_TEMPLATES) {
            // Only links php 'include()' in php documents.
            if (fileLang !== 'php' && docLang === 'php') {
                return null;
            } else if (fileLang === 'php' && docLang === 'html') {
                return null;
            } else if (fileLang !== 'image' && docLang === 'css') {
                return null;
            } else {
                if (fileLang === 'image') {
                    link = LINK_TEMPLATES[fileLang][docLang].replace('{RELPATH}', relPath);
                } else if (fileLang === 'audio') {
                    link = LINK_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{TYPE}', AUDIO_EXTENSIONS[fileExt]);
                } else if (fileLang === 'video') {
                    link = LINK_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{TYPE}', VIDEO_EXTENSIONS[fileExt]);
                } else {
                    link = LINK_TEMPLATES[fileLang].replace('{RELPATH}', relPath);
                }
            }
        } else {
            return null;
        }
        return link;
    }

    /**
     * Recognizes the three different ways to use the extension
     * and performs the necessary actions.
     * @param   {Array}  filesFromDrop Array of file paths comming from a drag&drop operation.
     * @returns {object} Promise with an array of file objects.
     */
    function selectModeAndRun(filesFromDrop) {
        var files = [],
            counter = 0,
            filePath = null,
            fileLang = null,
            fileName = null,
            deferred = new $.Deferred(),
            selectedItem = ProjectManager.getSelectedItem();

        // If files dropped in drop area.
        if (filesFromDrop && $.isArray(filesFromDrop) && filesFromDrop.length > 0) {
            var destPath = DropArea.getDestinationPath();
            // Copies every selected file to project directory
            // and adds a file object to files array for each.
            filesFromDrop.forEach(function (entry) {
                fileName = FileUtils.getBaseName(entry);
                File.copy(entry, destPath, fileName).done(function (newFile) {
                    fileLang = LanguageManager.getLanguageForPath(newFile).getId();
                    files.push({
                        path: newFile,
                        lang: fileLang
                    });
                    // Don't resolve until all entries are in the files array.
                    counter++;
                    if (counter === filesFromDrop.length) {
                        deferred.resolve(files);
                    }
                });
            });
        } else {
            if (selectedItem) {
                // If file, pushes full path and language object
                // to files array and resolves.
                if (!selectedItem.isDirectory) {
                    filePath = selectedItem.fullPath;
                    fileLang = LanguageManager.getLanguageForPath(filePath).getId();
                    files.push({
                        path: filePath,
                        lang: fileLang
                    });
                    deferred.resolve(files);
                    // If directory, shows files selection dialog.
                } else {
                    Dialog.show("Add files to project").done(function (entries) {
                        if (entries.length > 0) {
                            // Copies every selected file to project directory
                            // and adds a file object to files array for each.
                            entries.forEach(function (entry) {
                                fileName = FileUtils.getBaseName(entry);
                                File.copy(entry, selectedItem.fullPath, fileName).done(function (newFile) {
                                    fileLang = LanguageManager.getLanguageForPath(newFile).getId();
                                    files.push({
                                        path: newFile,
                                        lang: fileLang
                                    });
                                    // Don't resolve until all entries are in the files array.
                                    counter++;
                                    if (counter === entries.length) {
                                        deferred.resolve(files);
                                    }
                                });
                            });
                        }
                    });
                }
            } else {
                deferred.reject();
            }
        }
        return deferred.promise();
    }

    /**
     * Puts it all together and writes in fact the links in the document.
     * @param {Array} droppedFiles Array of file paths comming from a drag&drop operation.
     */
    function linkFile(droppedFiles) {
        var editor,
            docLang = null,
            docPath = null,
            relPath,
            link,
            selection;

        // Gets the file of focused editor
        editor = EditorManager. getActiveEditor();
        if (editor && !editor.document.isUntitled()) {
            MainViewManager.focusActivePane();
            docPath = editor.getFile().fullPath;
            // Gets the document language
            docLang = editor.getLanguageForSelection().getId();
        }

        // Gets item selected in project tree or choosed from filesystem
        selectModeAndRun(droppedFiles).done(function (files) {
            if (files.length > 0) {
                ProjectManager.refreshFileTree();
                for (var i = 0; i < files.length; i++) {
                    // Finds the relative path
                    relPath = findRelativePath(files[i].path, docPath);
                    // Makes link with the relative path
                    link = makeLink(relPath, files[i].lang, docLang);
                    if (link) {
                        if (i < files.length - 1) {
                            link += "\n";
                        }
                        // Writes links in the document
                        selection = editor.getSelection();
                        editor.document.replaceRange(
                            link,
                            selection.start,
                            selection.end
                        );
                    }
                }
            }
        });
    }

    /**
     * Enables the drop area.
     */
    function enableDropArea() {
        DropArea.show();
        DropArea.initListeners(linkFile);
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

        CommandManager.register(MENU_ITEM_LINK, CMD_LINK, linkFile);
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
        CommandManager.register(MENU_ITEM_DROP_VIEW, CMD_TOGGLE_DROP, toggleDropArea);
        CommandManager.register(MENU_ITEM_WATCH, CMD_TOGGLE_WATCH, function () {
            if (prefs.get(WATCHER_PREF) === true) {
                Watcher.stop();
                CommandManager.get(CMD_TOGGLE_WATCH).setChecked(false);
                prefs.set(WATCHER_PREF, false);
                prefs.save();
            } else {
                Watcher.start(findRelativePath);
                CommandManager.get(CMD_TOGGLE_WATCH).setChecked(true);
                prefs.set(WATCHER_PREF, true);
                prefs.save();
            }
        });

        contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        contextMenu.addMenuItem(CMD_LINK);
        contextMenu.addMenuItem(CMD_SET_DROP_DEST);

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
            Watcher.start(findRelativePath);
            CommandManager.get(CMD_TOGGLE_WATCH).setChecked(true);
        } else {
            Watcher.stop();
            CommandManager.get(CMD_TOGGLE_WATCH).setChecked(false);
        }
    });
});
