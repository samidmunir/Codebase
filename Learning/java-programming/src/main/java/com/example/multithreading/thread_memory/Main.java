
package com.example.multithreading.thread_memory;

import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) {
        StopWatch stopWatch = new StopWatch(TimeUnit.SECONDS);
        
        Thread green = new Thread(stopWatch::countDown, ThreadColor.ANSI_GREEN.name());

        Thread purple = new Thread(() -> stopWatch.countDown(7), ThreadColor.ANSI_PURPLE.name());

        Thread red = new Thread(stopWatch::countDown, ThreadColor.ANSI_RED.name());
        
        green.start();
        purple.start();
        red.start();
    }
}

class StopWatch {

    private TimeUnit timeUnit;

    public StopWatch(TimeUnit timeUnit) {
        this.timeUnit = timeUnit;
    }

    public void countDown() {
        countDown(5);
    }

    public void countDown(int unitCount) {
        String threadName = Thread.currentThread().getName();

        ThreadColor threadColor = ThreadColor.ANSI_RESET;

        try {
            threadColor = ThreadColor.valueOf(threadName);
        } catch (IllegalArgumentException e) {
            // User may pass an invalid color name (ignore)...
        }

        String color = threadColor.color();
        for (int i = unitCount; i > 0; i--) {
            try {
                timeUnit.sleep(1);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            System.out.printf("%s%s Thread: i = %d%n", color, threadName, i);
        }
    }
}