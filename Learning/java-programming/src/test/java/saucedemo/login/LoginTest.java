package saucedemo.login;

import org.testng.Assert;
import org.testng.annotations.Test;

import saucedemo.base.BaseTest;

public class LoginTest extends BaseTest {

    @Test
    public void testLoginErrorMessage() {
        loginPage.setUsername("standard_user");
        loginPage.setPassword("xyz123");
        loginPage.clickLoginButton();
        String actualMessage = loginPage.getErrorMessage();

        Assert.assertTrue(actualMessage.contains("Epic sadface"));
    }
}