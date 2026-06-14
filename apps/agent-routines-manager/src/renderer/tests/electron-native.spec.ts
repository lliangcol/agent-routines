import { _electron as electron, expect, test } from "@playwright/test";

test("localizes native menu labels and focuses search from Help menu", async ({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Native Electron smoke only needs one viewport project.",
  );
  const electronApp = await electron.launch({
    args: ["."],
    cwd: ".",
    env: {
      ...process.env,
      AGENT_ROUTINES_MANAGER_USER_DATA_DIR: testInfo.outputPath("user-data"),
      VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await expect(page.getByRole("heading", { name: "安装矩阵" })).toBeVisible();
    await page.getByRole("button", { name: "简体中文" }).click();

    await expect
      .poll(() =>
        electronApp.evaluate(({ Menu }) =>
          Menu.getApplicationMenu()?.items.map((item) => item.label),
        ),
      )
      .toEqual(["应用", "编辑", "视图", "帮助"]);

    await electronApp.evaluate(({ BrowserWindow, Menu }) => {
      const menu = Menu.getApplicationMenu();
      const helpMenu = menu?.items.find((item) => item.label === "帮助");
      const searchItem = helpMenu?.submenu?.items.find(
        (item) => item.label === "搜索",
      );
      const targetWindow = BrowserWindow.getAllWindows()[0];
      if (!searchItem || !targetWindow) {
        throw new Error("Search menu item or Electron window not found.");
      }
      searchItem.click(undefined, targetWindow, undefined);
    });

    await expect(page.locator(".global-search input")).toBeFocused();
  } finally {
    await electronApp.close();
  }
});
