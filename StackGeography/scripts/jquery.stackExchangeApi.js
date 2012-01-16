/*global jQuery, $, console, JSLINQ, URI */

(function ($) {
    "use strict";
    var apiHost = "api.stackexchange.com",
        idsMaxLength = 100,
        getApiUrlWithOptions = function (url, options) {
            // Append ids to URL.
            var ids = options.ids || [],
                finalUrl;

            if (ids instanceof Array && ids.length > idsMaxLength) {
                if (console && console.warn) {
                    console.warn("Cannot pass more than " + idsMaxLength + " (http://api.stackexchange.com/docs/vectors). IDs were trimmed to " + idsMaxLength + ".");
                }
                ids = ids.splice(0, idsMaxLength);
            }
            finalUrl = URI("https://" + apiHost + url + (ids instanceof Array ? ids.join(";") : ids));
            // Append all options as querystring parameters.
            $.each(options, function (i, val) {
                if (val) {
                    finalUrl.addSearch(i, val);
                }
            });
            return finalUrl;
        },
        getApiDataPromise = function (url) {
            var apiGetPromise = $.ajax({
                dataType: "jsonp",
                url: url
            }),
                resultDfd = $.Deferred();
            apiGetPromise.done(function (data) {
                if (data.error_id) {
                    // SE returned an error despite "200 OK" because of JSONP. Fail here.
                    resultDfd.reject();
                } else {
                    resultDfd.resolve(data);
                }
            });
            return resultDfd.promise();
        };
    $.stackExchangeApi = {};
    $.stackExchangeApi.typicalDefaults = {
        pagesize: 50, // SE default: 30
        site: "stackoverflow",
        order: "desc"
        //min: lastValueForSort,
        //key: yourApiKey,
        //todate: someTimestamp,
        //fromdate: someTimestamp,
        //ids: "1;2;3",
        //page: x,
    };
    $.stackExchangeApi.getQuestions = function (options) {
        var opts = $.extend({}, $.stackExchangeApi.typicalDefaults, { sort: "creation" }, options),
            url = getApiUrlWithOptions("/2.0/questions/", opts);
        return getApiDataPromise(url);
    };
    $.stackExchangeApi.getQuestionsWithFullUsers = function (options) {
        var getQuestions = $.stackExchangeApi.getQuestions(options),
            resultDfd = $.Deferred();
        getQuestions.done(function (data) {
            var questions = JSLINQ(data.items),
                userIds = questions.Select(function (question) {
                    return question.owner ? question.owner.user_id : null;
                }).Distinct(function (userId) {
                    return userId;
                }).Where(function (userId) {
                    return null !== userId;
                }).ToArray(),
                getUsers = $.stackExchangeApi.getUsers({
                    site: options.site || $.stackExchangeApi.typicalDefaults.site,
                    ids: userIds
                });

            getUsers.done(function (data) {
                var users = JSLINQ(data.items),
                    questionsWithUsers = questions.Select(function (question) {
                        var userForQuestion = users.First(function (user) {
                            return question.owner && question.owner.user_id === user.user_id;
                        });
                        if (null !== userForQuestion) {
                            question.user = userForQuestion;
                        }
                        return question;
                    });
                resultDfd.resolve(questionsWithUsers);
            }).fail(resultDfd.reject);
        }).fail(resultDfd.reject);
        return resultDfd.promise();
    };
    $.stackExchangeApi.getUsers = function (options) {
        var opts = $.extend({}, $.stackExchangeApi.typicalDefaults, { sort: "reputation" }, options),
            url = getApiUrlWithOptions("/2.0/users/", opts);
        return getApiDataPromise(url);
    };
    $.stackExchangeApi.getAllSitesWithMultipleRequests = function (options) {
        // Currently only works for first 200 sites until I make it all recursively awesome.
        var allSiteItems,
            resultDfd = $.Deferred();
        $.stackExchangeApi.getSites(options).done(function (page1Data) {
            allSiteItems = page1Data.items;
        }).done(function () {
            $.stackExchangeApi.getSites($.extend({}, options, { page: 2 })).done(function (page2Data) {
                allSiteItems = allSiteItems.concat(page2Data.items);
                resultDfd.resolve(allSiteItems);
            });
        }).fail(resultDfd.reject);
        return resultDfd.promise();
    };
    $.stackExchangeApi.getSites = function (options) {
        var opts = $.extend({ pagesize: 100, filter: $.stackExchangeApi.typicalDefaults.filter, key: $.stackExchangeApi.typicalDefaults.key }, options),
            url = getApiUrlWithOptions("/2.0/sites/", opts);
        // NOTE: when there are more than 100 sites, this will not get them all.
        return getApiDataPromise(url);
    };
}(jQuery));