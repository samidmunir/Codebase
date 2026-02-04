package com.example.multithreading.example.downloader;

public class InstallThread extends Thread {

    @Override
    public void run() {
        System.out.println("\n" + Thread.currentThread().getName() + " starting package installation...");
        
        for (int i = 0; i < 3; i++) {
            System.out.println("- Installing package [" + (i + 1) + "]");

            try {
                Thread.sleep(3000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}