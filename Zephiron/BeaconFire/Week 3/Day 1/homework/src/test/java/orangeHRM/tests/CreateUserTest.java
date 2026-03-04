package orangeHRM.tests;

import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.*;
import org.testng.Assert;
import org.testng.annotations.*;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

public class CreateUserTest {

    private WebDriver driver;
    private WebDriverWait wait;

    // Toggle this if you want to visually slow down the run (for demo purposes)
    private static final boolean SLOW_MO = false;
    private static final long SLOW_MO_MS = 250;

    private static final String BASE_URL =
            "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login";
    private static final String ADMIN_USER = "Admin";
    private static final String ADMIN_PASS = "admin123";

    // ---------- Common Locators ----------
    private final By sidebar = By.cssSelector("aside");
    private final By adminMenu = By.xpath("//span[normalize-space()='Admin']");
    private final By userManagementHeader = By.xpath("//h6[normalize-space()='User Management']");
    private final By addButton = By.xpath("//button[normalize-space()='Add']");
    private final By addUserHeader = By.xpath("//h6[normalize-space()='Add User']");
    private final By systemUsersHeader = By.xpath("//h5[normalize-space()='System Users']");

    // Add User form fields
    private final By userRoleDropdown = By.xpath("//label[normalize-space()='User Role']/../following-sibling::div//div[contains(@class,'oxd-select-text')]");
    private final By employeeNameInput = By.xpath("//label[normalize-space()='Employee Name']/../following-sibling::div//input");
    private final By statusDropdown = By.xpath("//label[normalize-space()='Status']/../following-sibling::div//div[contains(@class,'oxd-select-text')]");
    private final By usernameInput = By.xpath("//label[normalize-space()='Username']/../following-sibling::div/input");
    private final By passwordInput = By.xpath("//label[normalize-space()='Password']/../following-sibling::div/input");
    private final By confirmPasswordInput = By.xpath("//label[normalize-space()='Confirm Password']/../following-sibling::div/input");
    private final By saveButton = By.xpath("//button[normalize-space()='Save']");

    // User management search (more robust: find the search form under System Users)
    private final By searchForm = By.xpath("//h5[normalize-space()='System Users']/ancestor::div[contains(@class,'oxd-table-filter')]");

    private final By searchUsernameInput = By.xpath(
            "//h5[normalize-space()='System Users']" +
                    "/ancestor::div[contains(@class,'orangehrm-background-container') or contains(@class,'orangehrm-paper-container')][1]" +
                    "//label[normalize-space()='Username']/../following-sibling::div/input"
    );

    private final By searchButton = By.xpath("//button[normalize-space()='Search']");
    private final By resetButton = By.xpath("//button[normalize-space()='Reset']");
    private final By noRecordsFound = By.xpath("//span[normalize-space()='No Records Found']");

    // loader (may or may not appear)
    private final By loader = By.cssSelector(".oxd-loading-spinner");

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().window().maximize();
        wait = new WebDriverWait(driver, Duration.ofSeconds(20));
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        if (driver != null) driver.quit();
    }

    @Test
    public void shouldCreateUserAndVerifyExistsInSearch() {
        driver.get(BASE_URL);

        // 1) Login
        clearAndType(By.name("username"), ADMIN_USER);
        clearAndType(By.name("password"), ADMIN_PASS);
        click(By.cssSelector("button[type='submit']"));

        // Wait for dashboard/homepage to load
        waitVisible(sidebar);
        waitForLoaderToDisappear();

        // 2) Click Admin -> Add
        click(adminMenu);
        waitVisible(userManagementHeader);
        waitForLoaderToDisappear();

        click(addButton);
        waitVisible(addUserHeader);
        waitForLoaderToDisappear();

        // 3) Fill Add User form
        String newUsername = "user_" + UUID.randomUUID().toString().substring(0, 8);
        String password = "Test@" + UUID.randomUUID().toString().substring(0, 8) + "a1";

        selectFromCustomDropdown(userRoleDropdown, "ESS");
        selectEmployeeFromAutocomplete("a");
        selectFromCustomDropdown(statusDropdown, "Enabled");

        clearAndType(usernameInput, newUsername);
        clearAndType(passwordInput, password);
        clearAndType(confirmPasswordInput, password);

        // Save
        click(saveButton);

        // 4) Back to System Users page — wait until it is truly ready
        waitVisible(systemUsersHeader);
        waitForLoaderToDisappear();

        // The important part: wait until the username search input is clickable
        wait.until(ExpectedConditions.elementToBeClickable(searchUsernameInput));

        // Reset filters (optional but helps flakiness)
        if (isPresent(resetButton)) click(resetButton);

        // Search for our username
        clearAndType(searchUsernameInput, newUsername);
        click(searchButton);

        // Wait for either our row or "No Records Found"
        By rowForUsername = rowByUsername(newUsername);
        wait.until(d -> isPresent(rowForUsername) || isPresent(noRecordsFound));

        if (isPresent(noRecordsFound)) {
            Assert.fail("No Records Found after searching for username: " + newUsername);
        }

        // Assert exact match from the row that contains our username
        String foundUsername = driver.findElement(
                By.xpath("//div[@class='oxd-table-body']//div[@role='row']" +
                        "[.//div[@role='cell'][2][normalize-space()='" + newUsername + "']]" +
                        "//div[@role='cell'][2]")
        ).getText().trim();

        Assert.assertEquals(foundUsername, newUsername,
                "Expected the created username to appear in search results.");
    }

    // ---------- Robust Helpers ----------

    private void click(By locator) {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
        } catch (ElementClickInterceptedException | TimeoutException e) {
            WebElement el = wait.until(ExpectedConditions.presenceOfElementLocated(locator));
            ((JavascriptExecutor) driver).executeScript("arguments[0].click();", el);
        }
        slowMo();
    }

    private void clearAndType(By locator, String text) {
        WebElement el = waitVisible(locator);
        el.click();

        // Mac uses COMMAND+A; others use CONTROL+A
        Keys modifier = isMac() ? Keys.COMMAND : Keys.CONTROL;

        el.sendKeys(Keys.chord(modifier, "a"));
        el.sendKeys(Keys.BACK_SPACE);
        el.sendKeys(text);
        slowMo();
    }

    private WebElement waitVisible(By locator) {
        WebElement el = wait.until(ExpectedConditions.presenceOfElementLocated(locator));
        try {
            ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        } catch (Exception ignored) {}
        return wait.until(ExpectedConditions.visibilityOf(el));
    }

    private boolean isPresent(By locator) {
        List<WebElement> els = driver.findElements(locator);
        return !els.isEmpty() && els.get(0).isDisplayed();
    }

    private void waitForLoaderToDisappear() {
        try {
            wait.until(ExpectedConditions.invisibilityOfElementLocated(loader));
        } catch (TimeoutException ignored) {
            // not fatal
        }
    }

    private void selectFromCustomDropdown(By dropdownDisplay, String optionText) {
        click(dropdownDisplay);
        By option = By.xpath("//div[@role='listbox']//span[normalize-space()='" + optionText + "']");
        click(option);
    }

    private void selectEmployeeFromAutocomplete(String partial) {
        clearAndType(employeeNameInput, partial);

        By firstOption = By.xpath("//div[@role='listbox']//span[1]");
        waitVisible(firstOption);
        click(firstOption);

        String value = driver.findElement(employeeNameInput).getAttribute("value");
        Assert.assertTrue(value != null && !value.trim().isEmpty(),
                "Employee Name was not selected properly from autocomplete.");
    }

    private By rowByUsername(String username) {
        return By.xpath("//div[@class='oxd-table-body']//div[@role='row']" +
                "[.//div[@role='cell'][2][normalize-space()='" + username + "']]");
    }

    private boolean isMac() {
        String os = System.getProperty("os.name", "");
        return os.toLowerCase().contains("mac");
    }

    private void slowMo() {
        if (!SLOW_MO) return;
        try { Thread.sleep(SLOW_MO_MS); } catch (InterruptedException ignored) {}
    }
}