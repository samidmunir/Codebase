package saucedemo.products;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.example.selenium.saucedemo.pages.ProductsPage;

import saucedemo.base.BaseTest;

public class ProductsTest extends BaseTest {

    @Test
    public void testProductsHeaderIsDisplayed() {
        ProductsPage productsPage = loginPage.logIntoApplication("standard_user", "secret_sauce");

        Assert.assertTrue(productsPage.isProductsHeaderDisplayed(), "\nProducts header is not displayed!\n");
    }
}