package tests;

import base.BaseTest;
import org.testng.annotations.Test;
import pages.HomePage;
import pages.PreferencePage;
import pages.SwitchPage;

public class PreferenceSwitchTest extends BaseTest {

    @Test
    public void testPreferenceSwitchFlow() {
        HomePage homePage = new HomePage(driver);
        PreferencePage preferencePage = new PreferencePage(driver);
        SwitchPage switchPage = new SwitchPage(driver);

        homePage.openPreference();
        preferencePage.openSwitchPage();
        switchPage.toggleAllControls();
    }
}