package pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.Point;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.PointerInput;
import org.openqa.selenium.interactions.Sequence;

import java.time.Duration;
import java.util.Collections;

public class SeekBarPage {

    private final AndroidDriver driver;

    public SeekBarPage(AndroidDriver driver) {
        this.driver = driver;
    }

    public String getProgressText() {
        return driver.findElement(
                AppiumBy.id("io.appium.android.apis:id/progress")
        ).getText();
    }

    public void dragSliderLeftBy30Pixels() {
        WebElement seekBar = driver.findElement(AppiumBy.className("android.widget.SeekBar"));

        Point location = seekBar.getLocation();
        Dimension size = seekBar.getSize();

        int startX = location.getX() + (size.getWidth() / 2);
        int startY = location.getY() + (size.getHeight() / 2);
        int endX = startX - 30;

        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence drag = new Sequence(finger, 1);

        drag.addAction(finger.createPointerMove(Duration.ZERO,
                PointerInput.Origin.viewport(), startX, startY));
        drag.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        drag.addAction(finger.createPointerMove(Duration.ofMillis(500),
                PointerInput.Origin.viewport(), endX, startY));
        drag.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));

        driver.perform(Collections.singletonList(drag));
    }
}