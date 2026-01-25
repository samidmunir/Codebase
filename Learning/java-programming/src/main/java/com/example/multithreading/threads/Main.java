package com.example.multithreading.threads;

public class Main {

    public static void main(String[] args) {
        System.out.println("\nWelcome to Threads in Java!");

        // printCurrentThreadData();

        MyThread myThread = new MyThread();
        myThread.setName("my_thread");
        // printThreadData(myThread);

        Thread newThread = new Thread(() -> {
            System.out.println("\nnewThread.run() called...");
        
            for (int i = 0; i < 5; i++) {
                System.out.print("x ");

                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }

            System.out.println("\b");
        });
        newThread.setName("new_thread");
        newThread.setPriority(Thread.MAX_PRIORITY);
        // printThreadData(newThread);

        /*
            Thread.start() - asyncrhonous
            Thread.run() - synchronous
        */

        myThread.start();
        newThread.start();
    }

    private static void printCurrentThreadData() {
        System.out.println("\nprintCurrentThread() called...");
        
        var currentThread = Thread.currentThread();

        System.out.println(" - thread.getClass(): " + currentThread.getClass());
        System.out.println(" - thread.getName(): " + currentThread.getName());
        System.out.println(" - thread.getPriority(): " + currentThread.getPriority());
        System.out.println(" - thread.getThreadGroup(): " + currentThread.getThreadGroup());
        System.out.println(" - thread.isAlive(): " + currentThread.isAlive());

        System.out.println("------------------------------");
    }

    private static void printThreadData(Thread thread) {
        System.out.println("\nprintThreadData() called...");
        
        System.out.println(" - thread.getClass(): " + thread.getClass());
        System.out.println(" - thread.getName(): " + thread.getName());
        System.out.println(" - thread.getPriority(): " + thread.getPriority());
        System.out.println(" - thread.getThreadGroup(): " + thread.getThreadGroup());
        System.out.println(" - thread.isAlive(): " + thread.isAlive());

        System.out.println("------------------------------");
    }
}