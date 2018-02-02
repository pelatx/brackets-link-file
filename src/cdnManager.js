/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
* Link File CDN Manager
*/
define(function CdnManager(require, exports, module) {
    'use strict';

    var API_URL     = "https://data.jsdelivr.com/v1/",
        OLD_API_URL = "https://api.jsdelivr.com/v1/",
        CDN_URL     = "https://cdn.jsdelivr.net/";

    var _currentLibs = [],
        _currentPage;

    /**
     * Fetches a CDN API library list page (100 libraries). The order of these libraries is by number of hits.
     * @private
     * @param   {number} pageNamber CDN API page number to be fetched.
     * @returns {object} Promise resolved with an array of library objects on success.
     */
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

    /**
     * Fetches a library list local page (5 API pages - 500 libs),
     * and stores them in the global array `_currentLibs` on success.
     * @param   {number} pageNumber Local page number.
     * @returns {object} Promise resolved on success or rejected.
     */
    function fetchPage(pageNumber) {
        var deferred = new $.Deferred(),
            startApiPage, tmpLibs = [];

        // A page in this manager contains 5 api pages
        pageNumber = pageNumber * 1;
        startApiPage = (pageNumber * 5) - 4;

        if (pageNumber < 1 || pageNumber > 28) {
            deferred.reject();
        } else {
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
        }
        return deferred.promise();
    }

    /**
     * Fetches next local page of the current one.
     * @returns {object} Promise allways resolved.
     */
    function fetchNextPage() {
        var deferred = new $.Deferred();

        fetchPage(_currentPage + 1).always(function () {
            deferred.resolve();
        });
        return deferred.promise();
    }

    /**
     * Fetches previous local page of the current one.
     * @returns {object} Promise allways resolved.
     */
    function fetchPreviousPage() {
        var deferred = new $.Deferred();

        fetchPage(_currentPage - 1).always(function () {
            deferred.resolve();
        });
        return deferred.promise();
    }

    /**
     * Retrieves the current page number stored in `_currentPage`.
     * @returns {number} Local page number.
     */
    function getCurrentPage() {
        return _currentPage;
    }

    /**
     * Retrieves the current library list stored in `_currentLibs`.
     * @returns {Array} Of library objects (keys: hits, type, name).
     */
    function getCurrentLibs() {
        return _currentLibs;
    }

    /**
     * Finds a library object by name in the in memory current library list.
     * @private
     * @param   {string} libName The library name as it is provided by the API.
     * @returns {object} Promise resolved with corresponding library object on success, or rejected.
     */

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

    /**
     * Fetches the library available versions from library name.
     * @param   {string} libName Library name as provided by the API.
     * @returns {object} Promise resolved with a versions object (see jsDelivr API) on success, or rejected.
     */
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

    /**
     * Fetches the library list of files availables, from the name and version.
     * @param   {string} libName Library name as provided by the API.
     * @param   {string} version Library version as provided by the API.
     * @returns {object} Promise resolved with a files object (see jsDelivr API) on success, or rejected.
     */
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

    /**
     * Fetches the description, author, hompage and Github page of a library from its name.
     * This feature is not available in the new jsDeliver API and It is provided by the old API
     * This means that many descriptions will not be available.
     * @param   {string} libName Library name as provided by the API.
     * @returns {object} Promise resolved with a custom object on success, or rejected.
     */
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

    /**
     * Creates an usable CDN URL from library name, version and requested file.
     * @param   {string} libName    Library name as provided by the API.
     * @param   {string} libVersion Library version as provided by the API.
     * @param   {string} libFile    Library file as provided by the API.
     * @returns {object} Promise resolved with the URL string on success.
     */
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
