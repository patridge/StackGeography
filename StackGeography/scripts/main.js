/*global document, $, JSLINQ, clearTimeout, setTimeout */

$(function () {
    "use strict";
    var stackExchangeApiKey = "BFkB32WKyHjbqI9RYU1lKA((",
        stackExchangeApiFilter = "!*QjqSxwBvameYSqv*KAWVuBqECIRl4sAdZy(idPWq",
        latestQuestionCreationDate = {},
        loadGoogleMaps = $.googleMaps.loadApi(),
        defaultMapCenterLocation = { lat: 20, lng: 0 }, // Start with a default map center.
        getMapCenter = $.Deferred(function (dfd) {
            $.geocode.getIpLatLng().done(function (userLocation) {
                dfd.resolve(userLocation);
            }).fail(function () {
                // Moving on regardless of getting user coordinates.
                dfd.resolve(defaultMapCenterLocation);
            });
        }),
        map,
        mapFallbackLocation = {
            lat: -78.4644915,
            lng: 106.83397289999994
        }, // Antarctica
        currentMapMarkers = [],
        useGeocodingFallback = false,
        maxMapMarkers = 500,
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
                        var markerOptions = {},
                            marker,
                            getGeocodeLocation = $.Deferred();

                        if (questionWithUserInfo.user && questionWithUserInfo.user.location) {
                            $.geocode.getStringLatLng(questionWithUserInfo.user.location).done(function (results) {
                                getGeocodeLocation.resolve(results);
                            }).fail(function () {
                                if (useGeocodingFallback) {
                                    // No location, but we are mapping those to fallback location.
                                    getGeocodeLocation.resolve(mapFallbackLocation);
                                } else {
                                    getGeocodeLocation.reject();
                                }
                            });
                        } else if (useGeocodingFallback) {
                            // No location, but we are mapping those to fallback location.
                            getGeocodeLocation.resolve(mapFallbackLocation);
                        }

                        getGeocodeLocation.done(function (geocodedLocation) {
                            markerOptions.location = geocodedLocation;
                            markerOptions.title = questionWithUserInfo.title;
                            marker = $.googleMaps.createMarker(markerOptions);
                            marker.id = questionWithUserInfo.question_id;
                            marker.placeOnMap(map, {
                                infoWindowHtml: $.render($.extend(questionWithUserInfo, { site: siteInfo }), infoWindowTemplate),
                                infoWindowMaxWidth: 250
                            });
                            currentMapMarkers[currentMapMarkers.length] = marker;
                            if (currentMapMarkers.length > maxMapMarkers && currentMapMarkers[0]) {
                                currentMapMarkers[0].clearFromMap();
                                currentMapMarkers.splice(0, 1);
                            }
                        });
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
        };

    // Set Stack Exchange API app key for all requests.
    $.stackExchangeApi.typicalDefaults = $.extend($.stackExchangeApi.typicalDefaults, {
        key: stackExchangeApiKey,
        filter: stackExchangeApiFilter
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

    $.when(getMapCenter, loadGoogleMaps).done(function (center) {
        map = $.googleMaps.createMap($("#map_canvas")[0], {
            center: center,
            zoom: 2
        });
        $.googleMaps.createMarker.defaults.markerImage = $.googleMaps.MarkerImage("/images/stachexchangemapmarker.png", { width: 19, height: 34 }, { x: 0, y: 0 }, { x: 9, y: 34 });
        $.googleMaps.createMarker.defaults.markerImageShadow = $.googleMaps.MarkerImage("/images/stachexchangemapmarker.png", { width: 29, height: 34 }, { x: 28, y: 0 }, { x: 0, y: 34 });
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