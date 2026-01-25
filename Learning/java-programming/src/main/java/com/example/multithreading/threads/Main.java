package com.example.multithreading.threads;

/*
    An application/process is a unit of execution, that has its own memory space.
    - each application has its own memory space, known as the heap.
    - the heap is not shared between two applications/processes.

    A thread is a single unit of execution within an application/process.
    > each process can have multiple threads.
    > each process has at least one thread: Main thread.
    > every thread created by a process shares that process's memory space (the heap).
    > each thread has its own Thread Stack (only that thread has access to it).

    Concurrency refers to an application doing more than one thing at a time.
    > concurrency allows different parts of a program to make progress independently, often leading to better resource utilization and improved performance.
        - one task does not have to complete before another one can start.
        - multiple threads can make incremental progress.

    Creating a Thread Instance
    1. extend the Thread class, and create an instance of this new subclass.
    2. create a new instance of Thread, and pass it any instance that implements the Runnable interface
        > this includes a lambda expression.
    3. utilize an Executor to create one or more threads.

    Thread.start() vs. Thread.run()
        The Thread.start() invokes an asynchronous call.
        > this call will create a new thread.

        The Thread.run() invokes a synchronous call.
        > the run method executes synchronously, by running the thread it's invoked from.
        > this call does not actually create a new thread; it simply invokes the function/code within it.
*/

public class Main {

    public static void main(String[] args) {
        System.out.println("Welcome to Multithreading in Java!");
        System.out.println("-----------------------------------");
        
        printThreadState(Thread.currentThread());

        ThreadOne threadOne = new ThreadOne();
        ThreadTwo threadTwo = new ThreadTwo();

        threadOne.start();
        threadTwo.start();

        /*
            The second way to create a thread is utilizing the Runnable Interface.
            > Runnable is a functional interface.
            > the single access method is the run() method.
            > a lambda expression is a target for a Runnable type.
            > any class can implement the Runnable interface to run asynchronously, and have it passed to a Thread constructor.
        */
       Runnable runnable = () -> {
        // System.out.println("\nthreadZero.run() called...");

        for (int i = 0; i < 7; i++) {
            System.out.print("0 ");

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        // System.out.println("\b");
       };
       Thread threadZero = new Thread(runnable);
       threadZero.start();
    }

    /*
        This function prints out data & state information for the passed in Thread Object.
    */
    private static void printThreadState(Thread thread) {
        System.out.println("\nMain.printThreadState() called -->");

        System.out.println("- thread.threadId(): " + thread.threadId());
        System.out.println("- thread.getName(): " + thread.getName());
        System.out.println("- thread.getClass(): " + thread.getClass());
        System.out.println("- thread.getThreadGroup(): " + thread.getThreadGroup());
        System.out.println("- thread.getState(): " + thread.getState());
        System.out.println("- thread.isAlive(): " + thread.isAlive());

        System.out.println("------------------------------");
    }
}