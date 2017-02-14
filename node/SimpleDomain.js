/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

(function () {
    "use strict";

    var os = require("os");

    /**
     * @private
     * Handler function for the simple.platform command.
     * @return {string} The platform string.
     */
    function cmdGetPlatform() {
        return os.platform();
    }

    /**
     * Initializes the domain.
     * @param {DomainManager} domainManager The DomainManager for the server
     */
    function init(domainManager) {
        if (!domainManager.hasDomain("simple")) {
            domainManager.registerDomain("simple", {major: 0, minor: 1});
        }
        domainManager.registerCommand(
            "simple",       // domain name
            "getPlatform",    // command name
            cmdGetPlatform,   // command handler function
            false,          // this command is synchronous in Node
            "Returns the underlying platform.",
            [],
            [{name: "platform", // return values
                type: "string",
                description: "underlying platform"}]
        );
    }

    exports.init = init;

}());
