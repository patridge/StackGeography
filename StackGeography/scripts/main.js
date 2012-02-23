/*global document, $, JSLINQ, clearTimeout, setTimeout */

$(function () {
    "use strict";
    var stackExchangeApiKey = "BFkB32WKyHjbqI9RYU1lKA((",
        stackExchangeApiFilter = "!Txfh2mrFy-p6RynMil1VXSkHECJn8fbSNFzHmEjS4am",
        latestQuestionCreationDate = {},
        loadGoogleMaps = $.googleMaps.loadApi({
            key: "AIzaSyBOT4rTeK6L9WegBXUncMaQHrUULF9UtWM"
            //, url: "/scripts/googlemapsv3.js"
        }),
        preferences = $.stackgeography.preferences,
        optionsTemplate = $.template("optionsTemplate", $("#optionsTemplate")),
        defaultMapCenterLocation = preferences.mapCenterLatLng.get(), // Start with a default map center.
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
        infoWindowTemplate = $.template("infoWindowTemplate", $("#infoWindowTemplate")),
        $startPolling = $("#start-polling"),
        $stopPolling = $("#stop-polling"),
        $options = $("#options"),
        keepPolling = true,
        pollingWait = 60000,
        hasMapMarker = function (id) {
            return JSLINQ(currentMapMarkers).Any(function (currentMarker) {
                return currentMarker.questionId && currentMarker.questionId === id;
            });
        },
        markLatestQuestionsOnMap = function (siteInfo) {
            var opts = {
                site: siteInfo.filter,
                pagesize: 50,
                sort: "creation",
                order: "desc"
            },
                getNewQuestionsWithUsers,
                mapQuestionCoords = $.Deferred();
            if (latestQuestionCreationDate[siteInfo.filter]) {
                // NOTE: always returns latest question we have already processed (min/fromdate is inclusive).
                opts.fromdate = latestQuestionCreationDate[siteInfo.filter];
            }
            getNewQuestionsWithUsers = $.stackExchangeApi.getQuestionsWithFullUsers(opts);
            getNewQuestionsWithUsers.fail(mapQuestionCoords.reject);
            getNewQuestionsWithUsers.done(function (data) {
                var questionUserHasLocation = function (questionWithUser) {
                        return questionWithUser && questionWithUser.user && questionWithUser.user.location;
                    },
                    questionsWithUsers = JSLINQ(data.items).Where(function (question) {
                        return !hasMapMarker(question.question_id);
                    }),
                    newestQuestionCreationDate = questionsWithUsers.Select(function (question) {
                        return question.creation_date;
                    }).OrderByDescending(function (creationDate) {
                        return creationDate;
                    }).First(),
                    userLocations = questionsWithUsers.Select(function (questionWithUser) {
                        return questionUserHasLocation(questionWithUser) ? questionWithUser.user.location : null;
                    }).Distinct(function (location) {
                        return location;
                    }).Where(function (location) {
                        return location !== null && location.length > 0;
                    }).ToArray(),
                    getLocationCoords = $.geocode.getStringLatLng(userLocations);

                getLocationCoords.done(function (data) {
                    var locations = data.results,
                        currentMaxMapMarkers = preferences.maxMapMarkers.get();
                    questionsWithUsers.Each(function (questionWithUser) {
                        var locationForQuestion = null,
                            markerOptions = {},
                            marker;
                        if (questionUserHasLocation(questionWithUser)) {
                            locationForQuestion = locations[questionWithUser.user.location.toUpperCase()] || null;
                        }
                        if (null === locationForQuestion && useGeocodingFallback) {
                            locationForQuestion = mapFallbackLocation;
                        }
                        if (null !== locationForQuestion) {
                            markerOptions.location = locationForQuestion;
                            markerOptions.title = questionWithUser.title;
                            if (preferences.useSiteIcons.get() && siteInfo.iconSrc) {
                                markerOptions.markerImage = new $.googleMaps.MarkerImage(siteInfo.iconSrc, null, null, null, { width: 24, height: 24 });
                                markerOptions.markerImageShadow = null;
                                markerOptions.icon = siteInfo.iconSrc;
                            }
                            marker = $.googleMaps.createMarker(markerOptions);
                            marker.id = questionWithUser.question_id;
                            marker.placeOnMap(map, {
                                infoWindowHtml: $.render($.extend(questionWithUser, { site: siteInfo }), infoWindowTemplate),
                                infoWindowMaxWidth: 250
                            });
                            currentMapMarkers[currentMapMarkers.length] = marker;
                            if (currentMapMarkers.length > currentMaxMapMarkers && currentMapMarkers[0]) {
                                currentMapMarkers[0].clearFromMap();
                                currentMapMarkers.splice(0, 1);
                            }
                        }
                    });
                    // Only update latest question date if all goes well.
                    latestQuestionCreationDate[siteInfo.filter] = !latestQuestionCreationDate[siteInfo.filter] || latestQuestionCreationDate[siteInfo.filter] < newestQuestionCreationDate ? newestQuestionCreationDate : latestQuestionCreationDate[siteInfo.filter];
                    mapQuestionCoords.resolve();
                }).fail(mapQuestionCoords.reject);
            });
            return mapQuestionCoords;
        },
        failCount = 0,
        maxFailCount = 5,
        stopPolling = function () {
            $.polling.stopAll();
            $startPolling.show();
            $stopPolling.hide();
        },
        startPolling = function (siteInfo) {
            if (map) {
                $.polling.stopPending(siteInfo.filter);
                keepPolling = true;
                $startPolling.hide();
                $stopPolling.show();

                markLatestQuestionsOnMap(siteInfo).always(function () {
                    if (keepPolling) {
                        // pollingUtility.queue will take care of clearning any existing poll for this site.
                        $.polling.queue(siteInfo.filter, function () { startPolling(siteInfo); }, pollingWait);
                    }
                }).fail(function () {
                    failCount += 1;
                    if (failCount >= maxFailCount) {
                        $.polling.stopPending(siteInfo.filter);
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
        stopPolling();
        e.preventDefault();
    });
    $startPolling.click(function (e) {
        stopPolling();
        failCount = 0;
        $("#site-selection").dialog({
            title: "Pick a site",
            modal: true,
            closeOnEscape: false,
            open: function () {
                var savedSiteSelection = preferences.siteSelection.get(),
                    $this = $(this);
                $(".ui-dialog-titlebar-close").hide();
                $this.on("keyup.enter", function (e) {
                    if (e.keyCode === $.ui.keyCode.ENTER) {
                        $(this).dialog("close");
                        e.preventDefault();
                    }
                });
                $("#" + savedSiteSelection).attr("checked", "checked");
                $this.find("input[name='sites']:checked").focus();
            },
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
                    siteIconSrc = $("label[for='" + siteFilter + "']").find("img").attr("src") || "http://sstatic.net/stackoverflow/img/apple-touch-icon.png",
                    siteAudience = $selectedSiteInput.data("site-audience"),
                    siteName = $selectedSiteInput.siblings("label").first().text();
                preferences.siteSelection.set(siteFilter);
                startPolling({ filter: siteFilter, iconSrc: siteIconSrc, url: siteUrl, audience: siteAudience, name: siteName });
                $(this).off("keyup.enter");
            }
        });
        e.preventDefault();
    });
    $(document).bind("keydown", "esc", function () {
        stopPolling();
        // NOTE: Not explicitly cancelling event propagation here.
    });
    $(document).bind("keyup", "s", function (e) {
        $startPolling.click();
        e.preventDefault();
    });
    $(document).bind("keyup", "o", function (e) {
        var prefs = {
                useSiteIcons: $.stackgeography.preferences.useSiteIcons.get(),
                maxMapMarkers: $.stackgeography.preferences.maxMapMarkers.get()
            },
            optionsHtml = $.render(prefs, optionsTemplate);
        $options.html(optionsHtml);
        $options.dialog({
            title: "Options",
            modal: true,
            closeOnEscape: false,
            open: function () {
                $(".ui-dialog-titlebar-close").hide();
                $(this).on("keyup.enter", function (e) {
                    if (e.keyCode === $.ui.keyCode.ENTER) {
                        $(this).dialog("close");
                        e.preventDefault();
                    }
                });
            },
            height: 350,
            buttons: {
                "Cancel": function () {
					$(this).dialog("close");
				},
                "Save": function () {
                    var newUseSiteIcons = $options.find("#use-site-icons").is(":checked"),
                        newMaxMapMarkers = $options.find("#max-marker-count").val(),
                        markersToRemove,
                        markerIndex;
                    preferences.useSiteIcons.set(newUseSiteIcons);
                    if (newMaxMapMarkers > 0) {
                        preferences.maxMapMarkers.set(newMaxMapMarkers);
                        if (newMaxMapMarkers < currentMapMarkers.length) {
                            // Reducing max: yank any old markers until we meet the new max.
                            markersToRemove = currentMapMarkers.splice(0, currentMapMarkers.length - newMaxMapMarkers);
                            for (markerIndex = markersToRemove.length - 1; markerIndex >= 0; markerIndex -= 1) {
                                markersToRemove[markerIndex].clearFromMap();
                            }
                        }
                    }
                    $(this).dialog("close");
                }
            }
        });
        e.preventDefault();
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