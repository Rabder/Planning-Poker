# Planning Poker - Inspired by HFSD


## Overview
This is a multiplayer browser game that is meant to adapt the mechanics of the "Planning Poker" game in the HFSD book as an online experience.

## Instructions and game flow
**Setup:**
-   Players join a room via shareable room code
-   Each player has a deck of 13 cards:
    -   **Fibonacci estimates:** 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 (estimated days)
    -   **? card:** Not enough information to estimate
    -   **☕ card:** Need a break
-   One player is designated moderator (rotates each round)

**Game Flow (4 stages):**

**1. STORY INPUT**

-   Current moderator defines a user story
-   Story is visible to all players
-   Advances when story is submitted

**2. THINKING**

-   All players consider which card to play
-   Each player selects a card, then clicks "Ready"
-   Must select card BEFORE clicking ready
-   Advances only when ALL players have selected + readied

**3. REVEAL**

-   All chosen cards are simultaneously revealed to everyone
-   Players can see what everyone estimated
-   Players click "Ready" when done viewing

**4. DISCUSSION**

-   Team discusses the estimates
-   When discussion concludes, players click "Ready"
-   Advances when all players ready
-   Returns to STORY INPUT with next player as moderator

The cycle repeats with a rotating moderator each round.

> Written with [StackEdit](https://stackedit.io/).
