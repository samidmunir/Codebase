package com.example.multithreading.example.downloader;

public class Main {

    public static void main(String[] args) {
        DownloadThread downloader = new DownloadThread();
        InstallThread installer = new InstallThread();

        downloader.start();

        try {
            downloader.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        installer.start();

        try {
            installer.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        System.out.println("\nProduct download & install complete!");
    }
}