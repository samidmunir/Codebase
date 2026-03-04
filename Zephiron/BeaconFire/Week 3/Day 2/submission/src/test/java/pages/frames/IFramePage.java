package pages.frames;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class IFramePage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By contactUsLink = By.linkText("Contact Us");

    public IFramePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(12));
    }

    public IFramePage open() {
        driver.get("https://www.webdriveruniversity.com/IFrame/index.html");
        return this;
    }

    public void switchIntoFirstIFrame() {
        wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(0));
    }

    public void clickContactUsInEmbeddedPage() {
        wait.until(ExpectedConditions.elementToBeClickable(contactUsLink)).click();
    }

    public void switchBackToMainPage() {
        driver.switchTo().defaultContent();
    }
}