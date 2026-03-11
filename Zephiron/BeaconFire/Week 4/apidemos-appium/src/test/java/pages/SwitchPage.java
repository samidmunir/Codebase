package pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;

public class SwitchPage {

    private final AndroidDriver driver;

    public SwitchPage(AndroidDriver driver) {
        this.driver = driver;
    }

    public void toggleCheckbox() {
        driver.findElement(AppiumBy.id("android:id/checkbox")).click();
    }

    public void toggleFirstSwitch() {
        driver.findElement(
                AppiumBy.androidUIAutomator(
                        "new UiSelector().className(\"android.widget.Switch\").instance(0)"
                )
        ).click();
    }

    public void toggleSecondSwitch() {
        driver.findElement(
                AppiumBy.androidUIAutomator(
                        "new UiSelector().className(\"android.widget.Switch\").instance(1)"
                )
        ).click();
    }

    public void toggleAllControls() {
        toggleCheckbox();
        toggleFirstSwitch();
        toggleSecondSwitch();
    }
}