/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File Linker.
*/
define(function Linker(require, exports, module) {
    'use strict';

    var LanguageManager = brackets.getModule("language/LanguageManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        FileUtils       = brackets.getModule("file/FileUtils");

    var DOC_LANGUAGES = {
        'html': ['javascript', 'css', 'image', 'audio', 'video'],
        'php': ['php'],
        'css': ['image', 'font', 'css']
    },
        TAG_TEMPLATES = {
            'javascript' : '<script type="text/javascript" src="{RELPATH}"></script>',
            'css' : {
                html: '<link type="text/css" href="{RELPATH}" rel="stylesheet">',
                css: '@import url("{RELPATH}");'
            },
            'php' : "include('{RELPATH}');",
            'image' : {
                'html' : '<img src="{RELPATH}" alt="" height="" width="">',
                'css' : 'url("{RELPATH}")'
            },
            'audio': '<audio controls src="{RELPATH}" type="audio/{TYPE}"></audio>',
            'video': '<video controls width="" height="" src="{RELPATH}" type="video/{TYPE}"></video>',
            'font': 'url("{RELPATH}"){FORMAT}'
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
        },
        FONT_EXTENSIONS = {
            'eot': ' format("embedded-opentype")',
            'otf': '',
            'woff': ' format("woff")',
            'woff2': ' format("woff2")',
            'ttf': ' format("truetype")',
        };

    /**
     * Find the relative path between two absolute paths.
     * @param   {string} filePath Target file path.
     * @param   {string} docPath  Path of the file that is focused in the editor.
     * @returns {string} Relative path or null.
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
     * @returns {string} A tag that links the file or null.
     */
    function createTag(relPath, fileLang, docLang) {
        var tag = null, fileExt = null;

        // Finds lost parameters.
        if (!relPath || !fileLang || !docLang) { return null; }

        // If It is an audio/unknown/binary file, save file extension
        // and configure fileLang properly.
        if (fileLang === "audio" || fileLang === "unknown" || fileLang === "binary") {
            fileExt = FileUtils.getFileExtension(relPath);
            if (VIDEO_EXTENSIONS.hasOwnProperty(fileExt)) { fileLang = "video"; }
            if (FONT_EXTENSIONS.hasOwnProperty(fileExt)) { fileLang = "font"; }
        }
        // If It is SVG file, treats it like an image.
        if (fileLang === "svg") { fileLang = "image"; }

        // Finds if document language is supported.
        if (!DOC_LANGUAGES.hasOwnProperty(docLang)) { return null; }

        // Finds if file language is supported in this document.
        if ($.inArray(fileLang, DOC_LANGUAGES[docLang]) < 0) { return null; }

        // Tag creation logic.
        switch (fileLang) {
            case 'image':
            case 'css':
                tag = TAG_TEMPLATES[fileLang][docLang].replace('{RELPATH}', relPath);
                break;
            case 'audio':
                tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{TYPE}', AUDIO_EXTENSIONS[fileExt]);
                break;
            case 'video':
                tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{TYPE}', VIDEO_EXTENSIONS[fileExt]);
                break;
            case 'font':
                tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{FORMAT}', FONT_EXTENSIONS[fileExt]);
                break;
            default:
                tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath);
        }

        return tag;
    }

    /**
     * Creates tags from file full paths.
     * @param   {Array} filePaths File full path strings.
     * @returns {Array} Tag strings.
     */
    function getTagsFromFiles(filePaths) {
        var tags = [],
            tag,
            relPath,
            fileLang,
            editor = EditorManager. getActiveEditor();

        if (filePaths && editor && !editor.document.isUntitled()) {
            var docPath = editor.getFile().fullPath,
                docLang = editor.getLanguageForSelection().getId();

            for (var i = 0; i < filePaths.length; i++) {
                relPath = findRelativePath(filePaths[i], docPath);
                fileLang = LanguageManager.getLanguageForPath(filePaths[i]).getId();
                tag = createTag(relPath, fileLang, docLang);
                if (tag) { tags.push(tag); }
            }
        }
        return tags;
    }

    /**
     * Creates tags from URLs.
     * @param   {Array} urls URL strings.
     * @returns {Array} Tag strings.
     */
    function getTagsFromUrls(urls) {
        var tags = [],
            tag,
            fileExt, fileLang,
            editor = EditorManager.getActiveEditor();


        if (urls && editor && !editor.document.isUntitled()) {
            var docPath = editor.getFile().fullPath,
                docLang = editor.getLanguageForSelection().getId();

            for (var i = 0; i < urls.length; i++) {
                fileExt = FileUtils.getFileExtension(urls[i]).toLowerCase();
                fileLang = LanguageManager.getLanguageForExtension(fileExt);
                if (fileLang) {
                    fileLang = fileLang.getId();
                } else {
                    fileLang = "unknown";
                }
                tag = createTag(urls[i], fileLang, docLang);
                if (tag) { tags.push(tag); }
            }
        }
        return tags;
    }

    /**
     * Place tags in active document.
     * @param {Array} tags Tag strings.
     */
    function insertTags(tags) {
        var editor = EditorManager. getActiveEditor();

        if (tags && editor && !editor.document.isUntitled()) {
            for (var i = 0; i < tags.length; i++) {
                //if (i < tags.length - 1) {
                    tags[i] += "\n";
                //}
                var selection = editor.getSelection();
                editor.document.replaceRange(
                    tags[i],
                    selection.start,
                    selection.end
                );
            }
        }
    }

    module.exports = {
        findRelativePath: findRelativePath,
        createTag: createTag,
        getTagsFromFiles: getTagsFromFiles,
        getTagsFromUrls: getTagsFromUrls,
        insertTags: insertTags
    }
});
