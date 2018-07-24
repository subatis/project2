# Project 2

TODO: usernames appearing in user list when changing name (using SID?), socket disconnect


Web Programming with Python and JavaScript

This project had a steep learning curve for me--it took my awhile to realize that the gap in my knowledge mostly came down to
AJAX/socketio/JSON and how data was being passed between the server & client. I do somewhat wish I could tear it all down and
rebuild it from scratch but no time for that :)

General notes:
-The spec didn't really mention anything about things like duplicate usernames, checking for "machine IDs", or how to handle weird
cases like if a user was in a channel when the server 'went down' and so on. I tried to handle as many of these cases as possible
but it is likely there are still edge cases that produce weird behavior (mostly around having a session up, killing flask, and then
restarting flask while the session is still 'open')
-->I would be very interested in feedback for how to get unique IDs for sockets/machines. I generated a unique ID using a simple
random number, as I couldn't find reliable info online about a built-in socket ID to socketio
-->I relied heavily on this SID for broadcasts targeted only at specific users

-I used handlebars templates for the chatboxes,  user list, and channel list but I do realize it didn't add a TON of value since there
wasn't much HTML...just wanted to give Handlebars a try.

-As mentioned earlier, if I could redo everything, I would've spent most of the beginning putting together a more robust data structure
around channels/users/messages etc, all with the intention of facilitating an ease for passing around JSON info. This is probably
the most important lesson I learned here!

-Channels store their 'creator' in my code, as I had the intention of also allowing a channel creator to delete a channel they
created, but I ran out of time for this (there are other 'bonus' features implemented)

-I know during one of our email exchanges you said that the best way to swap HTML would be to serve up code from other HTML docs
via AJAX, but for the scope of this project I decided to keep it exceedingly simple and use the "visible" CSS property.

Files:
application.py - The server-side Flask app. Channels are a class that store their creator, a list of users currently in that channel,
                 and a list of messages currently in that channel. I made heavy use of dictionaries here, both for their easy JSONification,
                 and also because the key-value pair model came with built-in "dupe" checking.
index.js - The client-side code. A lot of the logic is in functions at the bottom of the doc (to display/render channels, user lists,
           messages, etc.) The rest mostly lies in the Emit/On functions of Socket. I used AJAX a bit as well in situations where we
           purely needed to GET info from the server without emitting events. This is one of my least favorite parts of what I wrote
           though, it would've been more elegant to simply have everything fire via Socket but I didn't have enough time to go back
           and redo everything in that light.
index.html - The only page. Uses Handlebars templates at the top for channel/user list items and chat messages.
styles.scss - Styling. As usual I spent too much time battling bootstrap so my apologies for excessive use of !important (I figured
              CSS wasn't the focus here)
styles.css - Compiled from styles.scss
banner.jpg - Banner image at top of page

Project Req Checklist:
Display Name: User is prompted on first visit. Can also change name at any time. Display name is remembered in localStorage.
Channel Creation: Can create new channels. Dupes are prevented via Python dictionary.
Channel List: Displayed via Bootstrap List Group, which allows for easy selection.
Message List: Message list is refreshed upon channel change or page reload. When in a channel, only the most RECENT messages are
              appended to the view. Only 100 messages are remembered server-side. Client-side, only 100 'server stored' messages
              can be displayed at a time, however, private messages may allow the user to (temporarily) exceed this limit.
Sending Messages: Users can send messages that are displayed to all users in a given channel. They can also send private messages
                  that will only display for the targeted user. Messages are displayed w/ username, timestamp and message.
Remembering the Channel: The current channel is also stored in localStorage. If the current channel no longer exists when rejoining
                         the site, it defaults to 'general'.
Personal touch: I had a few, though a couple of them may not 'count' as they were more structural than anything else:
-->Users can private message each other, though these messages are permanently cleared upon changing channels or leaving site, since
   they are never stored server-side. This is done using the @ sign, like Slack or Twitter.
-->Users have a session ID (SID) which is generated upon first arrival if they don't already have one in localStorage. At its most
basic, this allows a user to grab the same username(s) as their last visit. It also could serve other purposes (that I would've liked)
but ultimately I didn't have time to continue down this train of thought. Still an interesting exercise!
-->A list of users currently in the channel is displayed along with the channel list.
-->Users are removed from user list(s) when on('disconnect'), but I was never able to fully test this, as it was unclear how often
Socket would run its checks for connections or when this was working.

SOURCES:
Remove rounded corners in bootstrap-
https://stackoverflow.com/questions/9742166/getting-rid-of-all-the-rounded-corners-in-twitter-bootstrap

Vertically center elements in bootstrap-
https://stackoverflow.com/questions/22196587/how-to-center-align-vertically-the-container-in-bootstrap

User IDs for sockets-
https://gist.github.com/ericremoreynolds/dbea9361a97179379f3b
^some info here but ultimately just assigned a random # with help from:
https://stackoverflow.com/questions/3231459/create-unique-id-with-javascript

Some assistance with disconnect from socketio-
https://stackoverflow.com/questions/34428404/socket-io-disconnect-not-called-if-page-refreshed-fast-enough

Removing elements with querySelector-
https://stackoverflow.com/questions/45066321/delete-specific-child-elements-from-dom

Check if JavaScript array is empty-
https://stackoverflow.com/questions/7378228/check-if-an-element-is-present-in-an-array

Python dictionaries are serializable (for JSON)-
https://stackoverflow.com/questions/10252010/serializing-class-instance-to-json

Get current timestamp in Python-
https://stackoverflow.com/questions/415511/how-to-get-the-current-time-in-python

JSONify a list in Python-
https://stackoverflow.com/questions/12435297/how-do-i-jsonify-a-list-in-flask

Showing/hiding elements in JavaScript-
https://stackoverflow.com/questions/21070101/show-hide-div-using-javascript

Dealing with the unbelievably annoying 'global' warnings in online IDE-
https://stackoverflow.com/questions/38270011/varname-is-not-defined-please-fix-or-add-global-varname-cloud9

Scrollable div (e.g. using CSS without using iframe)-
https://stackoverflow.com/questions/9707397/making-a-div-vertically-scrollable-using-css

Keeping div scrollbar at bottom (to display recent messages first at all times)-
https://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up

Python string slicing-
https://stackoverflow.com/questions/663171/is-there-a-way-to-substring-a-string-in-python

Other references that assisted me for private message functionality-
https://stackoverflow.com/questions/3427132/how-to-get-first-character-of-string
https://stackoverflow.com/questions/3221891/how-can-i-find-the-first-occurrence-of-a-sub-string-in-a-python-string