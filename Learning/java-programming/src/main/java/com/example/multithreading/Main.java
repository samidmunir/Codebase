package com.example.multithreading;

import java.util.concurrent.TimeUnit;

/*
    Process - a unit of execution, that has its own memory space.
    > a Java console application is a process.

    Each application has its own memory space, known as the heap.
    > the heap is not shared between two applications or two processes, they each have their own.

    A thread is a single unit of execution, within a process.
    > each process can have multiple threads.
    > every application has at least one thread, the main thread.
    > our code runs on the main thread.

    Each thread has a thread stack.
    > this is memory, that only a single thead has access to.

    Every process has a heap, and every thread has a thread stack.
*/

public class Main {
    public static void main(String[] args) {
        var currentThread = Thread.currentThread();
        System.out.println("currentThread.getClass().getName(): " + currentThread.getClass().getName());

        printThreadState(currentThread);

        currentThread.setName("Main_Thread");
        currentThread.setPriority(Thread.MAX_PRIORITY);
        printThreadState(currentThread);

        CustomThread customThread = new CustomThread();
        customThread.start(); // asynchronous
        // customThread.run(); // synchronous

        Runnable myRunnable = () -> {
            for (int i = 0; i < 8; i++) {
                System.out.print(" 3 ");

                try {
                    TimeUnit.MILLISECONDS.sleep(250);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        };
        Thread myThread = new Thread(myRunnable);
        myThread.start();

        for (int i = 0; i < 3; i++) {
            System.out.print(" 1 ");

            try {
                TimeUnit.SECONDS.sleep(1);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        System.out.println();
    }

    public static void printThreadState(Thread thread) {
        System.out.println("\nprintThreadState() called -->");
        System.out.println("> Thread ID: " + thread.threadId());
        System.out.println("> Thread Name: " + thread.getName());
        System.out.println("> Thread Priority: " + thread.getPriority());
        System.out.println("> Thread State: " + thread.getState());
        System.out.println("> Thread Group: " + thread.getThreadGroup());
        System.out.println("> Thread isAlive: " + thread.isAlive());
    }
}

/*
    Creating a Thread Instance
    - extend the Thread class, and create an instance of this new subclass.
    - create a new instance of Thread, and pass it any instance that implements the Runnable interface. This includes a lambda expression.
    - use an Executor, to create one or more threads for you.
*/