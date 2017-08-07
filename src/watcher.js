/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Brackets Link File Watcher.
*/
define(function (require, exports, module) {
    'use strict';

    var EditorManager   = brackets.getModule("editor/EditorManager"),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager");

    // Regexps
    var REGEXPS = {
        'javascript':   /<script\b[^>]*>([\s\S]*?)<\/script>/g,
        'image':        [/<img\b[^>]*>([\s\S]*?)>{0}/g, /url([\s\S]*?).*;{0}/g],
        'css':          /<link\b[^>]*>([\s\S]*?)>{0}/g,
        'php':          /[include|include_once|require|require_once]([\s\S]*?).*;{0}/g,
        'audio':        /<audio\b[^>]*>([\s\S]*?)<\/audio>/g,
        'video':        /<video\b[^>]*>([\s\S]*?)<\/video>/g
    };

    var VIDEO_EXTENSIONS = ['mp4', 'ogg', 'ogv', 'webm'];

    // Project files stores
    var _watchedFiles = [],
        _watchedFilesCache = [];

    // Watcher functions
    var _intervalFunc,
        _projectChangeFunc;

    function _compareFiles() {
        var removedFiles = [];
        _watchedFilesCache.forEach(function (file) {
            if ($.inArray(file, _watchedFiles) === -1) {
                removedFiles.push(file.fullPath);
            }
        });
        return removedFiles;
    }

    function _removeLinks(relPath, docText, fileLang) {
        if (fileLang === "unknown" || fileLang === "binary") {
            var fileExt = FileUtils.getFileExtension(relPath);
            if ($.inArray(fileExt, VIDEO_EXTENSIONS) > -1) { fileLang = "video"; }
        }
        if (fileLang === "svg") { fileLang = "image"; }

        var regexp;
        if (fileLang === "image") {
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

    function start(findRelativePathFunc) {
        ProjectManager.getAllFiles().done(function (files) {
            _watchedFilesCache = files.slice(0);

            _intervalFunc = setInterval(function () {
                ProjectManager.getAllFiles().done(function (files) {
                    _watchedFiles = files.slice(0);
                    var removedFiles = _compareFiles();
                    if (removedFiles.length > 0) {
                        removedFiles.forEach(function (filePath) {
                            var editor = EditorManager. getActiveEditor();
                            if (editor) {
                                var fileLang = LanguageManager.getLanguageForPath(filePath).getId();
                                var relPath = findRelativePathFunc(filePath, editor.getFile().fullPath);
                                var docText = editor.document.getText();
                                var newText = _removeLinks(relPath, docText, fileLang);
                                editor.document.replaceRange(
                                    newText,
                                    {line: 0, ch: 0},
                                    {line: 9999, ch: 9999}
                                );
                            }
                        });
                    }
                    _watchedFilesCache = files.slice(0);
                });
            }, 2000);

            _projectChangeFunc = function () {
                ProjectManager.getAllFiles().done(function (files) {
                    _watchedFilesCache = files.slice(0);
                });
            }
            ProjectManager.on("projectOpen", _projectChangeFunc);
        });
    }

    function stop() {
        clearInterval(_intervalFunc);
        ProjectManager.off("projectOpen", _projectChangeFunc);
    }

    module.exports = {
        start: start,
        stop: stop
    };
});
