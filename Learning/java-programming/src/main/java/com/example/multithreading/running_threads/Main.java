package com.example.multithreading.running_threads;

public class Main {

    public static void main(String[] args) {
        System.out.println("\nMain thread is running!");

        try {
            System.out.println("\n> Main thread is paused for 2s...");
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        Thread threadZero = new Thread(() -> {
            String threadName = Thread.currentThread().getName();
            System.out.println("\n" + threadName + " should take 10 dots to run!");

            for (int i = 0; i < 10; i++) {
                System.out.print(". ");

                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    // e.printStackTrace();

                    System.out.println("\nWhoops!! " + threadName + " was interrupted.");
                    return;
                }
            }

            System.out.println("\n" + threadName + " has finished.");
        });

        System.out.println("\n" + threadZero.getName() + " is starting...");
        threadZero.start();

        System.out.println("\nMain thread would continue here -->");

        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        threadZero.interrupt();
    }
}