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
        Mustache        = brackets.getModule("thirdparty/mustache/mustache");

    var File            = require("./pFileUtils"),
        Linker          = require("./linker"),
        Strings         = require("strings");

    var HeaderTemplate  = require("text!templates/cdnLibsHeader.html"),
        LibsTemplate    = require("text!templates/cdnLibsList.html"),
        LibTemplate     = require("text!templates/cdnLibsListItem.html"),
        VersionTemplate = require("text!templates/cdnLibVersionLink.html");

    var apiURL = "https://api.jsdelivr.com/v1/jsdelivr/libraries?fields=name,mainfile,versions",
        cdnURL = "https://cdn.jsdelivr.net/";

    var moduleDirPath = FileUtils.getNativeModuleDirectoryPath(module);

    var _libraryList = null;

    function _getLibraryList() {
        var deferred = new $.Deferred();

        if (_libraryList === null) {
            $.getJSON(apiURL).done(function (libs) {
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

    function _getLibraryContent(url) {
        var deferred = new $.Deferred();

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

    function _renderLibraries(libs) {
        var iconsDir = moduleDirPath + "/../styles/icons/",
            downloadIconPath = iconsDir + "ionicons-download.png",
            linkIconPath = iconsDir + "ionicons-link.png",
            navIconPath = iconsDir + "ionicons-navicon-round.png";

        var listItems = "";
        for (var i = 0; i < libs.length; i++) {
            var libLang = FileUtils.getFileExtension(libs[i].mainfile);
            if (libLang === "js") {
                libLang = "JavaScript";
            } else if ( libLang === "css") {
                libLang = "CSS";
            }

            listItems += Mustache.render(LibTemplate, {
                libName: libs[i].name,
                mainFile: libs[i].mainfile,
                version: libs[i].versions[0],
                lastVersionLabel: Strings.CDN_LAST_VERSION,
                libLang: libLang,
                downloadIconPath: downloadIconPath,
                linkIconPath: linkIconPath,
                navIconPath: navIconPath
            });
        }
        return Mustache.render(LibsTemplate, { listItems: listItems });
    }

    function _renderVersions($lib) {
        var libName = $lib.attr("id"),
            lib, versions = "";

        for (var i = 0; i < _libraryList.length; i++) {
            if (_libraryList[i].name === libName) {
                for (var j = 0; j < _libraryList[i].versions.length; j++) {
                    versions += Mustache.render(VersionTemplate, { version: _libraryList[i].versions[j] });
                }
            }
        }
        return versions;
    }

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
                        var $libDiv, $lastVersionEl,
                            lastVersion, version = $(this).text();

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
                    });
                }
            });

            // Download buttons handler.
            $(".blf-btn-download").click(function () {
                var libName, mainFile, version, url,
                    $li = $(this).parent().parent().parent();

                libName = $li.attr("id");
                mainFile = $li.data("mainfile");
                version = $li.find("span.blf-lib-version").text().replace(/[()]/g, "");
                url = cdnURL + libName + "/" + version + "/" + mainFile;
                libObject = {
                    action: "download",
                    url: url,
                    mainFile: mainFile
                };

                listDialog.close();
                deferred.resolve(libObject);
            });

            // CDN link buttons handler.
            $(".blf-btn-link").click(function () {
                var libName, mainFile, version, url, tag,
                    $li = $(this).parent().parent().parent();

                libName = $li.attr("id");
                mainFile = $li.data("mainfile");
                version = $li.find("span.blf-lib-version").text().replace(/[()]/g, "");
                url = cdnURL + libName + "/" + version + "/" + mainFile;
                libObject = { action: "link", url: url };

                listDialog.close();
                deferred.resolve(libObject);
            });

            // Ensure that versions are hide when open the dialog.
            $("#blf-libs").find(".blf-lib-versions").hide();

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
                    var cleanMainFile = FileUtils.getBaseName(libObject.mainFile),
                        libFile = FileSystem.getFileForPath(destDirPath + cleanMainFile);

                    FileUtils.writeText(libFile, libContent, true).done(function () {
                        var tag = Linker.getTagsFromFiles([libFile.fullPath]);
                        Linker.insertTags(tag);
                    }).fail(function () {
                        console.log("Error writing file: " + libFile);
                    });
                });
            } else if (libObject.action === "link") {
                var tag = Linker.getTagsFromUrls([libObject.url]);
                Linker.insertTags([tag]);
            }
        });
    }

    module.exports = {
        init: init
    }
});
