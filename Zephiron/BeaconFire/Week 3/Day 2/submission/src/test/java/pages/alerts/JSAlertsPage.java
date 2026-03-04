package pages.alerts;

import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class JSAlertsPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By jsAlertBtn = By.xpath("//button[normalize-space()='Click for JS Alert']");
    private final By jsConfirmBtn = By.xpath("//button[normalize-space()='Click for JS Confirm']");
    private final By jsPromptBtn = By.xpath("//button[normalize-space()='Click for JS Prompt']");
    private final By resultText = By.id("result");

    public JSAlertsPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public JSAlertsPage open() {
        driver.get("https://the-internet.herokuapp.com/javascript_alerts");

        return this;
    }

    public void clickJSAlert() {
        driver.findElement(jsAlertBtn).click();
    }

    public void clickJSConfirm() {
        driver.findElement(jsConfirmBtn).click();
    }

    public void clickJSPrompt() {
        driver.findElement(jsPromptBtn).click();
    }

    public Alert waitForAlert() {
        return wait.until(ExpectedConditions.alertIsPresent());
    }

    public String getResult() {
        return driver.findElement(resultText).getText().trim();
    }
}