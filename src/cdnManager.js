/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Link File CDNManager
*/
define(function CdnManager(require, exports, module) {
    'use strict';

    var API_URL     = "https://data.jsdelivr.com/v1/",
        OLD_API_URL = "https://api.jsdelivr.com/v1/",
        CDN_URL     = "https://cdn.jsdelivr.net/";

    var _currentLibs = [],
        _currentPage;

    function _fetchApiPage(pageNamber) {
        var deferred = new $.Deferred(),
            requestURL = API_URL + "stats/packages?page=" + pageNamber;

        $.getJSON(requestURL).done(function (libs) {
            if (libs.length > 0) {
                deferred.resolve(libs);
            } else {
                deferred.reject();
            }
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }

    function fetchPage(pageNumber) {
        var deferred = new $.Deferred(),
            startApiPage, tmpLibs = [];

        // A page in this manager contains 5 api pages
        pageNumber = pageNumber * 1;
        if (pageNumber < 1) deferred.resolve();
        startApiPage = (pageNumber * 5) - 4;

        _fetchApiPage(startApiPage).then(function (libs) {
            tmpLibs = tmpLibs.concat(libs);
            return _fetchApiPage(startApiPage + 1);
        }).then(function (libs) {
            tmpLibs = tmpLibs.concat(libs);
            return _fetchApiPage(startApiPage + 2);
        }).then(function (libs) {
            tmpLibs = tmpLibs.concat(libs);
            return _fetchApiPage(startApiPage + 3);
        }).then(function (libs) {
            tmpLibs = tmpLibs.concat(libs);
            return _fetchApiPage(startApiPage + 4);
        }).then(function (libs) {
            tmpLibs = tmpLibs.concat(libs);
            _currentLibs = tmpLibs;
            _currentPage = pageNumber;
            tmpLibs = [];
            deferred.resolve();
        }).fail(function () {
            deferred.reject();
        });

        return deferred.promise();
    }

    function fetchNextPage() {
        var deferred = new $.Deferred();

        fetchPage(_currentPage + 1).always(function () {
            deferred.resolve();
        });
        return deferred.promise();
    }

    function fetchPreviousPage() {
        var deferred = new $.Deferred();

        fetchPage(_currentPage - 1).always(function () {
            deferred.resolve();
        });
        return deferred.promise();
    }

    function getCurrentPage() {
        return _currentPage;
    }

    function getCurrentLibs() {
        return _currentLibs;
    }

    function _findLibObject(libName) {
        var deferred = new $.Deferred();

        for (var i = 0; i < _currentLibs.length; i++) {
            if (_currentLibs[i].name === libName) {
                deferred.resolve(_currentLibs[i]);
            } else {
                if (i === _currentLibs.length - 1) {
                    deferred.reject();
                }
            }
        }
        return deferred.promise();
    }

    function fetchLibVersions(libName) {
        var deferred = new $.Deferred(),
            requestURL;

        _findLibObject(libName).done(function (libObj) {
            requestURL = API_URL + "package/" + libObj.type + "/" + libObj.name;
            $.getJSON(requestURL).done(function (versionsObj) {
                deferred.resolve(versionsObj);
            }).fail(function () {
                deferred.reject();
            });
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }

    function fetchLibFiles(libName, version) {
        var deferred = new $.Deferred(),
            requestURL;

        _findLibObject(libName).done(function (libObj) {
            requestURL = API_URL + "package/" + libObj.type + "/" + libObj.name + "@" + version;
            $.getJSON(requestURL).done(function (filesObj) {
                deferred.resolve(filesObj);
            }).fail(function () {
                deferred.reject();
            });
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }

    function fetchLibDescription(libName) {
        var deferred = new $.Deferred(),
            descObj = {},
            requestURL = OLD_API_URL + "jsdelivr/libraries?name=" + libName + "&fields=description,author,github,homepage";

        $.getJSON(requestURL).done(function (description) {
            if (description.length !== 1) {
                deferred.reject();
            } else {
                if (description[0].hasOwnProperty("description") && description[0].description !== "") {
                    descObj["description"] = description[0].description;
                }
                if (description[0].hasOwnProperty("author") && description[0].author !== "") {
                    descObj["author"] = description[0].author;
                }
                if (description[0].hasOwnProperty("homepage") && description[0].homepage !== "") {
                    descObj["homepage"] = description[0].homepage;
                }
                if (description[0].hasOwnProperty("github") && description[0].github !== "") {
                    descObj["github"] = description[0].github;
                }
                deferred.resolve(descObj);
            }
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }

    function createUrl(libName, libVersion, libFile) {
        var url = CDN_URL,
            deferred = new $.Deferred();

        _findLibObject(libName).done(function (libObj) {
            url += libObj.type + "/" + libName + "@" + libVersion + libFile;
            deferred.resolve(url);
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
    function fetchFileContent(url) {
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

    module.exports = {
        fetchPage: fetchPage,
        fetchNextPage: fetchNextPage,
        fetchPreviousPage: fetchPreviousPage,
        getCurrentPage: getCurrentPage,
        getCurrentLibs: getCurrentLibs,
        fetchLibVersions: fetchLibVersions,
        fetchLibFiles: fetchLibFiles,
        fetchLibDescription: fetchLibDescription,
        createUrl: createUrl,
        fetchFileContent: fetchFileContent
    }
});
