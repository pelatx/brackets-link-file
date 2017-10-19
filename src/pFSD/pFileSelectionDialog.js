/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports, module) {
    'use strict';

    /* Modules */
    var Dialogs             = brackets.getModule("widgets/Dialogs"),
        StringUtils         = brackets.getModule("utils/StringUtils"),
        FileSystem          = brackets.getModule("filesystem/FileSystem"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        LanguageManager     = brackets.getModule("language/LanguageManager"),
        NodeDomain          = brackets.getModule("utils/NodeDomain"),
        Mustache            = brackets.getModule("thirdparty/mustache/mustache");

    /* Templates */
    var templatesDirPath    = FileUtils.getNativeModuleDirectoryPath(module) + "/templates/",
        WinVolumesButton    = "text!" + templatesDirPath + "winVolumesButton.html",
        WinVolumesItem      = "text!" + templatesDirPath + "winVolumesItem.html",
        UnixRootButton      = "text!" + templatesDirPath + "unixRootButton.html",
        NavBar              = "text!" + templatesDirPath + "navBar.html",
        NavBarButton        = "text!" + templatesDirPath + "navBarButton.html",
        Contents            = "text!" + templatesDirPath + "contents.html",
        DirectoryItem       = "text!" + templatesDirPath + "directoryItem.html",
        FileItem            = "text!" + templatesDirPath + "fileItem.html",
        ImagePreview        = "text!" + templatesDirPath + "imagePreview.html";

    require(
        [UnixRootButton, WinVolumesButton, WinVolumesItem, NavBar, NavBarButton, Contents, DirectoryItem, FileItem, ImagePreview],
        function (textUB, textVB, textVI, textNB, textNBB, textC, textDI, textFI, textIP) {
            UnixRootButton      = textUB;
            WinVolumesButton    = textVB;
            WinVolumesItem      = textVI;
            NavBar              = textNB;
            NavBarButton        = textNBB;
            Contents            = textC;
            DirectoryItem       = textDI;
            FileItem            = textFI;
            ImagePreview        = textIP;
        });

    // Initialize the Node domain.
    var domain = new NodeDomain("pelatxFSD", ExtensionUtils.getModulePath(module, "pFSDDomain"));
    // Saves the last directory where files were copied.
    var prefs = PreferencesManager.getExtensionPrefs("pelatx.brackets-open-dialog");
    prefs.definePreference("lastDir", "string");

    // Default dialog options
    var DEFAULT_OPTIONS = {
        title: "Select Files",
        proceed: "Proceed",
        cancel: "Cancel",
        checkAll: "Check All",
        uncheckAll: "Uncheck All",
        hiddenToggleLabel: "Show Hidden",
        showHidden: false,
        enableHiddenToggle: true,
        sort: true,
        foldersFirst: true,
        notHiddenFirst: false
    };

    /* Module Variables */
    var _currentDir = "", // Directory been shown.
        _dialog, // Dialog instance.
        _options, // Dialog options
        _platform, // Platform identifier.
        _winVolumes = []; // Array of volumes in the Windows filesystem.



    /* Functions */

    /**
     * Finds platform that Brackets is running on.
     * If Windows, finds available volumes (C:, D:, ...).
     * @private
     * @returns {object} Promise.
     */
    function _setPlatform() {
        var deferred = new $.Deferred();
        if (!_platform) {
            domain.exec("getPlatform").done(function (p) {
                _platform = p;
                if (_platform === "win32") {
                    domain.exec("getWinVolumes");
                    domain.on("error", function () {
                        _winVolumes.push("C:");
                        deferred.resolve();
                    });
                    domain.on("out", function (event, data) {
                        var volumes = data.match(/[A-Z]:/g);
                        if (volumes.length === 0) {
                            _winVolumes.push("C:");
                            deferred.resolve();
                        } else {
                            _winVolumes = volumes;
                            deferred.resolve();
                        }
                    });
                } else {
                    deferred.resolve();
                }
            }).fail(function () {
                deferred.reject();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    /**
     * Sets a valid directory to show first.
     * @private
     * @param   {string} dir A user supplied directory.
     * @returns {object} Promise with a valid directory string.
     */
    function _setValidDir(dir) {
        var fsRoot, lastDir, deferred = new $.Deferred();

        // Set platform filesystem root and Windows volumes if necessary.
        _setPlatform().done(function () {
            if (_platform === "win32") {
                fsRoot = _winVolumes[0] + "/";
            } else {
                fsRoot = "/";
            }

            if (!dir) { // if no supplied directory ...
                lastDir = prefs.get("lastDir"); // try to read saved last dir.
                if (lastDir) {
                    dir = lastDir; // if exists, choose it.
                } else {
                    dir = fsRoot; // if not, use filesystem root.
                }
            }
            // Verify that the directory exists on disk.
            // Whether it is provided by the user or saved in the preferences.
            appshell.fs.stat(dir, function (err) {
                if (err === appshell.fs.ERR_NOT_FOUND) {
                    deferred.resolve(fsRoot); // if not found, return filesystem root.
                } else {
                    deferred.resolve(dir); // if found, return it.
                }
            });
        });
        return deferred.promise();
    }

    /**
     * Renders the current volume root button with a dropdown menu,
     * where user can change the Windows volume to be shown.
     * @private
     * @param   {string}  current       Path volume.
     * @param   {boolean} highlightened True if volume root contents are been shown.
     * @returns {string}  HTML output.
     */
    function _renderWinVolumesMenu(current, highlightened) {
        var highlight = '', volumeList = '';

        if (highlightened === true) {
            highlight += ' style="background-color:#016dc4;color:white"';
        }
        for (var i = 0; i < _winVolumes.length; i++) {
            volumeList += Mustache.render(WinVolumesItem, { volume: _winVolumes[i] });
        }
        return Mustache.render(WinVolumesButton, {
            highlight: highlight,
            current: current,
            winVolumesList: volumeList
        });
    }

    /**
     * Renders the filesystem root button in Unix like OS.
     * @private
     * @param   {boolean} highlightened True if root contents are been shown.
     * @returns {string}  HTML output.
     */
    function _renderUnixRootButton(highlightened) {
        var highlight = '';
        if (highlightened === true) {
            highlight += ' style="background-color:#016dc4;color:white"';
        }
        return Mustache.render(UnixRootButton, { highlight: highlight });
    }

    /**
     * Renders the directory navigation bar.
     * @private
     * @param   {string} dir Directory path to be shown.
     * @returns {string} HTML output.
     */
    function _renderDirNavbar(dir) {
        var i, navbarButtons = "", dirChain = [], root, currentPath,
            hightlight = '',
            hightlightFlag;

        dir = dir.slice(0, -1);
        dirChain = dir.split("/");
        root = dirChain.shift();
        hightlightFlag = (dirChain.length === 0) ? true : false;

        if (root) {
            currentPath = root + "/";
            navbarButtons += _renderWinVolumesMenu(root, hightlightFlag);
        } else {
            currentPath = "/";
            navbarButtons += _renderUnixRootButton(hightlightFlag);
        }
        for (i = 0; i < dirChain.length; i++) {
            currentPath += dirChain[i] + "/";
            if (i === dirChain.length - 1) {
                hightlight = ' style="background-color:#016dc4;color:white"';
            }
            navbarButtons += Mustache.render(NavBarButton, {
                currentPath: currentPath,
                hightlight: hightlight,
                buttonLabel: dirChain[i]
            });
        }
        return Mustache.render(NavBar, { navbarButtons: navbarButtons });
    }

    /**
     * Determines whether an entry corresponds to an image and inserts the required HTML.
     * @private
     * @param   {string} path Full path of a file.
     * @returns {string} HTML string to be inserted (empty string if It is not an image).
     */
    function _setAsImage(path) {
        var html = "";
        var lang = LanguageManager.getLanguageForPath(path).getId();
        if (lang === "image" || lang === "svg") {
            html = " class=\"image\" data-path=\"" + path + "\"";
        }
        return html;
    }

    /**
     * Renders the directory contents HTML.
     * @private
     * @param   {Array}  paths Array of full path strings.
     * @returns {string} HTML formated string.
     */
    function _renderContents(paths, dir) {
        var baseName, linkColor, dirUp, contents = "",
            pFSDDir = FileUtils.getNativeModuleDirectoryPath(module),
            iconPath = pFSDDir + "/styles/icons/ionicons-folder.png";

        // Choose font color for directories according to theme
        if ($('body').hasClass('dark')) {
            linkColor = "#6bbeff";
        } else {
            linkColor = "#0083e8";
        }
        // Adds two points link to going up in the directory tree
        dirUp = Mustache.render(DirectoryItem, {
            iconPath: iconPath,
            path: "dir-up",
            linkColor: linkColor,
            baseName: ".."
        });
        // Creates the list of items
        paths.forEach(function (path) {
            baseName = FileUtils.getBaseName(path);
            if (path.substr(-1) !== "/") {
                contents += Mustache.render(FileItem, {
                    baseName: baseName,
                    path: path,
                    imageCode: _setAsImage(path)
                });
            } else {
                contents += Mustache.render(DirectoryItem, {
                    iconPath: iconPath,
                    path: path,
                    linkColor: linkColor,
                    baseName: baseName
                });
            }
        });
        return Mustache.render(Contents, {
            navBar: _renderDirNavbar(dir),
            dirUp: dirUp,
            contents: contents
        });
    }

    /**
     * Enables previews for image file entries.
     * @private
     */
    function _enableImagePreviews() {
        $(".image").each(function () {
            var path = $(this).data("path"),
                name = FileUtils.getBaseName(path),
                previewId = name.replace(/[ .,:&%$#@~]/g, ""),
                bgColor = $(".modal-body").css("background-color"),
                previewHtml = Mustache.render(ImagePreview, {
                    previewId: previewId,
                    path: path
                });

            $(this).hover(
                function (ev) {
                    var $modal = $(".modal-body"),
                        modalRect = $modal[0].getBoundingClientRect(),
                        modalTop = modalRect.top,
                        modalBottom = modalRect.bottom,
                        modalLeft = modalRect.left,
                        modalRight = modalRect.right,
                        itemTop = $(this).offset().top,
                        imageLeft = ((modalRight - modalLeft) / 2) - 100,
                        $preview = $(previewHtml),
                        imageTop;

                    $modal.append($preview);

                    if (itemTop - modalTop > 170) {
                        imageTop = ev.offsetY - 160;
                    } else {
                        imageTop = ev.offsetY + 30;
                    }

                    $preview.css({
                        "left": imageLeft + "px",
                        "top": imageTop + "px"
                    });
                    $(this).css("background-color", "#9a823b");
                },
                function () {
                    $("#" + previewId).remove();
                    $(this).css("background-color", bgColor);
                }
            );
        });
    }

    /**
     * Prevents the directory navigation bar to not fit into
     * the dialog.
     * @private
     */
    function _arrangeNavBar() {
        var widthCounter = 0,
            $button,
            $nextButtons,
            nextButtonsWidth,
            $navbar = $("#pfsd-navbar"),
            $navbarButtons = $navbar.children();

        $navbarButtons.each(function (index) {
            var width = $(this).css("width").replace("px", "") * 1;
            if (widthCounter + width > 380) {
                $nextButtons = $(this).nextAll().detach();
                $button = $(this).detach();
                $navbar.append("</br>").append($button).append($nextButtons);
                if ($nextButtons.length > 0) {
                    nextButtonsWidth = $nextButtons.css("width").replace("px", "") * 1;
                } else {
                    nextButtonsWidth = 0;
                }
                widthCounter = width + nextButtonsWidth;
            } else {
                widthCounter += width;
            }
        });
    }

    function _enableHiddenToggle() {
        if (_options.enableHiddenToggle) {
            var $modalFooter = $(".modal-footer"),
                $hiddenToggle = $('<input type="checkbox" name="pfsd-hidden-toggle" value="hidden-toggle">'),
                $hiddenToggleLabel = $('<span>' + _options.hiddenToggleLabel + '</span>');

            if (_options.showHidden) {
                $hiddenToggle.prop('checked', true);
            } else {
                $hiddenToggle.prop('checked', false);
            }

            $hiddenToggle.css({
                "position": "absolute",
                "left": "10px",
                "bottom": "30px"
            });
            $hiddenToggleLabel.css({
                "position": "absolute",
                "left": "30px"
            });
            $modalFooter.prepend($hiddenToggleLabel);
            $modalFooter.prepend($hiddenToggle);

            // State change handler.
            $hiddenToggle.change(function () {
                if ($(this).is(':checked')) {
                    _options.showHidden = true;
                    show(_options, _currentDir, true);
                } else {
                    _options.showHidden = false;
                    show(_options, _currentDir, true);
                }
            });
        }
    }

    /**
     * Shows open files dialog.
     * @param   {string}  scrDir Folder to show first.
     * @param   {boolean} update If it is a list update only.
     * @returns {object}  Promise with an array of selected items full path strings.
     */
    function show(options, scrDir, update) {
        var dir, i, j, k, name, path, paths = [], render, selected = [],
            btnProceed, btnCancel, btnCheckAll, btnUncheckAll,
            btnProceedHandler, btnCancelHandler, btnCheckAllHandler, btnUncheckAllHandler,
            deferred = new $.Deferred();

        //Set options only if we are not only updating the dialog.
        if (!update) {
            // If no options object
            if (!options) {
                _options = DEFAULT_OPTIONS;
                // Check for missing options in passed object
            } else {
                _options = options;
                $.each(DEFAULT_OPTIONS, function (key, option) {
                    if (!_options.hasOwnProperty(key)) {
                        _options[key] = option;
                    }
                });
            }
        }

        // We always need a valid directory to show first.
        _setValidDir(scrDir).done(function (validDir) {
            _currentDir = validDir;

            // Begins the directory scanning.
            dir = FileSystem.getDirectoryForPath(_currentDir);
            dir.getContents(function (err, entries) {
                // Makes an array of full paths with directory entries.
                for (i = 0; i < entries.length; i++) {
                    path = entries[i].fullPath;
                    name = FileUtils.getBaseName(path);
                    // Show or not hidden files, according to options.
                    if (_options.showHidden) {
                        paths.push(path);
                    } else {
                        if (name.substr(0, 1) !== ".") {
                            paths.push(path);
                        }
                    }
                }
                // Sort entries or not, according to options.
                if (_options.sort) {
                    paths.sort(function (a, b) {
                        var a1 = FileUtils.getBaseName(a).toUpperCase(),
                            b1 = FileUtils.getBaseName(b).toUpperCase();
                        if (a1.substr(0, 1) === ".") a1 = a1.substr(1);
                        if (b1.substr(0, 1) === ".") b1 = b1.substr(1);
                        if (a1 === b1) return 0;
                        return a1 > b1 ? 1 : -1;
                    });
                }
                // Folders first or not, according to options.
                if (_options.foldersFirst) {
                    var dirPaths = [], filePaths = [];
                    for (j = 0; j < paths.length; j++) {
                        if (paths[j].substr(-1) === "/") {
                            dirPaths.push(paths[j]);
                        } else {
                            filePaths.push(paths[j]);
                        }
                    }
                    paths = dirPaths.concat(filePaths);
                }
                // Not hidden first, according to options.
                if (_options.notHiddenFirst && _options.showHidden) {
                    var shown = [], hidden = [];

                    for (k = 0; k < paths.length; k++) {
                        name = FileUtils.getBaseName(paths[k]);
                        if (name.substr(0, 1) === ".") {
                            hidden.push(paths[k]);
                        } else {
                            shown.push(paths[k]);
                        }
                    }
                    paths = shown.concat(hidden);
                }

                // Renders full paths array.
                render = _renderContents(paths, _currentDir);
                // If it is a new instance, show the custom dialog
                // and assigns button handlers.
                if (!update) {
                    _dialog = Dialogs.showModalDialog(
                        brackets.DIALOG_ID_SAVE_CLOSE,
                        _options.title,
                        render,
                        [{
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: "pfsd.checkall",
                            text: _options.checkAll
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: "pfsd.uncheckall",
                            text: _options.uncheckAll
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: "pfsd.cancel",
                            text: _options.cancel
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: "pfsd.proceed",
                            text: _options.proceed
                        }],
                        false
                    );

                    // Buttons click handlers.
                    btnProceed = $('.dialog-button').filter('[data-button-id="pfsd.proceed"]');
                    btnProceed.click(function () {
                        $("input:checkbox[name=pfsd-file-checkbox]:checked").each(function () {
                            selected.push($(this).data('path'));
                        });
                        _dialog.close();
                        // if there are selected files, saves directory on preferences
                        // and return them in an array.
                        if (selected.length > 0) {
                            prefs.set("lastDir", _currentDir);
                            prefs.save();
                            deferred.resolve(selected);
                        } else {
                            deferred.reject();
                        }
                    });
                    btnCancel = $('.dialog-button').filter('[data-button-id="pfsd.cancel"]');
                    btnCancel.click(function () {
                        _dialog.close();
                        deferred.reject();
                    });
                    btnCheckAll = $('.dialog-button').filter('[data-button-id="pfsd.checkall"]');
                    btnCheckAll.click(function () {
                        $("input:checkbox[name=pfsd-file-checkbox]").prop('checked', true);
                    });
                    btnUncheckAll = $('.dialog-button').filter('[data-button-id="pfsd.uncheckall"]');
                    btnUncheckAll.click(function () {
                        $("input:checkbox[name=pfsd-file-checkbox]").prop('checked', false);
                    });

                    // Ensure that the dialog height is always the same.
                    $(".modal-body").css("height", "400px");

                    // If it is an update of the existing dialog, update list only.
                } else {
                    $("#pfsd-list").empty();
                    $("#pfsd-list").append(render);
                    // Ensure that the dialog height is always the same.
                    $(".modal-body").css("height", "400px");
                }

                // If a directory item is clicked ...
                $(".pfsd-dir-link").click(function () {
                    dir = $(this).data('path');
                    // and it is '..', goes one directory up.
                    if (dir === "dir-up") {
                        _currentDir = _currentDir.split("/");
                        _currentDir.pop();
                        if (_currentDir.length > 1) {
                            _currentDir.pop();
                        }
                        _currentDir = _currentDir.join("/") + "/";
                        // if normal directory item, uses it.
                    } else {
                        _currentDir = dir;
                    }
                    // Updates dialog with the selected directory (update flag switched on).
                    show({}, _currentDir, true);
                });
                // Enable image previews.
                _enableImagePreviews();
                // Controls navbar width.
                _arrangeNavBar();
                // Enable/disable hidden toggle.
                _enableHiddenToggle();
            });
        });
        return deferred.promise();
    }
    /* Exports */
    exports.show = show;
});
