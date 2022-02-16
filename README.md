# Addle

A PvP, Wordle-like word guessing game. Currently hosted and available at https://addle.pekoe.dev

## How it works

There are 2 players, the guesser and the enemy (for the lack of a better word).
The guesser is attempting to guess the word much like a normal Wordle puzzle.
The enemy is able to enter an target word every turn, with the goal of keeping the guesser from guessing it until the 6 turns run out.
With each guess, information is revealed to the guesser in the form of hits, close calls, and misses, much like a normal Wordle.
The answers that the enemy picks must respect all currently revealed information.
This means that as the match goes on, the enemy's choices will become increasingly limited.
