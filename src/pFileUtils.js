/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* pelatx File Utilities
*/
define(function (require, exports, module) {
    'use strict';

    /* Modules */
    var FileSystem  = brackets.getModule("filesystem/FileSystem"),
        FileUtils   = brackets.getModule("file/FileUtils");

    /* Functions */

    /**
     * Creates a folder.
     * @author pelatx
     * @param   {string} path Full path of folder to create.
     * @returns {object} Promise with folder full path if it fails.
     */
    function mkdir(path) {
        var deferred = new $.Deferred();

        brackets.fs.makedir(path, 755,  function (err) {
            if (err === brackets.fs.ERR_FILE_EXISTS) {
                deferred.resolve();
            } else if (err === brackets.fs.NO_ERROR) {
                deferred.resolve();
            } else {
                deferred.reject(path);
            }
        });
        return deferred.promise();
    }

    /**
     * Copies a file
     * @author pelatx
     * @param   {string} scrPath Full path of the file.
     * @param   {string} destDir Full path of the destination folder.
     * @param   {string} name    Name of the new file.
     * @returns {object} Promise with source file full path if it fails.
     */
    function copyFile(scrPath, destDir, name) {
        var scrName, destPath, deferred = new $.Deferred();

        destPath = destDir + name;
        brackets.fs.copyFile(scrPath, destPath, function (err) {
            if (err) {
                deferred.reject(scrPath);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    /**
     * Copies a folder with recursion for inner folders.
     * @author pelatx
     * @param   {string} scrPath  Full path of the source folder.
     * @param   {string} destPath Full path of the destination folder.
     * @param   {string} name     Name of the new folder.
     * @returns {object} Promise with an array of failed to copy files (not implemented yet).
     */
    function copyFolder(scrPath, destPath, name) {
        var i, scrName, scrDir, newDir, unsavedFiles = [],
            deferred = new $.Deferred();
        var pushUnsaved = function (path) {
            unsavedFiles.push(path);
        };

        newDir = destPath + name + "/";

        //Creates the new directory if not exists.
        mkdir(newDir)
            .fail(function () {
                deferred.reject();
            })
            .done(function () {
                scrDir = FileSystem.getDirectoryForPath(scrPath);
                scrDir.getContents(function (err, entries) {
                    var fullPath, baseName;
                    for (i = 0; i < entries.length; i++) {
                        fullPath = entries[i].fullPath;
                        baseName = FileUtils.getBaseName(fullPath);
                        if (entries[i].isDirectory) {
                            copyFolder(fullPath, newDir, baseName);
                        } else {
                            copyFile(fullPath, newDir, baseName)
                                .fail(pushUnsaved(fullPath));
                        }
                    }
                });
            });
        return deferred.promise(unsavedFiles);
    }

    /**
     * Copies an item (file or folder).
     * @author pelatx
     * @param   {string}  scrPath  Full path of file or folder.
     * @param   {string}  destPath Full path of destination folder.
     * @param   {string}  name     Name of new file or folder.
     * @returns {object}  Promise with the new folder or file fullpath.
     */
    function copy(scrPath, destPath, name) {
        var deferred = new $.Deferred();
        // Determines whether file or directory and acts accordingly.
        if (scrPath.substr(-1) === "/") {
            copyFolder(scrPath, destPath, name).then(
                function () {
                    deferred.resolve(destPath + name + "/");
                },
                function () {
                    deferred.reject();
                }
            );
        } else {
            copyFile(scrPath, destPath, name).then(
                function () {
                    deferred.resolve(destPath + name);
                },
                function () {
                    deferred.reject();
                }
            );
        }
        return deferred.promise();
    }

    /* Exports */
    exports.mkdir = mkdir;
    exports.copy = copy;
});
