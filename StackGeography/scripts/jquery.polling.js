﻿/*global jQuery, setTimeout, clearTimeout*/
(function ($) {
    "use strict";
    $.polling = (function () {
        var currentQueue = {},
            stopPending = function (id) {
                if (currentQueue[id]) {
                    clearTimeout(currentQueue[id]);
                    delete currentQueue[id];
                }
            },
            queue = function (id, action, wait) {
                stopPending(id);
                currentQueue[id] = setTimeout(action, wait);
            },
            hasPending = function (id) {
                return currentQueue[id];
            },
            stopAll = function () {
                var pollId;
                for (pollId in currentQueue) {
                    if (currentQueue.hasOwnProperty(pollId)) {
                        stopPending(pollId);
                    }
                }
            },
            getQueueAsArray = function () {
                var queue = [],
                    queueItem;
                for (queueItem in currentQueue) {
                    if (currentQueue.hasOwnProperty(queueItem)) {
                        queue[queue.length] = {
                            id: queueItem,
                            timeoutId: currentQueue[queueItem]
                        };
                    }
                }
                return queue;
            };
        return {
            getCurrentQueue: getQueueAsArray, // for debugging
            stopPending: stopPending,
            queue: queue,
            hasPending: hasPending,
            stopAll: stopAll
        };
    }());
}(jQuery));