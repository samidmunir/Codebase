package pages.frames;

import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class ContactUsPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By firstName = By.name("first_name");
    private final By lastName = By.name("last_name");
    private final By email = By.name("email");
    private final By message = By.name("message");
    private final By submit = By.cssSelector("input[type='submit'], button[type='submit']");
    private final By successHeader = By.xpath("//*[contains(.,'Thank You') or contains(.,'successful')]");

    public ContactUsPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(12));
    }

    public void submitForm(String fn, String ln, String em, String msg) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(firstName)).sendKeys(fn);
        driver.findElement(lastName).sendKeys(ln);
        driver.findElement(email).sendKeys(em);
        driver.findElement(message).sendKeys(msg);
        driver.findElement(submit).click();
    }

    public boolean isSuccessVisible() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(successHeader));

            return true;
        } catch (TimeoutException e) {
            return false;
        }
    }
}