package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.HomePage;
import pages.SeekBarPage;
import pages.ViewsPage;

public class SeekBarTest extends BaseTest {

    @Test
    public void testSeekBarFlow() {
        HomePage homePage = new HomePage(driver);
        ViewsPage viewsPage = new ViewsPage(driver);
        SeekBarPage seekBarPage = new SeekBarPage(driver);

        homePage.openViews();
        viewsPage.openSeekBar();

        String beforeText = seekBarPage.getProgressText();
        seekBarPage.dragSliderLeftBy30Pixels();
        String afterText = seekBarPage.getProgressText();

        Assert.assertNotEquals(afterText, beforeText,
                "Expected progress text to change after dragging seek bar.");
    }
}