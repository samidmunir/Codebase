package com.example.multithreading.running_threads;

public class Main {
    public static void main(String[] args) {
        System.out.println("Main thread is running...");
        
        try {
            System.out.println("- Main thread is paused for 1s...");
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        Thread thread = new Thread(() -> {
            String threadName = Thread.currentThread().getName();
            
            System.out.println(threadName + " should take 10 dots to run.");
            
            for (int i = 0; i < 10; i++) {
                System.out.print(". ");
                
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    System.out.println("\nWhoops!! " + threadName + " was interrupted.");
                }
            }
            
            System.out.println("\n" + threadName + " just finished.");
        });

        System.out.println(thread.getName() + " starting...");
        thread.start();

        System.out.println("- Main thread would continue here...");

        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        thread.interrupt();
    }
}