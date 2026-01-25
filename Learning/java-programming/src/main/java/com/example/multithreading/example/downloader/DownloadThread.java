package com.example.multithreading.example.downloader;

public class DownloadThread extends Thread {

    @Override
    public void run() {
        System.out.println(Thread.currentThread().getName() + " starting package downloads...");

        for (int i = 0; i < 3; i++) {
            System.out.println("- Downloading package [" + (i + 1) + "]");

            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}