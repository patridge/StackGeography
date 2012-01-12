/*global window, jQuery, google */

var googleMapsCallback; // Required for Google Maps API to call back when it thinks it is done (vs. when jQuery finishes loading the script file).
(function ($) {
    "use strict";
    var googleMapsLoaded = $.Deferred(),
        currentOpenInfoWindows = [],
        debug = function debug(message, obj) {
            if (window.console && window.console.log) {
                window.console.log((message || "") + ": " + (obj || ""));
            }
        };
    googleMapsCallback = function () {
        // A number of things cannot be set until Google Maps has hit this callback.
        if (!google.maps.Marker.prototype.clearFromMap) {
            google.maps.Marker.prototype.clearFromMap = function () {
                this.setMap(null);
            };
        }
        if (!google.maps.Marker.prototype.placeOnMap) {
            google.maps.Marker.prototype.placeOnMap = function (map, options) {
                var opts = $.extend({}, google.maps.Marker.prototype.placeOnMap.defaults, options),
                    infoWindow;
                this.setMap(map);
                if (opts.infoWindowHtml) {
                    infoWindow = new google.maps.InfoWindow({
                        content: opts.infoWindowHtml,
                        maxWidth: opts.infoWindowMaxWidth
                    });
                    google.maps.event.addListener(this, "click", function () {
                        var i;
                        if (opts.hideOtherInfoWindowOnClick && currentOpenInfoWindows.length > 0) {
                            for (i = currentOpenInfoWindows.length - 1; i >= 0; i -= 1) {
                                currentOpenInfoWindows[i].close();
                            }
                        }
                        currentOpenInfoWindows[currentOpenInfoWindows.length] = infoWindow;
                        infoWindow.open(map, this);
                    });
                }
            };
            google.maps.Marker.prototype.placeOnMap.defaults = {
                hideOtherInfoWindowOnClick: true
            };
        }
        $.googleMaps.createMarker.defaults = {
            animation: google.maps.Animation.DROP
        };
        googleMapsLoaded.resolve();
    };
    $.googleMaps = {};
    $.googleMaps.loadApi = function () {
        $.ajax({
            url: "/scripts/googlemapsv3.js",
            dataType: "script"
        }).fail(googleMapsLoaded.reject);
        return googleMapsLoaded.promise();
    };
    $.googleMaps.createMap = function (element, options) {
        return new google.maps.Map(element, {
            center: new google.maps.LatLng(options.center.lat, options.center.lng),
            zoom: options.zoom,
            mapTypeId: google.maps.MapTypeId.TERRAIN
        });
    };
    $.googleMaps.MarkerImage = function (url, size, origin, anchor) {
        return new google.maps.MarkerImage(url, new google.maps.Size(size.width, size.height), new google.maps.Point(origin.x, origin.y), new google.maps.Point(anchor.x, anchor.y));
    };
    $.googleMaps.createMarker = function (options) {
        var marker,
            opts = $.extend({}, $.googleMaps.createMarker.defaults, options);

        if (!opts.location || !opts.location.lat || !opts.location.lng) {
            debug("Map marker creation failed: location not given.");
            return;
        }

        marker = new google.maps.Marker({
            title: opts.title || "",
            position: new google.maps.LatLng(opts.location.lat, opts.location.lng),
            animation: opts.animation
        });

        if (opts.markerImage) {
            marker.setIcon(opts.markerImage);
        }
        if (opts.markerImageShadow) {
            marker.setShadow(opts.markerImageShadow);
        }
        return marker;
    };
}(jQuery));