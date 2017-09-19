/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Link File Downloader
*/
define(function (require, exports, module) {
    'use strict';

    var Dialogs         = brackets.getModule("widgets/Dialogs"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        Mustache        = brackets.getModule("thirdparty/mustache/mustache");

    var File            = require("./pFileUtils");

    var LibTemplate     = require("text!templates/cdnLibsListItem.html"),
        VersionTemplate = require("text!templates/libVersionLink.html");

    var apiURL = "https://api.jsdelivr.com/v1/jsdelivr/libraries?fields=name,mainfile,versions",
        cdnURL = "https://cdn.jsdelivr.net/";

    var moduleDirPath = FileUtils.getNativeModuleDirectoryPath(module);

    function getLibraries() {
        var deferred = new $.Deferred();
        var fetchingDialog = Dialogs.showModalDialog(
            brackets.DIALOG_ID_SAVE_CLOSE,
            "Library Download",
            "<h4>Fetching Libraries ...</h4>",
            [],
            false
        );

        $.getJSON(apiURL).done(function (libs) {
            libs.sort(function (a, b) {
                var a1 = a.name.toUpperCase(),
                    b1 = b.name.toUpperCase();
                if (a1 == b1) return 0;
                return a1 > b1 ? 1 : -1;
            });
            fetchingDialog.close();
            deferred.resolve(libs)
        }).fail(function () {
            fetchingDialog.close();
            deferred.reject();
        });
        return deferred.promise();
    }

    function getLibrary(url) {
        var deferred = new $.Deferred();

        $.get(url).done(function (data) {
            console.log("getLibrary(): returns 'data'");
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

    function renderLibraries(libs) {
        var iconsDir = moduleDirPath + "/../styles/icons/",
            downloadIconPath = iconsDir + "ionicons-download.png",
            navIconPath = iconsDir + "ionicons-navicon-round.png";

        var rendered = "<ul id=\"blf-libs\" style=\"list-style:none;\">";
        for (var i = 0; i < libs.length; i++) {
            var versions = "";
            for (var j = 0; j < libs[i].versions.length; j++) {
                versions += Mustache.render(VersionTemplate, { version: libs[i].versions[j] });
            }
            rendered += Mustache.render(LibTemplate, {
                libName: libs[i].name,
                mainFile: libs[i].mainfile,
                lastVersion: libs[i].versions[0],
                downloadIconPath: downloadIconPath,
                navIconPath: navIconPath,
                versions: versions
            });
        }
        rendered += "<ul>";
        return rendered;
    }

    function show() {
        var destDirPath,
            projectItem = ProjectManager.getSelectedItem();

        if (projectItem.isDirectory) {
            destDirPath = projectItem.fullPath;
        } else {
            destDirPath = ProjectManager.getProjectRoot().fullPath;
        }

        // Start to fetch the libraries list.
        getLibraries().done(function (libs) {
            var rendered = renderLibraries(libs);

            var listDialog = Dialogs.showModalDialog(
                brackets.DIALOG_ID_SAVE_CLOSE,
                "Library Download<form class=\"blf-filterbox\" action=\"#\"><input class=\"blf-filterinput\" type=\"text\" placeholder=\"Filter ...\" style=\"position:absolute;right:26px;top:20px;\"></form>",
                rendered,
                [{
                    className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                    id: "blf.cancel",
                    text: "Cancel"
                }],
                false
            );

            // Cancel button handler.
            var btnCancel = $('.dialog-button').filter('[data-button-id="blf.cancel"]');
            btnCancel.click(function () {
                listDialog.close();
            });
            // Custom jquery contains selector.
            jQuery.expr[':'].Contains = function(a,i,m){
                return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase())>=0;
            };
            // Filter box handler.
            $(".blf-filterinput").keyup(function () {
                var filter = $(this).val();
                if (filter) {
                    $("#blf-libs").find("span.blf-lib-name:not(:Contains(" + filter + "))").parent().parent().parent().hide();
                    $("#blf-libs").find("span.blf-lib-name:Contains(" + filter + ")").parent().parent().parent().show();
                } else {
                    $("#blf-libs").find("li").show();
                }
            });
            // Version buttons handler.
            $(".plf-btn-versions").click(function () {
                var $libDiv = $(this).parent().parent();
                $libDiv.next().toggle();
            });
            // Version link handler.
            $(".plf-version-link").click(function (ev) {
                ev.preventDefault();
                var $libDiv = $(this).parent().parent().prev();
                $libDiv.find("span.blf-lib-version").text("(" + $(this).text() + ")");
                $libDiv.next().hide();
            });
            // Download buttons handler.
            $(".plf-btn-download").click(function () {
                var libName, mainfile, version, url, emptyFilePath, filePath,
                    $libDiv = $(this).parent().parent();

                libName = $libDiv.attr("id");
                mainfile = $libDiv.data("mainfile");
                version = $libDiv.find("span.blf-lib-version").text().replace(/[()]/g, "");
                url = cdnURL + libName + "/" + version + "/" + mainfile;
                emptyFilePath = moduleDirPath + "/../templates/emptyFile";
                filePath = destDirPath + mainfile;

                /*
                getLibrary(url).done(function (libContent) {
                    var file = FileSystem.getFileForPath(filePath);
                    console.log(file.fullPath);
                    file.write(libContent, function (err, stats) {
                        console.log("err: " + err);
                        listDialog.close();
                    });
                    //listDialog.close();
                }).fail(function () {
                    console.log("Unable to get " + libName);
                    listDialog.close();
                });
*/
                listDialog.close();
                getLibrary(url).done(function (libContent) {
                    var clearMainFile = FileUtils.getBaseName(mainfile);
                    File.copy(emptyFilePath, destDirPath, clearMainFile).done(function () {
                        var createdFile = FileSystem.getFileForPath(destDirPath + clearMainFile);
                        console.log(createdFile.fullPath);
                        createdFile.write(libContent, { blind: true }, function (err, stats) {
                            if (err) console.log("Error writing file: " + err.toString());
                        });
                        ProjectManager.refreshFileTree();
                    }).fail(function () {
                        console.log("Error creating file.");
                    });
                });
            });

            // Ensure that the dialog height is always the same.
            $(".modal-body").css("height", "400px");
            // Ensure that versions are hide when open the dialog.
            $("#blf-libs").find(".blf-lib-versions").hide();
        }).fail(function () {
            console.log("Unable to feth library list")
        });
    }

    module.exports = {
        show: show
    }
});
