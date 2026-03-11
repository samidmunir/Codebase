package pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;

public class ViewsPage {

    private final AndroidDriver driver;

    public ViewsPage(AndroidDriver driver) {
        this.driver = driver;
    }

    public void openSeekBar() {
        driver.findElement(
                AppiumBy.androidUIAutomator(
                        "new UiScrollable(new UiSelector().scrollable(true))" +
                                ".scrollIntoView(new UiSelector().text(\"Seek Bar\"))"
                )
        ).click();
    }

    public void openWebView() {
        driver.findElement(
                AppiumBy.androidUIAutomator(
                        "new UiScrollable(new UiSelector().scrollable(true))" +
                                ".scrollIntoView(new UiSelector().text(\"WebView\"))"
                )
        ).click();
    }
}