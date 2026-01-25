package com.example.multithreading.threads;

public class MyThread extends Thread {

    /*
        This thread prints 1 - 5 each second (1000ms)
    */
    @Override
    public void run() {
        System.out.println("\nMyThread.run() called...");
        
        for (int i = 0; i < 5; i++) {
            System.out.print((i + 1) + " ");

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        System.out.println("\b");
    }
}