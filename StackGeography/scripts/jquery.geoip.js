/***Let JSLint know what the expected global variables are***/
/*global jQuery, $ */

(function ($) {
    "use strict";
    $.extend({
        geoByIp: {
            getLocation: function () {
                // Wrap $.jsonp in Deferred for easier consumption.
                return $.Deferred(function (dfd) {
                    $.jsonp({
                        url: "http://www.geoplugin.net/json.gp",
                        callbackParameter: "jsoncallback",
                        success: dfd.resolve,
                        error: dfd.reject
                    });
                });
            }
        }
    });
}(jQuery));