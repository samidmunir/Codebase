package tests;

import com.sun.source.tree.AssertTree;
import framework.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.frames.ContactUsPage;
import pages.frames.IFramePage;

public class IFramesTest extends BaseTest {
    @Test
    public void iframe_contactUs_submitForm() {
        IFramePage iFramePage = new IFramePage(driver).open();

        iFramePage.switchIntoFirstIFrame();
        iFramePage.clickContactUsInEmbeddedPage();

        ContactUsPage contactPage = new ContactUsPage(driver);
        contactPage.submitForm("Sami", "Tester", "sami@test.com", "Hello from Selenium!");

        Assert.assertTrue(contactPage.isSuccessVisible(), "Expected a success message after submitting Contact Us form.");
        iFramePage.switchBackToMainPage();
    }
}
