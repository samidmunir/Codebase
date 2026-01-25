package com.example.multithreading.threads;

public class ThreadOne extends Thread {

    @Override
    public void run() {
        // System.out.println("\nThreadOne.run() called...");

        for (int i = 0; i < 5; i++) {
            System.out.print("1 ");

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        // System.out.println("\b");
    }
}