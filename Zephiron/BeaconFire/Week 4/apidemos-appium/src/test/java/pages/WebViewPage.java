package pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;

public class WebViewPage {

    private final AndroidDriver driver;

    public WebViewPage(AndroidDriver driver) {
        this.driver = driver;
    }

    public void enterText(String text) {
        WebElement textBox = driver.findElement(AppiumBy.className("android.widget.EditText"));
        textBox.sendKeys(text);
    }

    public void clickLink() {
        driver.findElement(AppiumBy.androidUIAutomator("new UiSelector().textContains(\"i am a link\")")).click();
    }

    public String getResultText() {
        return driver.findElement(AppiumBy.xpath("//android.widget.TextView[@text=\"I am some other page content\"]")).getText();
    }
}