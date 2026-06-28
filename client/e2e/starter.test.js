describe("Login flow", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should show login screen", async () => {
    await expect(element(by.id("login-screen"))).toBeVisible();
  });

  it("should show error on invalid login", async () => {
    await element(by.id("login-email")).typeText("wrong@example.com");
    await element(by.id("login-password")).typeText("wrongpassword");
    await element(by.id("login-submit")).tap();

    await waitFor(element(by.id("login-error")))
      .toBeVisible()
      .withTimeout(5000);
  });

  it("should login with valid credentials", async () => {
    await element(by.id("login-email")).typeText("cuidador@demo.com");
    await element(by.id("login-password")).typeText("senha123");
    await element(by.id("login-submit")).tap();

    // Replace with a testID that exists on whatever screen comes after login
    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(5000);
  });
});
