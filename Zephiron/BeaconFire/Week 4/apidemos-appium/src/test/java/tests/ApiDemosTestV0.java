package tests;

import base.BaseTest;
import io.appium.java_client.AppiumBy;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.Point;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.PointerInput;
import org.openqa.selenium.interactions.Sequence;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.time.Duration;
import java.util.Collections;

public class ApiDemosTestV0 extends BaseTest {
    @Test
    public void testPreferenceSwitch() {
        driver.findElement(AppiumBy.xpath("//android.widget.TextView[@content-desc=\"Preference\"]")).click();

        driver.findElement(AppiumBy.xpath("//android.widget.TextView[@content-desc=\"9. Switch\"]")).click();

        driver.findElement(AppiumBy.id("android:id/checkbox")).click();

        driver.findElement(AppiumBy.xpath("//android.widget.Switch[1]")).click();;

        driver.findElement(AppiumBy.xpath("(//android.widget.Switch[@resource-id=\"android:id/switch_widget\"])[2]")).click();

        driver.navigate().back();
        driver.navigate().back();

        driver.findElement(AppiumBy.xpath("//android.widget.TextView[@content-desc=\"Views\"]")).click();

        driver.findElement(AppiumBy.androidUIAutomator("new UiScrollable(new UiSelector().scrollable(true))" +
                ".scrollIntoView(new UiSelector().text(\"Seek Bar\"))")).click();

        WebElement progressText = driver.findElement(AppiumBy.id("io.appium.android.apis:id/progress"));
        String beforeText = progressText.getText();
        System.out.println("\nBefore drag: " + beforeText);

        WebElement seekBar = driver.findElement(AppiumBy.xpath("//android.widget.SeekBar[@resource-id=\"io.appium.android.apis:id/seek\"]"));

        Point location = seekBar.getLocation();
        Dimension size = seekBar.getSize();

        int startX = location.getX() + (size.getWidth() / 2);
        int startY = location.getY() + (size.getHeight() / 2);
        int endX = startX - 30;

        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence drag = new Sequence(finger, 1);

        drag.addAction(finger.createPointerMove(
                Duration.ZERO,
                PointerInput.Origin.viewport(),
                startX,
                startY
        ));
        drag.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        drag.addAction(finger.createPointerMove(
                Duration.ofMillis(500),
                PointerInput.Origin.viewport(),
                endX,
                startY
        ));
        drag.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));

        driver.perform(Collections.singletonList(drag));

        String afterText = progressText.getText();
        System.out.println("\nAfter drag: " + afterText);

        Assert.assertNotEquals(afterText, beforeText, "Expected progress message to change after dragging seek bar.");

        // Go back from Seek Bar to Views
        driver.navigate().back();

        // Scroll to WebView and click it
        driver.findElement(
                AppiumBy.androidUIAutomator(
                        "new UiScrollable(new UiSelector().scrollable(true))" +
                                ".scrollIntoView(new UiSelector().text(\"WebView\"))"
                )
        ).click();

        WebElement textBox = driver.findElement(AppiumBy.className("android.widget.EditText"));
        textBox.sendKeys("Sami");

        driver.findElement(
                AppiumBy.androidUIAutomator("new UiSelector().textContains(\"i am a link\")")
        ).click();

        WebElement resultText = driver.findElement(
                AppiumBy.xpath("//android.widget.TextView[@text=\"I am some other page content\"]")
        );

        Assert.assertTrue(resultText.isDisplayed(), "Expected result text was not displayed after clicking the link.");
        Assert.assertEquals(resultText.getText(), "I am some other page content");
    }
}
