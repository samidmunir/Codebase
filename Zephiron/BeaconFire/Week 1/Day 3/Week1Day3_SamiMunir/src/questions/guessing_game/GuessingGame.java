package questions.guessing_game;

import java.util.Random;

public class GuessingGame {
    /**
     * An integer representing the randomly generated number (the number to be guessed).
     */
    private int answer;
    /**
     * A random generator object.
     */
    private final Random generator;
    /**
     * A Boolean field indicating if game is still in progress or not.
     */
    private boolean gameOver;
    /**
     * An integer representing the difference between a guess and the answer.
     */
    private int differential;
    /**
     * The maximum value of the number to guess.
     */
    private int max;
    /**
     * The maximum number of guesses the user gets. If exceeded, the game is over.
     */
    private int maxGuessesAllowed;
    /**
     * An integer that stores the number of guesses taken so far in the game.
     */
    private int numGuessesTaken;

    public GuessingGame() {
        setMax(0);
        this.generator = new Random();
    }

    public GuessingGame(int max) {
        setMax(max);
        this.generator = new Random();
    }

    public void setAnswer(int answer) {
        this.answer = answer;
    }

    public int getAnswer() {
        return this.answer;
    }

    public void setGameOver(boolean gameOver) {
        this.gameOver = gameOver;
    }

    public boolean getGameOver() {
        return this.gameOver;
    }

    public void setDifferential(int differential) {
        this.differential = differential;
    }

    public int getDifferential() {
        return this.differential;
    }

    public void setMax(int max) {
        this.max = max;
    }

    public int getMax() {
        return this.max;
    }

    public void setMaxGuessesAllowed(int maxGuessesAllowed) {
        this.maxGuessesAllowed = maxGuessesAllowed;
    }

    public int getMaxGuessesAllowed() {
        return this.maxGuessesAllowed;
    }

    public void setNumGuessesTaken(int numGuessesTaken) {
        this.numGuessesTaken = numGuessesTaken;
    }

    public int getNumGuessesTaken() {
        return this.numGuessesTaken;
    }

    /**
     * Initializes state for new game.
     * 1. Set the number of incorrect guesses allowed before game is over.
     * 2. Generate a random number between 0 - max and set is as the answer.
     * 3. Set the gameOver state to false, indicating new game.
     * 4. Set the differential to the max possible value.
     * 5. Set the number of guesses taken to 0.
     * @param maxGuessesAllowed - number of incorrect guesses before the game is over.
     */
    public void newGame(int maxGuessesAllowed) {
        setMaxGuessesAllowed(maxGuessesAllowed);
        int answer = this.generator.nextInt(this.getMax()) + 1;
        setAnswer(answer);
        setGameOver(false);
        setDifferential(this.getMax());
        setNumGuessesTaken(0);
    }

    /**
     * Controls guessing logic.
     * 1. Compare the new guess with the answer.
     * 2. Generate & return feedback to the player (too high, too low, correct).
     *  a. Relation of guess and answer.
     *  b. Comparison of the difference between the current guess and the answer vs. the previous guess and answer.
     *  c. Check if guess is out of bounds.
     *  d. End the game if player guesses taken > maximum guesses allowed.
     * @param guess - the new guess registered by the player.
     */
    public String guess(int guess) {
        if (getNumGuessesTaken() + 1 == getMaxGuessesAllowed()) {
            setGameOver(true);
        }

        setNumGuessesTaken(getNumGuessesTaken() + 1);

        if (guess > getMax()) {
            return "Guess out of range. The guess must be between 0 and " + getMax() + ".";
        }

        if (guess < getAnswer()) {
            if (getDifferential() > Math.abs(getAnswer() - guess)) {
                setDifferential(getAnswer() - guess);
                return "Too Low\nGetting Warmer";
            } else {
                setDifferential(getAnswer() - guess);
                return "Too Low\nGetting Colder";
            }
        } else if (guess > getAnswer()) {
            if (getDifferential() > Math.abs(getAnswer() - guess)) {
                setDifferential(getAnswer() - guess);
                return "Too High\nGetting Colder";
            } else {
                setDifferential(getAnswer() - guess);
                return "Too High\nGetting Warmer";
            }
        } else {
            setGameOver(true);
            return "Congratulations!";
        }
    }

    public boolean isGameOver() {
        return this.gameOver;
    }

    public void printVictoryStats() {
        System.out.print("\n# of Guesses vs. Max # Guesses: ");
        System.out.println(getNumGuessesTaken() + " - " + getMaxGuessesAllowed());
    }
}