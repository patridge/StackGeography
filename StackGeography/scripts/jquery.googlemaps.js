﻿/*global window, jQuery, google, URI */

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
    $.googleMaps.loadApi = function (options) {
        var opts = $.extend({}, $.googleMaps.loadApi.defaults, options),
            url = URI(opts.url);
        if (opts.key) {
            url.addSearch("key", opts.key);
        }
        if (opts.callback) {
            url.addSearch("callback", opts.callback);
        }
        url.addSearch("sensor", !!opts.sensor);
        $.ajax({
            url: url,
            dataType: "script"
        }).fail(googleMapsLoaded.reject);
        return googleMapsLoaded.promise();
    };
    $.googleMaps.loadApi.defaults = {
        url: "http://maps.googleapis.com/maps/api/js",
        key: null,
        sensor: false,
        callback: "googleMapsCallback"
    };
    $.googleMaps.createMap = function (element, options) {
        return new google.maps.Map(element, {
            center: new google.maps.LatLng(options.center.lat, options.center.lng),
            zoom: options.zoom,
            mapTypeId: google.maps.MapTypeId.TERRAIN
        });
    };
    $.googleMaps.MarkerImage = function (url, size, origin, anchor, scaledSize) {
        var sizeObj = null,
            originPoint = null,
            anchorPoint = null,
            scaledSizeObj = null;
        if (size && size.width && size.height) {
            sizeObj = new google.maps.Size(size.width, size.height);
        }
        if (origin && origin.x && origin.y) {
            originPoint = new google.maps.Point(origin.x, origin.y);
        }
        if (anchor && anchor.x && anchor.y) {
            anchorPoint = new google.maps.Point(anchor.x, anchor.y);
        }
        if (scaledSize && scaledSize.width && scaledSize.height) {
            scaledSizeObj = new google.maps.Size(scaledSize.width, scaledSize.height);
        }
        //(siteInfo.iconSrc, null, null, null, new google.maps.Size(24, 24))
        return new google.maps.MarkerImage(url, sizeObj, originPoint, anchorPoint, scaledSizeObj);
    };
    $.googleMaps.createMarker = function (options) {
        var marker,
            opts = $.extend({
                title: ""
            }, $.googleMaps.createMarker.defaults, options);

        if (!opts.location || !opts.location.lat || !opts.location.lng) {
            debug("Map marker creation failed: location not given.");
            return;
        }
        opts.position = new google.maps.LatLng(opts.location.lat, opts.location.lng);
        delete opts.location;

        marker = new google.maps.Marker(opts);

        if (opts.markerImage) {
            marker.setIcon(opts.markerImage);
        }
        if (opts.markerImageShadow) {
            marker.setShadow(opts.markerImageShadow);
        }
        return marker;
    };
}(jQuery));