package com.example.multithreading.example.downloader;

public class Main {

    public static void main(String[] args) {
        DownloadThread downloader = new DownloadThread();

        System.out.println(downloader.getName() + " starting package downloads...");
        downloader.start();
    }
}