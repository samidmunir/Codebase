package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.*;

public class ApiDemosFlowTest extends BaseTest {

    @Test
    public void testCompleteAssignmentFlow() {
        HomePage homePage = new HomePage(driver);
        PreferencePage preferencePage = new PreferencePage(driver);
        SwitchPage switchPage = new SwitchPage(driver);
        ViewsPage viewsPage = new ViewsPage(driver);
        SeekBarPage seekBarPage = new SeekBarPage(driver);
        WebViewPage webViewPage = new WebViewPage(driver);

        homePage.openPreference();
        preferencePage.openSwitchPage();
        switchPage.toggleAllControls();

        driver.navigate().back();
        driver.navigate().back();

        homePage.openViews();
        viewsPage.openSeekBar();

        String beforeText = seekBarPage.getProgressText();
        seekBarPage.dragSliderLeftBy30Pixels();
        String afterText = seekBarPage.getProgressText();

        Assert.assertNotEquals(afterText, beforeText,
                "Expected progress text to change after dragging seek bar.");

        driver.navigate().back();

        viewsPage.openWebView();
        webViewPage.enterText("Sami");
        webViewPage.clickLink();

        Assert.assertEquals(webViewPage.getResultText(), "I am some other page content");
    }
}