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
        Commands        = brackets.getModule("command/Commands");

    /* Constants */
    var COMMAND_ID  = "bracketslf.link",
        MENU_ITEM_LINK   = "Link File",
        DOC_LANGUAGES = ['html', 'php'],
        LINK_TEMPLATES   = {
            'javascript' : "<script type='text/javascript' src='{RELPATH}'></script>",
            'css' : "<link type='text/css' href='{RELPATH}' rel='stylesheet'>",
            'php' : "include('{RELPATH}');"
        };
  
    /* Functions */
    function findRelativePath(filePath, docPath) {
        // Test if valid file and document paths
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
        // Remove document name from array
        docArray.pop();
        
        // Find the shortest array to iterate
        numIterations = (fileArray.length <= docArray.length) ? fileArray.length : docArray.length;
            
        // Find the last common node 
        for (i = 0; i < numIterations; i++) {
            if (fileArray[i] !== docArray[i]) {
                break;
            }
            lastCommonNode = i;
        }
        //Update each array with uncommon nodes only
        if (lastCommonNode !== null) {
            fileArray = fileArray.slice(lastCommonNode + 1);
            docArray = docArray.slice(lastCommonNode + 1);
        }
        
        // Append needed '../'s to relative path
        for (j = 0; j < docArray.length; j++) {
            relativePath += '../';
        }
        // Append the rest of the relative path
        for (k = 0; k < fileArray.length; k++) {
            relativePath += fileArray[k] + '/';
        }
        // Append file name
        relativePath += fileName;
        
        return relativePath;
    }
    
    function makeLink(relPath, fileLang, docLang) {
        var link = null;
        
        // Find lost parameters
        if (!relPath || !fileLang || !docLang) { return null; }
        // Find if document language is supported
        if ($.inArray(docLang, DOC_LANGUAGES) < 0) { return null; }
        
        // Find if file language is supported
        if (fileLang in LINK_TEMPLATES) {
            // Only link php 'include()' in php documents
            if (fileLang !== 'php' && docLang === 'php') { 
                return null; 
            } else if (fileLang === 'php' && docLang === 'html') {
                return null;
            } else {
                link = LINK_TEMPLATES[fileLang].replace('{RELPATH}', relPath);
            }
        } else {
            return null;
        }
        
        return link;
    }
    
    function linkFile() {
        var selectedFile,
            editor,
            fileLang = null,
            docLang = null,
            filePath = null,
            docPath = null,
            relPath,
            link,
            selection;
        
        // Get the file item selected in project tree
        selectedFile = ProjectManager.getSelectedItem();
        if (selectedFile && !selectedFile.isDirectory) {
            filePath = selectedFile.fullPath;
            // Get the file language
            fileLang = LanguageManager.getLanguageForPath(filePath).getId();
        }
        
        // Get the file of the focused editor
        editor = EditorManager.getFocusedEditor();
        if (editor && !editor.document.isUntitled()) {
            docPath = editor.getFile().fullPath;
            // Get the document language
            docLang = editor.getLanguageForSelection().getId();
        }
        
        // Find the relative path
        relPath = findRelativePath(filePath, docPath);
        
        // Make link with the relative path
        link = makeLink(relPath, fileLang, docLang);
        
        // Write the link in the document
        if (!link) {
            return;
        } else {
            selection = editor.getSelection();
            editor.document.replaceRange(
                link,
                selection.start, 
                selection.end
            );
        }
    }
    
    /* Initialize extension */
    AppInit.appReady(function () {
        var menu;
        
        CommandManager.register(MENU_ITEM_LINK, COMMAND_ID, linkFile);

        menu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        menu.addMenuItem(COMMAND_ID);
    });

});