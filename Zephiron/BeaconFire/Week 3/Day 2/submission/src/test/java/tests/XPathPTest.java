package tests;

import framework.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;
import pages.xpath.XPathPPage;

public class XPathPTest extends BaseTest {
    @Test
    public void openXPathPPage() {
        XPathPPage page = new XPathPPage(driver).open();

        Assert.assertTrue(page.isPageLoaded(), "XPath practice page did not load as expected.");
    }
}