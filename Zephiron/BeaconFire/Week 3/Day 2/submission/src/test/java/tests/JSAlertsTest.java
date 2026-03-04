package tests;

import framework.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.alerts.JSAlertsPage;

public class JSAlertsTest extends BaseTest {
    @Test
    public void alert_confirmAndAssert() {
        JSAlertsPage page = new JSAlertsPage(driver).open();

        page.clickJSAlert();
        page.waitForAlert().accept();

        Assert.assertEquals(page.getResult(), "You successfully clicked an alert");
    }

    @Test
    public void confirm_cancelAndAssert() {
        JSAlertsPage page = new JSAlertsPage(driver).open();

        page.clickJSConfirm();
        page.waitForAlert().dismiss();

        Assert.assertEquals(page.getResult(), "You clicked: Cancel");
    }

    @Test
    public void prompt_enterTextAndAssert() {
        JSAlertsPage page = new JSAlertsPage(driver).open();

        page.clickJSPrompt();
        var alert = page.waitForAlert();
        alert.sendKeys("Sami");
        alert.accept();

        Assert.assertEquals(page.getResult(), "You entered: Sami");
    }
}