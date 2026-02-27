package questions.guessing_game;

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        while (true) {
            printGameMenu();
            int max = promptPlayerForMax();
            int maxGuesses = promptPlayerForNumberOfGuesses();

            GuessingGame game = new GuessingGame(max);
            game.newGame(maxGuesses);

            while (!game.getGameOver()) {
                int guess = getPlayerGuess(max);
                String res = game.guess(guess);
                if (res.equals("Congratulations!")) {
                    game.printVictoryStats();
                }
                System.out.println(res);
            }

            System.out.println("The correct answer was " + game.getAnswer());

            String playerOption = promptPlayerToPlayAgain();
            if (playerOption.equals("Y")) {
                continue;
            } else {
                game.setGameOver(true);
                break;
            }
        }
    }

    public static void printGameMenu() {
        System.out.println("\nWelcome to the Guessing Game");
    }

    public static int promptPlayerForMax() {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter the maximum number: ");
        int max = scanner.nextInt();

        return max;
    }

    public static int promptPlayerForNumberOfGuesses() {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter the number of guesses allowed: ");
        int maxGuessesAllowed = scanner.nextInt();

        return maxGuessesAllowed;
    }

    public static int getPlayerGuess(int max) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your guess, remember it must be between 0 and " + max + ": ");
        int guess = scanner.nextInt();

        return guess;
    }

    public static String promptPlayerToPlayAgain() {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Would you like to play again, enter Y for yes, N for no: ");
        String option  = scanner.next();

        return option;
    }
}