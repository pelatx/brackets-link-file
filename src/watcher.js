/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File Watcher.
*/
define(function Watcher(require, exports, module) {
    'use strict';

    var EditorManager   = brackets.getModule("editor/EditorManager"),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        ProjectManager  = brackets.getModule("project/ProjectManager");

    var Linker          = require("./linker");

    // Regexps
    var REGEXPS = {
        'javascript':   /<script\b[^>]*>([\s\S]*?)<\/script>/g,
        'image':        [/<img\b[^>]*>([\s\S]*?)>{0}/g, /url([\s\S]*?)\).*/g],
        'css':          [/<link\b[^>]*>([\s\S]*?)>{0}/g, /@import([\s\S]*?)\).*;{0}/g],
        'php':          /[include|include_once|require|require_once]([\s\S]*?).*;{0}/g,
        'audio':        /<audio\b[^>]*>([\s\S]*?)<\/audio>/g,
        'video':        /<video\b[^>]*>([\s\S]*?)<\/video>/g,
        'font':         /url([\s\S]*?)\).*/g
    };

    var VIDEO_EXTENSIONS = ['mp4', 'ogg', 'ogv', 'webm'],
        FONT_EXTENSIONS = ['eot', 'otf', 'woff', 'woff2', 'ttf', 'svg'];

    // Project files storages
    var _watchedFiles = [],
        _watchedFilesCache = [];

    /**
     * Compares cached project files with current.
     * @private
     * @returns {Array} Full path strings of removed files.
     */
    function _compareFiles() {
        var removedFiles = [];
        _watchedFilesCache.forEach(function (file) {
            if ($.inArray(file, _watchedFiles) === -1) {
                removedFiles.push(file.fullPath);
            }
        });
        return removedFiles;
    }

    /**
     * Removes matched links/tags from text.
     * @private
     * @param   {string} relPath  Relative path.
     * @param   {string} docText  Text of a document to be changed.
     * @param   {string} fileLang Language of the file link to be removed.
     * @returns {string} Text with links/tags removed.
     */
    function _removeLinks(relPath, docText, fileLang) {
        if (fileLang === "unknown" || fileLang === "binary") {
            var fileExt = FileUtils.getFileExtension(relPath);
            if ($.inArray(fileExt, VIDEO_EXTENSIONS) > -1) { fileLang = "video"; }
            if ($.inArray(fileExt, FONT_EXTENSIONS) > -1) { fileLang = "font"; }
        }
        if (fileLang === "svg") { fileLang = "image"; }

        var regexp;
        if (fileLang === "image" || fileLang === "css") {
            var editor = EditorManager. getActiveEditor();
            var docLang = editor.getLanguageForSelection().getId();
            if (docLang === "html") {
                regexp = REGEXPS[fileLang][0];
            } else {
                regexp = REGEXPS[fileLang][1];
            }
        } else {
            regexp = REGEXPS[fileLang];
        }

        var links = docText.match(regexp);
        if (links && links.length > 0) {
            links.forEach(function (link) {
                if (link.indexOf(relPath) !== -1) {
                    docText = docText.replace(link, "");
                }
            });
        }
        return docText;
    }

    /**
     * Project files change (add, remove ...) handler.
     * @private
     * @param {object} ev    Event object (not used).
     * @param {object} entry Brackets filesystem object (file or directory type).
     */
    function _onChange(ev, entry) {
        if (entry && entry.isDirectory) {
            ProjectManager.getAllFiles().done(function (files) {
                _watchedFiles = files.slice(0);
                var removedFiles = _compareFiles();
                if (removedFiles.length > 0) {
                    removedFiles.forEach(function (filePath) {
                        var editor = EditorManager. getActiveEditor();
                        if (editor) {
                            var cursorPos = editor.getCursorPos();
                            var fileLang = LanguageManager.getLanguageForPath(filePath).getId();
                            var relPath = Linker.findRelativePath(filePath, editor.getFile().fullPath);
                            var docText = editor.document.getText();
                            var newText = _removeLinks(relPath, docText, fileLang);
                            editor.document.replaceRange(
                                newText,
                                {line: 0, ch: 0},
                                {line: 9999, ch: 9999}
                            );
                            editor.setCursorPos(cursorPos.line, cursorPos.ch);
                        }
                    });
                }
                _watchedFilesCache = files.slice(0);
            });
        }
    }

    /**
     * Project file rename handler.
     * @private
     * @param {object} ev      Event object (not used).
     * @param {string} oldPath Full path before file was renamed.
     * @param {string} newPath New file full path.
     */
    function _onRename(ev, oldPath, newPath) {
        var editor = EditorManager. getActiveEditor();
        if (editor) {
            var cursorPos = editor.getCursorPos();
            var fileLang = LanguageManager.getLanguageForPath(oldPath).getId();
            var relPath = Linker.findRelativePath(oldPath, editor.getFile().fullPath);
            var docText = editor.document.getText();
            var newText = _removeLinks(relPath, docText, fileLang);
            editor.document.replaceRange(
                newText,
                {line: 0, ch: 0},
                {line: 9999, ch: 9999}
            );
            editor.setCursorPos(cursorPos.line, cursorPos.ch);
            var newTag = Linker.getTagsFromFiles([newPath]);
            Linker.insertTags(newTag);
        }
    }

    /**
     * Starts the project files watcher.
     * Sets the scanning every two seconds for removed files and
     * remove links/tags, if any.
     */
    function start() {
        ProjectManager.getAllFiles().done(function (files) {
            _watchedFilesCache = files.slice(0);

            ProjectManager.on("projectOpen.blfwatcher", function () {
                ProjectManager.getAllFiles().done(function (files) {
                    _watchedFilesCache = files.slice(0);
                });
            });

            FileSystem.on("change.blfwatcher", _onChange);
            FileSystem.on("rename.blfwatcher", _onRename);
        });
    }

    /**
     * Stops the project files watcher.
     */
    function stop() {
        FileSystem.off("change.blfwatcher");
        FileSystem.off("rename.blfwatcher");
        ProjectManager.off("projectOpen.blfwatcher");
        _watchedFiles = [];
        _watchedFilesCache = [];
    }

    module.exports = {
        start: start,
        stop: stop
    };
});
