/*global jQuery, console */

(function ($) {
    "use strict";
    $.extend({
        geocode: {
            getIpLatLng: function () {
                // Wrap $.jsonp in Deferred for easier consumption.
                return $.Deferred(function (dfd) {
                    $.jsonp({
                        url: "http://www.geoplugin.net/json.gp",
                        callbackParameter: "jsoncallback",
                        success: function (data) {
                            // Massage data before resolving.
                            dfd.resolve({ lat: data.geoplugin_latitude, lng: data.geoplugin_longitude });
                        },
                        error: dfd.reject
                    });
                });
            },
            getStringLatLng: (function () {
                var locationsMaxLength = 100,
                    geocodeLocations = function (locations) {
                        var locationsJoined;
                        if (locations instanceof Array) {
                            if (locations.length > locationsMaxLength) {
                                if (console && console.warn) {
                                    console.warn("Cannot pass more than " + locationsMaxLength + ". Locations were trimmed to " + locationsMaxLength + ".");
                                }
                                locations = locations.splice(0, locationsMaxLength);
                            }
                            locationsJoined = locations.join(";").toUpperCase();
                        } else {
                            locationsJoined = locations;
                        }

                        return $.ajax({
                            url: "/geocode.ashx?locs=" + encodeURIComponent(locationsJoined),
                            dataType: "json"
                        });
                    };
                return geocodeLocations;
            }())
        }
    });
}(jQuery));