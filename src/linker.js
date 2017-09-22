/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Link File Linker
*/
define(function Linker(require, exports, module) {
    'use strict';

    var LanguageManager = brackets.getModule("language/LanguageManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        FileUtils       = brackets.getModule("file/FileUtils");

    var DOC_LANGUAGES = ['html', 'php', 'css'],
        TAG_TEMPLATES = {
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
        if (fileLang in TAG_TEMPLATES) {
            // Only links php 'include()' in php documents.
            if (fileLang !== 'php' && docLang === 'php') {
                return null;
            } else if (fileLang === 'php' && docLang === 'html') {
                return null;
            } else if (fileLang !== 'image' && docLang === 'css') {
                return null;
            } else {
                if (fileLang === 'image') {
                    tag = TAG_TEMPLATES[fileLang][docLang].replace('{RELPATH}', relPath);
                } else if (fileLang === 'audio') {
                    tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{TYPE}', AUDIO_EXTENSIONS[fileExt]);
                } else if (fileLang === 'video') {
                    tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath).replace('{TYPE}', VIDEO_EXTENSIONS[fileExt]);
                } else {
                    tag = TAG_TEMPLATES[fileLang].replace('{RELPATH}', relPath);
                }
            }
        } else {
            return null;
        }
        return tag;
    }

    function getTagsFromFiles(filePaths) {
        var tags = [],
            tag,
            relPath,
            fileLang,
            editor = EditorManager. getActiveEditor(),
            docPath = editor.getFile().fullPath,
            docLang = editor.getLanguageForSelection().getId();

        for (var i = 0; i < filePaths.length; i++) {
            relPath = findRelativePath(filePaths[i], docPath);
            fileLang = LanguageManager.getLanguageForPath(filePaths[i]).getId();
            tag = createTag(relPath, fileLang, docLang);
            tags.push(tag);
        }
        if (filePaths.length === 1) {
            return tags[0];
        } else {
            return tags;
        }
    }

    function insertTags(tags) {
        var editor = EditorManager. getActiveEditor();

        for (var i = 0; i < tags.length; i++) {
            if (i < tags.length - 1) {
                tags[i] += "\n";
            }
            var selection = editor.getSelection();
            editor.document.replaceRange(
                tags[i],
                selection.start,
                selection.end
            );
        }
    }

    module.exports = {
        findRelativePath: findRelativePath,
        createTag: createTag,
        getTagsFromFiles: getTagsFromFiles,
        insertTags: insertTags
    }
});
