package com.example.multithreading.example.downloader;

public class Main {

    public static void main(String[] args) {
        DownloadThread downloader = new DownloadThread();
        InstallThread installer = new InstallThread();

        downloader.setName("<Downloader>");
        installer.setName("<Installer>");

        Thread monitor = new Thread(() -> {
            long now = System.currentTimeMillis();

            while (downloader.isAlive()) {
                try {
                    Thread.sleep(1000);

                    if (System.currentTimeMillis() - now > 4000) {
                        downloader.interrupt();
                    }
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }, "<Monitor>");

        downloader.start();
        monitor.start();

        try {
            downloader.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        if (!downloader.isInterrupted()) {
            installer.start();
        } else {
            System.out.println("\n*** FATAL: <Downloader> was interrupted, <Installer> cannot run.");
        }

        // installer.start();

        // try {
        //     installer.join();
        // } catch (InterruptedException e) {
        //     e.printStackTrace();
        // }

        // System.out.println("\nProduct download & install complete!");
    }
}