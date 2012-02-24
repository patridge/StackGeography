/*global jQuery, localStorage, console, QUOTA_EXCEEDED_ERR*/
(function ($) {
    "use strict";
    if (!(!!JSON)) {
        $.ajax({
            url: "https://raw.github.com/douglascrockford/JSON-js/master/json2.js",
            dataType: "script",
            async: false
        });
    }
    $.stackgeography = $.stackgeography || {};
    $.stackgeography.preferences = (function () {
        var Preference = function (key, defaultValue) {
                var getItem = function (key) {
                        var result = defaultValue,
                            json;
                        if (localStorage && localStorage.getItem) {
                            json = localStorage.getItem(key);
                            if (null !== json) {
                                try {
                                    result = JSON.parse(json);
                                } catch (e) {
                                    localStorage.removeItem(key);
                                }
                            }
                        }
                        return result;
                    },
                    setItem = function (key, value) {
                        var json = JSON.stringify(value);
                        if (localStorage && localStorage.setItem) {
                            try {
                                localStorage.setItem(key, json);
                            } catch (e) {
                                if (e === QUOTA_EXCEEDED_ERR && console && console.error) {
                                    console.error("`localStorage` quota exceeded.");
                                }
                            }
                        }
                    },
                    preference = {
                        key: key,
                        get: function () { return getItem(key); },
                        set: function (value) { setItem(key, value); }
                    };
                return preference;
            };
        return {
            reset: function () { localStorage.clear(); },
            maxMapMarkers: new Preference("maxMapMarkers", 500),
            staggerMapMarkerPlacement: new Preference("staggerMapMarkerPlacement", true),
            siteSelection: new Preference("siteSelection", "stackoverflow"),
            useSiteIcons: new Preference("useSiteIcons", true),
            mapCenterLatLng: new Preference("mapCenterLatLng", { lat: 200, lng: 0 }),
            useFallbackLatLng: new Preference("useFallbackLatLng", false),
            fallbackLatLng: new Preference("fallbackLatLng", {
                lat: -78.4644915,
                lng: 106.83397289999994
            }) // Antarctica
        };
    }());
}(jQuery));