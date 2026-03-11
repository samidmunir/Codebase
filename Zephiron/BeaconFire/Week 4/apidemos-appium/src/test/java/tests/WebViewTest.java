package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.HomePage;
import pages.ViewsPage;
import pages.WebViewPage;

public class WebViewTest extends BaseTest {

    @Test
    public void testWebViewFlow() {
        HomePage homePage = new HomePage(driver);
        ViewsPage viewsPage = new ViewsPage(driver);
        WebViewPage webViewPage = new WebViewPage(driver);

        homePage.openViews();
        viewsPage.openWebView();

        webViewPage.enterText("Sami");
        webViewPage.clickLink();

        Assert.assertEquals(webViewPage.getResultText(), "I am some other page content");
    }
}