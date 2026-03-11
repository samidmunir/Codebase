package pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;

public class PreferencePage {

    private final AndroidDriver driver;

    public PreferencePage(AndroidDriver driver) {
        this.driver = driver;
    }

    public void openSwitchPage() {
        driver.findElement(AppiumBy.xpath("//android.widget.TextView[@content-desc=\"9. Switch\"]")).click();
    }
}