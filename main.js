/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File
*/
define(function (require, exports, module) {
    'use strict';
    
    /* Modules */
    var AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        Menus           = brackets.getModule("command/Menus"),
        Commands        = brackets.getModule("command/Commands"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        File            = require("src/pFileUtils"),
        Dialog          = require("src/pFSD/pFileSelectionDialog");

    /* Constants */
    var COMMAND_ID  = "bracketslf.link",
        MENU_ITEM_LINK   = "Link File",
        DOC_LANGUAGES = ['html', 'php', 'css'],
        LINK_TEMPLATES   = {
            'javascript' : '<script type="text/javascript" src="{RELPATH}"></script>',
            'css' : '<link type="text/css" href="{RELPATH}" rel="stylesheet">',
            'php' : "include('{RELPATH}');",
            'image' : {
                'html' : '<img src="{RELPATH}" alt="" height="" width="">',
                'css' : 'url("{RELPATH}")'
            }
        };
  
    /* Functions */

    /**
     * Find the relative path between two absolute paths.
     * @author pelatx
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
     * @author pelatx
     * @param   {string} relPath  Relative path.
     * @param   {string} fileLang Type/Language of the target file.
     * @param   {string} docLang  Type/Language of the focused document.
     * @returns {string} A tag that links the file.
     */
    function makeLink(relPath, fileLang, docLang) {
        var link = null;
        
        // Finds lost parameters.
        if (!relPath || !fileLang || !docLang) { return null; }
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
     * Recognizes the two different ways to use the extension
     * and performs the necessary actions.
     * @author pelatx
     * @returns {object} Promise with an array of file objects.
     */
    function chooseFile() {
        var files = [],
            counter = 0,
            filePath = null,
            fileLang = null,
            fileName = null,
            deferred = new $.Deferred(),
            selectedItem = ProjectManager.getSelectedItem();

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
        return deferred.promise();
    }

    /**
     * Puts it all together and writes in fact the links in the document.
     * @author pelatx
     */
    function linkFile() {
        var editor,
            docLang = null,
            docPath = null,
            relPath,
            link,
            selection;
        
        // Gets the file of focused editor
        editor = EditorManager.getFocusedEditor();
        if (editor && !editor.document.isUntitled()) {
            docPath = editor.getFile().fullPath;
            // Gets the document language
            docLang = editor.getLanguageForSelection().getId();
        }
        
        // Gets item selected in project tree or choosed from filesystem
        chooseFile().done(function (files) {
            if (files.length > 0) {
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
    
    /* Initializes extension */
    AppInit.appReady(function () {
        var menu;
        
        CommandManager.register(MENU_ITEM_LINK, COMMAND_ID, linkFile);

        menu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        menu.addMenuItem(COMMAND_ID);
    });

});
