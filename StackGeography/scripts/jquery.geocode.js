/*global jQuery, JSLINQ */

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
                var geocodeCache = [],
                    maxGeocodeCachesize = 50,
                    cachedGeocodeLocation = function (location) {
                        var getCachedGeocodeResult = function (locationToFind) {
                                return JSLINQ(geocodeCache).First(function (geocoding) {
                                    return geocoding.location === locationToFind;
                                });
                            },
                            geocodeResult = getCachedGeocodeResult(location),
                            resultDfd = $.Deferred();
                        if (null !== geocodeResult) {
                            // Use cached geocoding.
                            resultDfd.resolve(geocodeResult.result);
                        } else {
                            $.ajax({
                                url: "/geocode.ashx?loc=" + encodeURIComponent(location),
                                dataType: "json"
                            }).done(function (data) {
                                if (null !== data.result) {
                                    var currentCachedGeocodeResult = getCachedGeocodeResult(location);
                                    if (null === currentCachedGeocodeResult) {
                                        geocodeCache[geocodeCache.length] = {
                                            location: location,
                                            result: data.result
                                        };
                                        if (geocodeCache.length > maxGeocodeCachesize) {
                                            geocodeCache.splice(0, 1);
                                        }
                                    }
                                    resultDfd.resolve(data.result);
                                } else {
                                    resultDfd.reject();
                                }
                            }).fail(resultDfd.reject);
                        }
                        return resultDfd;
                    };
                return cachedGeocodeLocation;
            }())
        }
    });
}(jQuery));