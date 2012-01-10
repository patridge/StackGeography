/***Let JSLint know what the expected global variables are***/
/*global document, jQuery, $, console, google, JSLINQ, URI, clearTimeout, setTimeout */

var googleMapsCallback; // Required for Google Maps API to call back when it thinks it is done (vs. when jQuery finishes loading the script file).
(function ($) {
    "use strict";
    var googleMapsLoaded = $.Deferred();
    googleMapsCallback = function () {
        googleMapsLoaded.resolve();
    };
    $.extend({
        loadGoogleMaps: function () {
            $.ajax({
                url: "/scripts/googlemapsv3.js",
                dataType: "script"
            }).fail(googleMapsLoaded.reject);
            return googleMapsLoaded.promise();
        }
    });
}(jQuery));
$(function () {
    "use strict";
    var apiKey = "BFkB32WKyHjbqI9RYU1lKA((",
        latestQuestionCreationDate = {},
        map,
        mapFallbackLatLng,
        currentMapMarkers = [],
        clearMapMarker,
        markGeocodingFailures = false,
        maxMapMarkers = 500,
        currentOpenMapMarkerInfoWindow,
        infoWindowTemplate = $.template("infoWindowTemplate", $("#infoWindowTemplate")),
        $startPolling = $("#start-polling"),
        $stopPolling = $("#stop-polling"),
        keepPolling = true,
        pendingPoll,
        pollingWait = 60000,
        hasMapMarker = function (id) {
            return JSLINQ(currentMapMarkers).Any(function (currentMarker) {
                return currentMarker.questionId && currentMarker.questionId === id;
            });
        },
        mapMarkerImage,
        mapMarkerImageShadow,
        createMapMarker = function (id, location, title, infoWindow) {
            var marker;

            if (!location) {
                return;
            }

            // TODO: if marker already exists for generic location, update info window (if that's possible).
            if (hasMapMarker(id)) {
                return;
            }
            marker = new google.maps.Marker({
                title: title,
                position: new google.maps.LatLng(location.lat, location.lng),
                map: map,
                animation: google.maps.Animation.DROP,
                icon: mapMarkerImage,
                shadow: mapMarkerImageShadow
            });
            marker.questionId = id;

            if (infoWindow) {
                google.maps.event.addListener(marker, "click", function () {
                    if (currentOpenMapMarkerInfoWindow) {
                        currentOpenMapMarkerInfoWindow.close();
                    }
                    currentOpenMapMarkerInfoWindow = infoWindow;
                    infoWindow.open(map, marker);
                });
            }
            currentMapMarkers[currentMapMarkers.length] = marker;

            if (currentMapMarkers.length > maxMapMarkers && currentMapMarkers[0]) {
                clearMapMarker(currentMapMarkers[0]);
                currentMapMarkers.splice(0, 1);
            }
        },
        geocodeLocation = (function () {
            var geocodeCache = [],
                maxGeocodeCachesize = 50,
                cachedGeocodeLocation = function (location, callback) {
                    var getCachedGeocodeResult = function (locationToFind) {
                            return JSLINQ(geocodeCache).First(function (geocoding) {
                                return geocoding.location === locationToFind;
                            });
                        },
                        geocodeResult = getCachedGeocodeResult(location);
                    if (null !== geocodeResult) {
                        // Use saved geocoding against callback(results, status).
                        callback(geocodeResult.result, geocodeResult.status);
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
                                        results: data.result,
                                        status: data.status,
                                        timestamp: new Date().getTime()
                                    };
                                    if (geocodeCache.length > maxGeocodeCachesize) {
                                        geocodeCache.splice(0, 1);
                                    }
                                }
                                callback(data.result, data.status);
                            }
                        });
                    }
                };
            return cachedGeocodeLocation;
        }()),
        getLatest = function (siteInfo) {
            var opts = {
                site: siteInfo.filter,
                pagesize: 50,
                sort: "creation",
                order: "desc"
            },
                getNewQuestions;
            if (latestQuestionCreationDate[siteInfo.filter]) {
                // NOTE: always returns latest question we have already processed (min/fromdate is inclusive).
                opts.fromdate = latestQuestionCreationDate[siteInfo.filter];
            }
            getNewQuestions = $.stackExchangeApi.getQuestions(opts);
            getNewQuestions.always(function () {
                pendingPoll = null;
            });
            getNewQuestions.done(function (data) {
                var questions = JSLINQ(data.items).Where(function (question) {
                    return !hasMapMarker(question.question_id);
                }),
                    userIds = questions.Select(function (question) {
                        return question.owner ? question.owner.user_id : null;
                    }).Distinct(function (userId) {
                        return userId;
                    }).Where(function (userId) {
                        return null !== userId;
                    }).ToArray(),
                    getUsers = $.stackExchangeApi.getUsers({
                        site: siteInfo.filter,
                        ids: userIds
                    });

                getUsers.done(function (data) {
                    var users = JSLINQ(data.items);
                    questions.Select(function (question) {
                        var userForQuestion = users.First(function (user) {
                            return question.owner && question.owner.user_id === user.user_id;
                        });
                        if (null !== userForQuestion) {
                            question.user = userForQuestion;
                        }
                        return question;
                    }).Each(function (questionWithUserInfo) {
                        var locationToUse,
                            infoWindowContent = $.render($.extend(questionWithUserInfo, { site: siteInfo }), infoWindowTemplate),
                            infoWindow = new google.maps.InfoWindow({
                                content: infoWindowContent,
                                maxWidth: 250
                            });

                        if (markGeocodingFailures && (!questionWithUserInfo.user || !questionWithUserInfo.user.location)) {
                            // No user location but "mapping" anyway; use fallback without attempting geocoding.
                            locationToUse = mapFallbackLatLng;
                            createMapMarker(questionWithUserInfo.question_id, locationToUse, questionWithUserInfo.title, infoWindow);
                        } else if (questionWithUserInfo.user && questionWithUserInfo.user.location) {
                            geocodeLocation(questionWithUserInfo.user.location, function (results, status) {
                                if (status === google.maps.GeocoderStatus.OK) {
                                    locationToUse = results;
                                } else if (markGeocodingFailures) {
                                    // Geocoding fail but "mapping" anyway; use fallback.
                                    locationToUse = mapFallbackLatLng;
                                }

                                createMapMarker(questionWithUserInfo.question_id, locationToUse, questionWithUserInfo.title, infoWindow);
                            });
                        }
                        latestQuestionCreationDate[siteInfo.filter] = !latestQuestionCreationDate[siteInfo.filter] || latestQuestionCreationDate[siteInfo.filter] < questionWithUserInfo.creation_date ? questionWithUserInfo.creation_date : latestQuestionCreationDate[siteInfo.filter];
                    });
                });
                return getUsers;
            });
            return getNewQuestions;
        },
        failCount = 0,
        maxFailCount = 5,
        stopPoll = function () {
            if (pendingPoll) {
                clearTimeout(pendingPoll);
                keepPolling = false;
            }
            $startPolling.show();
            $stopPolling.hide();
        },
        poll = function (siteInfo) {
            if (map) {
                keepPolling = true;
                $startPolling.hide();
                $stopPolling.show();

                getLatest(siteInfo).always(function () {
                    if (keepPolling && !pendingPoll) {
                        pendingPoll = setTimeout(function () { poll(siteInfo); }, pollingWait);
                    }
                }).fail(function () {
                    failCount += 1;
                    if (failCount >= maxFailCount) {
                        stopPoll();
                    }
                });
            }
        },
        mapCenterCoordinates = { latitude: 20, longitude: 0 }, // Start with a default map center.
        getUserCoordinates = $.Deferred(function (dfd) {
            $.geoByIp.getLocation().done(function (data) {
                if (data.geoplugin_latitude && data.geoplugin_longitude) {
                    // Got user coordinates by IP; use them for map center.
                    mapCenterCoordinates = { latitude: data.geoplugin_latitude, longitude: data.geoplugin_longitude };
                    dfd.resolve();
                } else {
                    dfd.reject();
                }
            }).fail(dfd.reject);
        }),
        loadGoogleMaps = $.loadGoogleMaps();

    // Set Stack Exchange API app key for all requests.
    $.stackExchangeApi.typicalDefaults = $.extend($.stackExchangeApi.typicalDefaults, {
        key: apiKey
    });
    $stopPolling.click(function (e) {
        stopPoll();
        e.preventDefault();
    });
    $startPolling.click(function (e) {
        failCount = 0;
        $("#site-selection").dialog({
            title: "Pick a site",
            modal: true,
            closeOnEscape: false,
            open: function () { $(".ui-dialog-titlebar-close").hide(); },
            height: 350,
            buttons: [
                {
                    text: $startPolling.text(),
                    click: function () { $(this).dialog("close"); }
                }
            ],
            close: function () {
                var $selectedSiteInput = $("input[name='sites']:checked"),
                    siteFilter = $selectedSiteInput.val() || "stackoverflow",
                    siteUrl = $selectedSiteInput.data("site-url") || "www.stackoverflow.com",
                    siteAudience = $selectedSiteInput.data("site-audience"),
                    siteName = $selectedSiteInput.siblings("label").first().text();
                poll({ filter: siteFilter, url: siteUrl, audience: siteAudience, name: siteName });
            }
        });
        e.preventDefault();
    });
    $(document).bind("keydown", "esc", function () {
        stopPoll();
        // NOTE: Not explicitly cancelling event propagation here.
    });
    // Can't register jquery.hotkey for "?". Technically, this registers for "shift+/", which may not be universal, but it will do for now.
    $(document).bind("keyup", function (e) {
        if (e.keyCode === 191 && !$(e.target).is("input") && !$(e.target).is("textarea")) {
            $("#keyboard-shortcuts").dialog({
                title: "Keyboard Shortcuts",
                modal: true
            });
        }
    });

    $.views.registerHelpers({
        encodeURIComponent: function (val) {
            return encodeURIComponent(val);
        }
    });

    loadGoogleMaps.done(function () {
        getUserCoordinates.always(function () {
            map = new google.maps.Map($("#map_canvas")[0], {
                center: new google.maps.LatLng(mapCenterCoordinates.latitude, mapCenterCoordinates.longitude),
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.TERRAIN
            });
            mapFallbackLatLng = new google.maps.LatLng(-78.4644915, 106.83397289999994); // Antarctica
            mapMarkerImage = new google.maps.MarkerImage("/images/stachexchangemapmarker.png", new google.maps.Size(19, 34), new google.maps.Point(0, 0), new google.maps.Point(9, 34));
            mapMarkerImageShadow = new google.maps.MarkerImage("/images/stachexchangemapmarker.png", new google.maps.Size(29, 34), new google.maps.Point(28, 0), new google.maps.Point(0, 34));
            clearMapMarker = function (marker) {
                marker.setMap(null);
            };
            $.stackExchangeApi.getAllSitesWithMultipleRequests({ pagesize: 100 }).done(function (data) {
                // NOTE: currently omitting meta sites.
                var siteItems = JSLINQ(data).Where(function (site) {
                    return site.site_type !== "meta_site";
                }),
                    $siteCheckboxes = $($("#siteCheckboxesTemplate").render(siteItems.ToArray()));
                $siteCheckboxes.first().find("input").attr("checked", "checked");
                $("#sites").html($siteCheckboxes);
                $startPolling.click();
            });
        });
    });
});