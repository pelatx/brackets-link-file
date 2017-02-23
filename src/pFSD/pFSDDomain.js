/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

(function () {
    "use strict";

    var DOMAIN_NAME = "pelatxFSD";

    var os              = require("os"),
        childProcess    = require("child_process");

    var _domainManager,
        child;

    /**
     * Handler function for the pelatxFSD.platform command.
     * @return {string} The platform string.
     */
    function getPlatform() {
    	return os.platform();
    }

    function getWinVolumes() {
        child = childProcess.exec("wmic logicaldisk get DeviceID");
        child.stdout.on("data", function (data) {
            _domainManager.emitEvent(DOMAIN_NAME, "out", data);
        });
        child.on("error", function (code) {
            _domainManager.emitEvent(DOMAIN_NAME, "error", code);
        });
    }

    /**
     * Initializes the domain.
     * @param {DomainManager} domainManager The DomainManager for the server
     */
    function init(domainManager) {
        _domainManager = domainManager;
        if (!domainManager.hasDomain(DOMAIN_NAME)) {
            domainManager.registerDomain(DOMAIN_NAME, {major: 0, minor: 1});
        }
        domainManager.registerCommand(
            DOMAIN_NAME,       // domain name
            "getPlatform",    // command name
            getPlatform,     // command handler function
            false,          // this command is synchronous in Node
            "Returns the underlying platform.",
            [],
            [{name: "platform", // return values
                type: "string",
                description: "underlying platform"}]
        );
        domainManager.registerCommand(
            DOMAIN_NAME, // domain name
            "getWinVolumes", // command name
            getWinVolumes, // command handler function
            false, // this command is synchronous in Node
            "Run WMIC and retrieves all Windows logical volumes"
        );
        domainManager.registerEvent(
            DOMAIN_NAME, // domain name
            "out", // event name
            [{
                name: "data",
                type: "string",
                description: "WMIC out"
            }]
        );
        domainManager.registerEvent(
            DOMAIN_NAME, // domain name
            "error", // event name
            [{
                name: "code",
                type: "string",
                description: "Error code"
            }]
        );
    }

    exports.init = init;
}());
