package pages.xpath;

import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class XPathPPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    public XPathPPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public XPathPPage open() {
        driver.get("https://thetestdata.com/xpathpractice.php");

        return this;
    }

    public boolean isPageLoaded() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//*[contains(normalize-space(),'Practice XPath')]")));

            return true;
        } catch (TimeoutException e) {
            return false;
        }
    }
}