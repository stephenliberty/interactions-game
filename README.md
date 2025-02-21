# The Game

This is a virtual suggestion game in the spirit of "pick a card from the pile and have it happen". This is an evolving 
app, letting me put together some details about NestJS and Next.js that I haven't had an opportunity to learn from 
scratch in other contexts. This has been iterated on since about 2020, being restarted multiple times to learn new 
frameworks (or from a disk crash that had no backup - whoops). The big learning item here is that separating the API
work from the UI work makes a huge difference - doing both at once leads to rapid burnout. So we're aiming to be able
to play a complete game via REST calls first, then build an interaction layer on top of that.

## Important note

Nothing in this repo is allowed to be generated via "AI". I may consider integrating with those systems later to build
content, but the code itself must come directly from brain matter. 

## The rules

* Each player joins the game. They choose what level of intensity they're interested in, what items they have around,
how they want to interact with other people, etc. 
* Game owner starts the game and is now the active player.
* One or more actions are generated for the active player to either play or pass on target user(s).
* Active user determines whether to play the action or not. If they play the card and the target(s) agree to perform what
is on the card, the target(s) get points.
* Active user is passed to next person based on joining order.

### Actions

Each action is a randomly generated card that describes an action that the target or potentially multiple targets must
perform in order to get the points assigned to the card. 

### Points

Points are accumulated by doing what was suggested on the card. If a user has enough points they will be able to do 
things such as double-turns, reversing active/target users, etc. Fun things.

### End of game

There is no real end of game - it's mostly when the users decide that they've had their fun and are ready to move on.

## License

This is copyright, owned by https://github.com/stephenliberty 
