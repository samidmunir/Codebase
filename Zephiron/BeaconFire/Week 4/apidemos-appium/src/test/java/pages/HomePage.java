package pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;

public class HomePage {

    private final AndroidDriver driver;

    public HomePage(AndroidDriver driver) {
        this.driver = driver;
    }

    public void openPreference() {
        driver.findElement(
                AppiumBy.androidUIAutomator("new UiSelector().text(\"Preference\")")
        ).click();
    }

    public void openViews() {
        driver.findElement(
                AppiumBy.androidUIAutomator(
                        "new UiScrollable(new UiSelector().scrollable(true))" +
                                ".scrollIntoView(new UiSelector().text(\"Views\"))"
                )
        ).click();
    }
}