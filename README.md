##StackGeography

StackGeography is the code behind [stackgeography.com](http://www.stackgeography.com/). Stackgeography.com is a mapping of recent question from [Stack Exchange API][1] sites on a [Google Maps API][2] map. All Stack Exchange sites are capable of being polled, though the current selection system filters out the corresponding "Meta *" sites to keep the list from being so long.

###Newly Added

* Multiple site polling concurrently
* Per-site icons

###Coming Soon

While everything is in a fairly stable state, I do plan to add a number of additional features.

* _Additional data visualization_ I would like to add some indicators to the question info window to indicate votes/score, answered status, and number of answers.
* _Refactoring everywhere_ I hope to extract a number of parts from the JavaScript I wrote for this project into reusable chunks, some of which may end up as separate projects (e.g., my wrapper for Google Maps to make it play well with jQuery's deferred system).

###APIs Used

* [Stack Exchange API v2.0][1]
* [Google Maps v3][2]

###Projects Used

* [jQuery v1.7.1 (MIT or GPL)][3] (used for just about everything)
* [jQuery UI v1.8.16 (MIT or GPL)][4] (used for the site selection dialog)
* [jsrender v1.0pre (MIT)][5] (used to render out a number of things from JavaScript objects to HTML)
* [LINQ to JavaScript (JSLINQ) v2.10 (Ms-RL)][6] (used for collection manipulations)
* [URI.js (MIT or GPL)][7] (used to simplify URL handling)
* [jquery-jsonp (MIT)](http://code.google.com/p/jquery-jsonp/)
* [jquery.hotkeys (MIT or GPL)](https://github.com/jeresig/jquery.hotkeys/blob/master/jquery-1.4.2.js)

###License

MIT license. If you do something cool with it, though, I'd love to hear about it.

###Author

[Adam Patridge][8]

###Useless Background

I wanted to put together a mapping demo that I could use for a demo project of an upcoming feature I am adding to the [Sierra Trading Post API](http://dev.sierratradingpost.com) (my full-time job). Since the day I started writing the first code for the Sierra Trading Post API, I have tried to research other APIs to learn from their successes and pain points. One such API that has provided a lot of [positive] learning is the [Stack Exchange API][1]. It just so happened that they were releasing version 2 of their API, so I decided to use that for my first proof-of-concept mapping fun.

I started everything in [jsFiddle](http://jsfiddle.net). After exactly 337 revisions over a week through jsFiddle, I decided to put the code and markup somewhere more permanent. I went out and registered a domain and set up this repository. I have started working on getting it hosted through [AppHarbor](https://appharbor.com/) but I haven't nailed that down yet as I am still picking up Git, GitHub, and AppHarbor.

###Release Notes

####2012-02-24

* Ability to poll meta Stack Exchange sites, defaults to omit to keep site list shorter (toggle via saved option).
* Marker placement can be staggered via saved option.
* Clear map markers via <kbd>#</kbd> (known issue with clearing while staggered placement is ongoing).

####2012-02-23

* **Polling multiple sites concurrently!** The UI still needs work, but if you return to site selection by pressing <kbd>S</kbd>, you can keep adding sites to poll.
* Polling management: hit <kbp>P</kbd> to view pending polls and cancel some/all of them.
* Options management: hit <kbp>O<kbd> to view/set options (more options to come).
* Using localStore for StackGeography options (currently only saving last selected site and maximum map markers).

####2012-01-19

* Mark questions with site-specific map markers.
* Options window:
  * Toggle site-based map markers vs. generic stackgeography.com map marker.
  * Change max number of markers shown (default 500).

####2012-01-18

* Switched to ASP.NET MVC to make it easier to output-cache common API hits on the server.

####2012-01-16

* Added location geocoding in batches (up to 100).

####2012-01-13

* Added filters to the Stack Exchange API calls to cut down on JSON coming back from those requests.
* Switched to SQL Server on AppHarbor to avoid locking issues on geocode cache inserts.
* Added keyboard shortcuts ('?' brings up hint window).

####2009-01-09

* Google Maps 403 issue patched with server-side caching proxy for geocoding API requests.

  [1]: http://api.stackexchange.com/docs/
  [2]: http://code.google.com/apis/maps/documentation/javascript/basics.html
  [3]: http://jquery.com/
  [4]: http://jqueryui.com/
  [5]: https://github.com/BorisMoore/jsrender
  [6]: http://jslinq.codeplex.com/
  [7]: http://medialize.github.com/URI.js/
  [8]: http://www.patridgedev.com/