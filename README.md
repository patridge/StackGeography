##StackGeography

StackGeography is a mapping of recent question from the [Stack Exchange API][1] on a  [Google Maps API][2] map. All Stack Exchange sites are capable of being polled, though the current selection system filters out the corresponding "Meta *" sites to keep the list from being so long.

###Coming Soon

While everything is in a fairly stable state, I do plan to add a number of additional features.

* _Multiple site polling concurrently_ Currently, you can stop polling one site and switch to another and maintain existing markers. I would like to make the first window a set of checkboxes and poll them all concurrently. Of course, this probably won't happen until I can figure out how to get the most out of the Stack Exchange API quota.
* _Additional data visualization_ I would like to add some indicators to the question info window to indicate votes/score, answered status, and number of answers.
* _Refactoring everywhere_ I hope to extract a number of parts from the JavaScript I wrote for this project into reusable chunks, some of which may end up as separate projects (e.g., my wrapper for Google Maps to make it play well with jQuery's deferred system).
* _[Stack Exchange API Filters](http://kevinmontrose.com/2012/01/06/stack-exchange-api-v2-0-filters/)_ Using filters will greatly reduce the data that the Stack Exchange API has to send back to me for each request. Since I use very little of what I get back, filters should make my responses reflect that.

###APIs Used

* [Stack Exchange API v2.0][1]
* [Google Maps v3][2]

###Code Used

* [jQuery v1.7.1 (MIT or GPL)][3] (used for just about everything)
* [jQuery UI v1.8.16 (MIT or GPL)][4] (used for the site selection dialog)
* [jsrender v1.0pre (MIT)][5] (used to render out a number of things from JavaScript objects to HTML)
* [LINQ to JavaScript (JSLINQ) v2.10 (Ms-RL)][6] (used for collection manipulations)
* [URI.js (MIT or GPL)][7] (used to simplify URL handling)

###License

I haven't decided yet between MIT and Ms-RL, and it really doesn't seem to matter unless I need to use one over the other to sub-license my work, but the code is all here for anyone to view. While the U.S. IP systems doesn't work this way, there isn't much here that someone else wouldn't come up in a similar look and feel if they had the same goal in mind.

###Author

[Adam Patridge][8]

###Useless Background

I wanted to put together a mapping demo that I could use for a demo project of an upcoming feature I am adding to the [Sierra Trading Post API](http://dev.sierratradingpost.com) (my full-time job). Since the day I started writing the first code for the Sierra Trading Post API, I have tried to research other APIs to learn from their successes and pain points. One such API that has provided a lot of [positive] learning is the [Stack Exchange API][1]. It just so happened that they were releasing version 2 of their API, so I decided to use that for my first proof-of-concept mapping fun.

I started everything in [jsFiddle](http://jsfiddle.net). After exactly 337 revisions over a week through jsFiddle, I decided to put the code and markup somewhere more permanent. I went out and registered a domain and set up this repository. I have started working on getting it hosted through [AppHarbor](https://appharbor.com/) but I haven't nailed that down yet as I am still picking up Git, GitHub, and AppHarbor.

  [1]: http://api.stackexchange.com/docs/
  [2]: http://code.google.com/apis/maps/documentation/javascript/basics.html
  [3]: http://jquery.com/
  [4]: http://jqueryui.com/
  [5]: https://github.com/BorisMoore/jsrender
  [6]: http://jslinq.codeplex.com/
  [7]: http://medialize.github.com/URI.js/
  [8]: http://www.patridgedev.com/