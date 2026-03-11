package tests;

import base.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;

public class LaunchTest extends BaseTest {
    @Test
    public void verifyAppLaunches() {
        String pageSource = driver.getPageSource();
        Assert.assertTrue(
                pageSource.contains("API Demos"),
                "API Demos app did not launch correctly."
        );
    }
}