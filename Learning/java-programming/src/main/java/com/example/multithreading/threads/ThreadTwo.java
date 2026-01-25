package com.example.multithreading.threads;

public class ThreadTwo extends Thread {
    
    @Override
    public void run() {
        // System.out.println("\nThreadTwo.run() called...");

        for (int i = 0; i < 5; i++) {
            System.out.print("2 ");

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        // System.out.println("\b");
    }
}