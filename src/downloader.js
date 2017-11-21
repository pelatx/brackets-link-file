/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Link File Downloader
*/
define(function Downloader(require, exports, module) {
    'use strict';

    var Dialogs         = brackets.getModule("widgets/Dialogs"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        Mustache        = brackets.getModule("thirdparty/mustache/mustache");

    var Linker          = require("./linker"),
        Strings         = require("strings");

    var HeaderTemplate  = require("text!templates/cdnLibsHeader.html"),
        LibsTemplate    = require("text!templates/cdnLibsList.html"),
        LibTemplate     = require("text!templates/cdnLibsListItem.html"),
        VersionTemplate = require("text!templates/cdnLibVersionLink.html"),
        FileTemplate    = require("text!templates/cdnLibFileLink.html");

    var apiURL = "https://api.jsdelivr.com/v1/jsdelivr/libraries",
        cdnURL = "https://cdn.jsdelivr.net/";

    var moduleDirPath = FileUtils.getNativeModuleDirectoryPath(module);

    var _libraryList = null;

    /**
     * Returns the list of available libraries.
     * @private
     * @returns {object} A promise with an array of lib objects on success.
     */
    function _getLibraryList() {
        var deferred = new $.Deferred(),
            requestURL = apiURL + "?fields=name,mainfile,versions,description,author,github,homepage";

        if (_libraryList === null) {
            $.getJSON(requestURL).done(function (libs) {
                libs.sort(function (a, b) {
                    var a1 = a.name.toUpperCase(),
                        b1 = b.name.toUpperCase();
                    if (a1 == b1) return 0;
                    return a1 > b1 ? 1 : -1;
                });
                _libraryList = libs;
                deferred.resolve();
            }).fail(function () {
                deferred.reject();
            });
        } else {
            // To let the loading message appear in the dialog.
            setTimeout(function () {
                deferred.resolve();
            }, 300);
        }
        return deferred.promise();
    }

    /**
     * Retrieves the file list of the specified library and version.
     * @private
     * @param   {string} libName Library name.
     * @param   {string} version Library version.
     * @returns {object} Promise with the file list array on succes.
     */
    function _getLibraryFiles(libName, version) {
        var deferred = new $.Deferred(),
            requestURL = apiURL + "/" + libName + "/" + version;

        $.getJSON(requestURL).done(function (files) {
            deferred.resolve(files);
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }

    /**
     * Gets the library text content from CDN.
     * @private
     * @param   {string} url Library CDN URL .
     * @returns {string} Library text content.
     */
    function _getLibraryContent(url) {
        var deferred = new $.Deferred(),
            fileExt = FileUtils.getFileExtension(url);

        $.get(url).done(function (data) {
            deferred.resolve(data);
        }).fail(function (res) {
            if (res.responseText && res.status == "200") {
                deferred.resolve(res.responseText);
            } else {
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    /**
     * Creates the library list HTML to be displayed in a dialog.
     * @private
     * @param   {Array}  libs Array of library objects.
     * @returns {string} Library list HTML.
     */
    function _renderLibraries(libs) {
        var iconsDir = moduleDirPath + "/../styles/icons/",
            downloadIconPath = iconsDir + "ionicons-download.png",
            linkIconPath = iconsDir + "ionicons-link.png",
            navIconPath = iconsDir + "ionicons-navicon-round.png",
            filesIconPath = iconsDir + "ionicons-document-text.png";

        var listItems = "";
        for (var i = 0; i < libs.length; i++) {
            var cleanMainFile = FileUtils.getBaseName(libs[i].mainfile);

            listItems += Mustache.render(LibTemplate, {
                libName: libs[i].name,
                qLibFile: libs[i].mainfile,
                mainFile: libs[i].mainfile,
                libFile: cleanMainFile,
                libVersion: libs[i].versions[0],
                lastVersionLabel: Strings.CDN_LAST_VERSION,
                libDescription: libs[i].description,
                libAuthor: libs[i].author,
                libHomepage: libs[i].homepage,
                libGithub: libs[i].github,
                downloadIconPath: downloadIconPath,
                linkIconPath: linkIconPath,
                navIconPath: navIconPath,
                filesIconPath: filesIconPath
            });
        }
        return Mustache.render(LibsTemplate, { listItems: listItems });
    }

    /**
     * Creates the versions list HTML to be displayed for a library.
     * @private
     * @param   {object} $lib JQuery object containing the 'li' of the library.
     * @returns {string} Versions HTML.
     */
    function _renderVersions($lib) {
        var libName = $lib.attr("id"),
            versions = "";

        for (var i = 0; i < _libraryList.length; i++) {
            if (_libraryList[i].name === libName) {
                for (var j = 0; j < _libraryList[i].versions.length; j++) {
                    versions += Mustache.render(VersionTemplate, { version: _libraryList[i].versions[j] });
                }
            }
        }
        return versions;
    }

    /**
     * Creates the files list HTML to be displayed for a library.
     * @private
     * @param   {object} $lib JQuery object containing the library 'li' element.
     * @returns {object} Promise with the files HTML string on success.
     */
    function _renderFiles($lib) {
        var libName = $lib.attr("id"),
            version = $lib.find("span.blf-lib-version").text().replace(/[()]/g, ""),
            rendered = "", deferred = new $.Deferred();

        _getLibraryFiles(libName, version).done(function (files) {
            for (var i = 0; i < files.length; i++) {
                rendered += Mustache.render(
                    FileTemplate,
                    {
                        qfile: files[i],
                        file: FileUtils.getBaseName(files[i])
                    }
                );
            }
            deferred.resolve(rendered);
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }

    /**
     * Shows the library selection dialog.
     * @private
     * @returns {object} A promise with a custom library object on success.
     */
    function _showDialog() {
        var listDialog, libObject, btnCancel,
            deferred = new $.Deferred();

        listDialog = Dialogs.showModalDialog(
            brackets.DIALOG_ID_SAVE_CLOSE,
            Mustache.render(HeaderTemplate, {
                title: Strings.CDN_HEADER_TITLE,
                placeholder: Strings.CDN_HEADER_PLACEHOLDER
            }),
            "<h4>" + Strings.CDN_LOADING + "</h4>",
            [{
                className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                id: "blf.cancel",
                text: Strings.CANCEL_BUTTON
            }],
            false
        );
        // Ensure that the dialog height is always the same.
        $(".modal-body").css("height", "400px");

        // Cancel button handler.
        btnCancel = $('.dialog-button').filter('[data-button-id="blf.cancel"]');
        btnCancel.click(function () {
            listDialog.close();
            deferred.reject();
        });

        // Fetch the library list.
        _getLibraryList().done(function () {
            $(".modal-body").html(_renderLibraries(_libraryList));

            // Filter box handler.
            $(".blf-filterinput").keyup(function () {
                var filter = $(this).val().toLowerCase();
                if (filter) {
                    $("#blf-libs").find("li").each(function (i, li) {
                        var id = li.id.toLowerCase();
                        if (id.search(filter) === -1) {
                            $(li).hide();
                        } else {
                            $(li).show();
                        }
                    });
                } else {
                    $("#blf-libs").find("li").show();
                }
            });

            // Version buttons handler.
            $(".blf-btn-versions").click(function () {
                var $li = $(this).parent().parent().parent(),
                    $versionsDiv = $li.find(".blf-lib-versions");

                if ($versionsDiv.is(":visible")) {
                    $versionsDiv.empty();
                    $versionsDiv.hide();
                } else {
                    $versionsDiv.html(_renderVersions($li));
                    $versionsDiv.show();

                    // Version links handler.
                    $(".blf-version-link").click(function (ev) {
                        var $libDiv, $lastVersionEl, $filesDiv, mainFile, $libLi,
                            lastVersion, fileExt, version = $(this).text();

                        ev.preventDefault();

                        $libDiv = $(this).parent().parent().prev();
                        $lastVersionEl = $libDiv.find("span.blf-lib-last-version");
                        lastVersion = $lastVersionEl.text().replace(Strings.CDN_LAST_VERSION, "");
                        if (version === lastVersion) {
                            $lastVersionEl.hide();
                        } else {
                            $lastVersionEl.show();
                        }
                        $libDiv.find("span.blf-lib-version").text("(" + $(this).text() + ")");
                        $libDiv.next().hide();

                        // Reset files.
                        $libLi = $libDiv.parent();
                        mainFile = $libLi.data("mainfile");
                        $libLi.data("qfile", mainFile);
                        $libDiv.find("span.blf-lib-file").text("(" + mainFile + ")");
                        $filesDiv = $libDiv.next().next();
                        if ($filesDiv.is(":visible")) {
                            $filesDiv.empty();
                            $filesDiv.hide();
                        }
                        fileExt = FileUtils.getFileExtension(mainFile.toLowerCase());
                        if (fileExt === "js" || fileExt === "css") {
                            $libDiv.find(".blf-btn-download").show();
                        } else {
                            $libDiv.find(".blf-btn-download").hide();
                        }
                    });
                }
            });

            // Download buttons handler.
            $(".blf-btn-download").click(function () {
                var libName, libFile, version, url,
                    $li = $(this).parent().parent().parent();

                libName = $li.attr("id");
                libFile = $li.data("qfile");
                version = $li.find("span.blf-lib-version").text().replace(/[()]/g, "");
                url = cdnURL + libName + "/" + version + "/" + libFile;
                libObject = {
                    action: "download",
                    url: url,
                    file: FileUtils.getBaseName(libFile)
                };

                listDialog.close();
                deferred.resolve(libObject);
            });

            // CDN link buttons handler.
            $(".blf-btn-link").click(function () {
                var libName, libFile, version, url,
                    $li = $(this).parent().parent().parent();

                libName = $li.attr("id");
                libFile = $li.data("qfile");
                version = $li.find("span.blf-lib-version").text().replace(/[()]/g, "");
                url = cdnURL + libName + "/" + version + "/" + libFile;
                libObject = { action: "link", url: url };

                listDialog.close();
                deferred.resolve(libObject);
            });

            // Library files buttons handler.
            $(".blf-btn-files").click(function () {
                var $li = $(this).parent().parent().parent(),
                    $filesDiv = $li.find(".blf-lib-files");

                if ($filesDiv.is(":visible")) {
                    $filesDiv.empty();
                    $filesDiv.hide();
                } else {
                    _renderFiles($li).done(function (filesHtml) {
                        $filesDiv.html(filesHtml);
                        $filesDiv.show();

                        // Files links handler.
                        $(".blf-file-link").click(function (ev) {
                            var $libDiv, qLibFile, fileExt;

                            ev.preventDefault();

                            $libDiv = $(this).parent().parent().prev().prev();
                            qLibFile = $(this).data("qfile");
                            $libDiv.parent().data("qfile", qLibFile);
                            $libDiv.find("span.blf-lib-file").text("(" + $(this).text() + ")");
                            $libDiv.next().next().hide();

                            fileExt = FileUtils.getFileExtension(qLibFile.toLowerCase());
                            if (fileExt === "js" || fileExt === "css") {
                                $libDiv.find(".blf-btn-download").show();
                            } else {
                                $libDiv.find(".blf-btn-download").hide();
                            }
                        });
                    });
                }
            });

            // Ensure that versions and files are hide when open the dialog.
            $("#blf-libs").find(".blf-lib-versions").hide();
            $("#blf-libs").find(".blf-lib-files").hide();

            // Bootstrap and JQuery downloads causes a Brackets crash, because of some
            // kind of colision. I could not find a solution for now, so I have opted to cancel the download.
            $("#blf-libs").find("#jquery").find(".blf-btn-download").remove();
            $("#blf-libs").find("#bootstrap").find(".blf-btn-download").remove();
        }).fail(function () {
            $(".modal-body").html("<h4>" + Strings.CDN_ERROR_FETCHING_LIST + "</h4>");
            deferred.reject();
        });

        return deferred.promise();
    }

    /**
     * Initializes the CDN library downloader.
     */
    function init() {
        var destDirPath,
            projectItem = ProjectManager.getSelectedItem();

        if (projectItem.isDirectory) {
            destDirPath = projectItem.fullPath;
        } else {
            destDirPath = ProjectManager.getProjectRoot().fullPath;
        }

        _showDialog().done(function (libObject) {
            if (libObject.action === "download") {
                _getLibraryContent(libObject.url).done(function (libContent) {
                    var libFile = FileSystem.getFileForPath(destDirPath + libObject.file);

                    FileUtils.writeText(libFile, libContent, true).done(function () {
                        var tag = Linker.getTagsFromFiles([libFile.fullPath]);
                        Linker.insertTags(tag);
                        ProjectManager.refreshFileTree();
                    }).fail(function () {
                        console.log("Error writing file: " + libFile.fullPath);
                    });
                });
            } else if (libObject.action === "link") {
                var tag = Linker.getTagsFromUrls([libObject.url]);
                Linker.insertTags(tag);
            }
        });
    }

    module.exports = {
        init: init
    }
});
