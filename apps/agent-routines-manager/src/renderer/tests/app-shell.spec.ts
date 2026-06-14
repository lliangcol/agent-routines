import { expect, test, type Page } from "@playwright/test";

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "安装矩阵" })).toBeVisible();
}

function primaryNav(page: Page) {
  return page.getByRole("navigation", { name: "主导航" });
}

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectRouteHeadingInViewport(page: Page, heading: string) {
  const metrics = await page
    .getByRole("heading", { name: heading })
    .evaluate((element) => {
      const headingRect = element.getBoundingClientRect();
      const topbarRect = document
        .querySelector(".topbar")
        ?.getBoundingClientRect();
      return {
        headingTop: Math.round(headingRect.top),
        headingBottom: Math.round(headingRect.bottom),
        topbarBottom: topbarRect ? Math.round(topbarRect.bottom) : 0,
        viewportHeight: window.innerHeight,
        appBodyScrollTop:
          document.querySelector(".app-body")?.scrollTop ?? null,
      };
    });
  expect(metrics.headingTop).toBeGreaterThanOrEqual(metrics.topbarBottom - 1);
  expect(metrics.headingBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.appBodyScrollTop).toBe(0);
}

async function expectPrimaryButtonContrast(page: Page) {
  const ratio = await page
    .locator(".button.primary")
    .first()
    .evaluate((button) => {
      const parseRgb = (value: string) => {
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match
          ? [Number(match[1]), Number(match[2]), Number(match[3])]
          : [0, 0, 0];
      };
      const luminance = (rgb: number[]) =>
        rgb
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.03928
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          })
          .reduce(
            (total, channel, index) =>
              total + channel * [0.2126, 0.7152, 0.0722][index],
            0,
          );
      const styles = getComputedStyle(button);
      const foreground = parseRgb(styles.color);
      const background = parseRgb(styles.backgroundColor);
      const foregroundLuminance = luminance(foreground);
      const backgroundLuminance = luminance(background);
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      );
    });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

async function expectInstallMatrixToolbarFits(page: Page) {
  const metrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".matrix-toolbar");
    const filterRow = document.querySelector(".filter-row");
    const search = document.querySelector(".toolbar-search");
    const pagination = document.querySelector(".pagination-controls");
    const statusFilter = document.querySelector(
      '.matrix-filter-group[aria-label="全部状态"]',
    );
    if (!toolbar || !filterRow || !search || !pagination || !statusFilter) {
      return null;
    }
    const searchRect = search.getBoundingClientRect();
    const paginationRect = pagination.getBoundingClientRect();
    const statusRect = statusFilter.getBoundingClientRect();
    return {
      filterWidth: Math.round(filterRow.getBoundingClientRect().width),
      toolbarClientWidth: toolbar.clientWidth,
      toolbarScrollWidth: toolbar.scrollWidth,
      statusOverlapsSearch:
        statusRect.right > searchRect.left &&
        statusRect.left < searchRect.right &&
        statusRect.bottom > searchRect.top &&
        statusRect.top < searchRect.bottom,
      searchOverlapsPagination:
        searchRect.right > paginationRect.left &&
        searchRect.left < paginationRect.right &&
        searchRect.bottom > paginationRect.top &&
        searchRect.top < paginationRect.bottom,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.filterWidth).toBeGreaterThan(0);
  expect(metrics!.toolbarScrollWidth).toBeLessThanOrEqual(
    metrics!.toolbarClientWidth,
  );
  expect(metrics!.statusOverlapsSearch).toBe(false);
  expect(metrics!.searchOverlapsPagination).toBe(false);
}

async function expectDocsSearchAligned(page: Page) {
  const metrics = await page.evaluate(() => {
    const pane = document.querySelector(".docs-view .pane.queue");
    const titleContent = document.querySelector(
      ".docs-view .pane.queue .pane-title-content",
    );
    const toolbar = document.querySelector(".docs-view .list-toolbar");
    const search = document.querySelector(".docs-view .toolbar-search");
    if (!pane || !titleContent || !toolbar || !search) {
      return null;
    }
    const paneRect = pane.getBoundingClientRect();
    const titleContentRect = titleContent.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    return {
      titleContentInset: Math.round(titleContentRect.left - paneRect.left),
      toolbarInset: Math.round(toolbarRect.left - paneRect.left),
      searchInset: Math.round(searchRect.left - paneRect.left),
      searchRightInset: Math.round(paneRect.right - searchRect.right),
      searchWidth: Math.round(searchRect.width),
      paneWidth: Math.round(paneRect.width),
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.toolbarInset).toBeGreaterThan(0);
  expect(metrics!.searchInset).toBe(metrics!.titleContentInset);
  expect(metrics!.searchRightInset).toBe(metrics!.titleContentInset);
  expect(metrics!.searchWidth).toBeGreaterThan(metrics!.paneWidth * 0.8);
}

async function expectRecommendationCardsFit(page: Page) {
  const metrics = await page
    .locator(".policy-recommendation-card")
    .first()
    .evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      const mainRect = card
        .querySelector(".recommendation-card-main")
        ?.getBoundingClientRect();
      const actionsRect = card
        .querySelector(".recommendation-actions")
        ?.getBoundingClientRect();
      return {
        cardHeight: Math.round(cardRect.height),
        actionsInside:
          Boolean(actionsRect) &&
          actionsRect!.right <= cardRect.right + 1 &&
          actionsRect!.left >= cardRect.left - 1,
        mainOverlapsActions:
          Boolean(mainRect && actionsRect) &&
          mainRect!.right > actionsRect!.left &&
          mainRect!.left < actionsRect!.right &&
          mainRect!.bottom > actionsRect!.top &&
          mainRect!.top < actionsRect!.bottom,
      };
    });
  expect(metrics.cardHeight).toBeLessThanOrEqual(180);
  expect(metrics.actionsInside).toBe(true);
  expect(metrics.mainOverlapsActions).toBe(false);
}

async function expectDistributeFlowFits(page: Page) {
  const metrics = await page.evaluate(() => {
    const flow = document.querySelector(".distribution-flow");
    const nav = document.querySelector(".distribute-step-nav");
    if (!flow || !nav) {
      return null;
    }
    return {
      flowClientWidth: flow.clientWidth,
      flowScrollWidth: flow.scrollWidth,
      navClientWidth: nav.clientWidth,
      navScrollWidth: nav.scrollWidth,
      flowStepCount: document.querySelectorAll(".distribution-flow-step")
        .length,
      navStepCount: document.querySelectorAll(".distribute-step-nav .step")
        .length,
      currentStep:
        document
          .querySelector('.distribution-flow-step[aria-current="step"]')
          ?.textContent?.trim() ?? "",
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.flowStepCount).toBe(6);
  expect(metrics!.navStepCount).toBe(6);
  expect(metrics!.flowScrollWidth).toBeLessThanOrEqual(
    metrics!.flowClientWidth,
  );
  expect(metrics!.navScrollWidth).toBeLessThanOrEqual(metrics!.navClientWidth);
  expect(metrics!.currentStep).toContain("选择范围");
}

async function expectHeaderHelpNearTitle(page: Page) {
  const metrics = await page.locator(".content-title-row").evaluate((row) => {
    const titleRect = row.querySelector("h1")?.getBoundingClientRect();
    const helpRect = row.querySelector(".help-button")?.getBoundingClientRect();
    return {
      gap:
        titleRect && helpRect
          ? Math.round(helpRect.left - titleRect.right)
          : Number.POSITIVE_INFINITY,
      helpTopDelta:
        titleRect && helpRect
          ? Math.round(helpRect.top - titleRect.top)
          : Number.POSITIVE_INFINITY,
      helpSize: helpRect ? Math.round(helpRect.width) : 0,
      rowScrollWidth: row.scrollWidth,
      rowClientWidth: row.clientWidth,
    };
  });
  expect(metrics.gap).toBeGreaterThanOrEqual(-6);
  expect(metrics.gap).toBeLessThanOrEqual(10);
  expect(metrics.helpTopDelta).toBeLessThanOrEqual(0);
  expect(metrics.helpSize).toBeLessThanOrEqual(20);
  expect(metrics.rowScrollWidth).toBeLessThanOrEqual(metrics.rowClientWidth);
}

async function expectPolicyMetaAligned(page: Page) {
  const metrics = await page.locator(".side-panel").evaluate((panel) =>
    Array.from(panel.querySelectorAll(".status-line")).map((line) => {
      const label = line.querySelector("span:last-child");
      const rect = label?.getBoundingClientRect();
      return rect ? Math.round(rect.left) : null;
    }),
  );
  const positions = metrics.filter((value): value is number => value !== null);
  expect(positions.length).toBeGreaterThanOrEqual(4);
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(
    1,
  );
}

async function expectSearchFocusHighlight(page: Page, selector: string) {
  const before = await page.locator(selector).evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      boxShadow: styles.boxShadow,
    };
  });
  await page.locator(`${selector} input`).focus();
  const after = await page.locator(selector).evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      boxShadow: styles.boxShadow,
    };
  });
  expect(after.boxShadow).not.toBe(before.boxShadow);
  expect(after.backgroundColor).not.toBe(before.backgroundColor);
}

test("accepts the install matrix layout, filters, and drawer actions", async ({
  page,
}) => {
  await openApp(page);
  await expect(primaryNav(page)).toBeVisible();
  await expect(page.locator(".sidebar .eyebrow")).toHaveText("源仓库");
  await expectPrimaryButtonContrast(page);
  await page.getByRole("button", { name: "收起菜单" }).click();
  await expect(page.locator(".app-body")).toHaveClass(/sidebar-collapsed/);
  await page.getByRole("button", { name: "展开菜单" }).click();
  await expect(page.locator(".app-body")).not.toHaveClass(/sidebar-collapsed/);
  await expectInstallMatrixToolbarFits(page);
  await expectSearchFocusHighlight(page, ".matrix-toolbar .toolbar-search");
  await page.getByPlaceholder("搜索 routines 或目标...").fill("zzzz-no-match");
  await expect(page.getByText("没有矩阵行")).toBeVisible();
  await expect(
    page.getByText("当前搜索和筛选条件下没有匹配例程。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "重置筛选" }).click();
  await expect(
    page
      .locator(".matrix-header")
      .filter({ has: page.locator(".matrix-column-runtime") }),
  ).not.toContainText("流程运行时");
  await expect(
    page.locator(".routine-cell code").getByText("api-sync", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("205 个单元格")).toBeVisible();
  await expect(page.getByText("第 1 / 3 页 · 41 项")).toBeVisible();
  await expect(page.locator(".routine-cell")).toHaveCount(15);
  await expect(
    page.locator(".matrix-cell .status-pill", { hasText: "一致" }).first(),
  ).toBeVisible();
  await expect(page.locator(".detail-drawer")).toHaveCount(0);
  await page.locator(".matrix-cell").first().click();
  await expect(page.locator(".detail-drawer")).toBeVisible();
  await page
    .locator(".detail-drawer")
    .getByRole("button", { name: "关闭" })
    .click();
  await expect(page.locator(".detail-drawer")).toHaveCount(0);
  await page.locator(".matrix-cell").first().click();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.getByText("第 2 / 3 页 · 41 项")).toBeVisible();
  await expect(page.getByText("knowledge-drift")).toBeVisible();

  await page
    .locator('.matrix-filter-group[aria-label="全部状态"]')
    .getByRole("button", { name: "漂移" })
    .click();
  await expect(page.getByText(/第 1 \//)).toBeVisible();
  await expect(page.getByText("desktop-qa")).toBeVisible();
  await page.getByPlaceholder("搜索 routines 或目标...").fill("desktop-qa");
  await expect(page.getByText("desktop-qa")).toBeVisible();
  await expect(page.getByText("electron-app-builder")).toHaveCount(0);

  await page.getByPlaceholder("搜索 routines 或目标...").fill("");
  await page
    .locator('.matrix-filter-group[aria-label="全部状态"]')
    .getByRole("button", { name: "全部状态" })
    .click();
  await page
    .locator('.matrix-filter-group[aria-label="全部例程"]')
    .getByRole("button", { name: "流程" })
    .click();
  await expect(page.getByText("node-workspace-check")).toBeVisible();
  await expect(page.getByText("electron-app-builder")).toHaveCount(0);

  await page
    .locator('.matrix-filter-group[aria-label="全部例程"]')
    .getByRole("button", { name: "全部例程" })
    .click();
  await page
    .locator('.matrix-filter-group[aria-label="全部工具"]')
    .getByRole("button", { name: "共享运行时" })
    .click();
  await expect(
    page
      .locator(".matrix-header")
      .filter({ has: page.locator(".matrix-column-runtime") }),
  ).not.toContainText("流程运行时");
  await expect(
    page.locator(".matrix-cell .status-pill", { hasText: "非目标" }).first(),
  ).toBeVisible();
  await page
    .locator('.matrix-filter-group[aria-label="全部状态"]')
    .getByRole("button", { name: "非目标" })
    .click();
  await expect(
    page.locator(".routine-cell code").getByText("api-sync", { exact: true }),
  ).toBeVisible();
  await page
    .locator('.matrix-filter-group[aria-label="全部状态"]')
    .getByRole("button", { name: "全部状态" })
    .click();

  await page
    .locator(".drawer-actions")
    .getByRole("button", { name: "打开" })
    .click();
  await expect(page.getByRole("heading", { name: "文档" })).toBeVisible();
  await expect(page.locator(".docs-view .pane.fill")).toContainText(
    "api-sync README",
  );
  await expect(page.getByText("第 1 / 6 页 · 75 项")).toBeVisible();
  await expect(page.locator(".doc-row")).toHaveCount(14);
  await expectDocsSearchAligned(page);
  const docsPaginationPosition = await page.evaluate(() => {
    const list = document.querySelector(".doc-list");
    const pagination = document.querySelector(".docs-pagination");
    if (!list || !pagination) {
      return null;
    }
    const listRect = list.getBoundingClientRect();
    const paginationRect = pagination.getBoundingClientRect();
    return {
      listBottom: Math.round(listRect.bottom),
      paginationTop: Math.round(paginationRect.top),
    };
  });
  expect(docsPaginationPosition).not.toBeNull();
  expect(docsPaginationPosition!.paginationTop).toBeGreaterThanOrEqual(
    docsPaginationPosition!.listBottom - 1,
  );
  await page.getByPlaceholder("搜索文档...").fill("no-such-doc-entry");
  await expect(page.getByText("没有匹配文档")).toBeVisible();
  await page.getByPlaceholder("搜索文档...").fill("安装");
  await expect(
    page.locator(".doc-row", { hasText: "安装" }).first(),
  ).toBeVisible();
  await primaryNav(page)
    .getByRole("button", { name: "安装矩阵", exact: true })
    .click();
  await page
    .locator(".drawer-actions")
    .getByRole("button", { name: "生成 dry-run plan" })
    .click();
  await expect(page.getByRole("heading", { name: "分发" })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("accepts navigation, dry-run generation, tasks, theme, and language", async ({
  page,
}) => {
  await openApp(page);

  const routes = [
    ["仪表盘", "仪表盘"],
    ["清单", "清单"],
    ["项目", "项目"],
    ["策略", "策略"],
    ["验收", "验收"],
    ["任务中心", "任务中心"],
    ["文档", "文档"],
    ["设置", "设置"],
  ] as const;

  for (const [button, heading] of routes) {
    await primaryNav(page)
      .getByRole("button", { name: button, exact: true })
      .click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectRouteHeadingInViewport(page, heading);
    await expect(page.locator("main")).not.toContainText(
      "implementation placeholder",
    );
    await expectNoDocumentOverflow(page);
  }

  await page.evaluate(() => {
    const appBody = document.querySelector(".app-body");
    if (appBody) {
      appBody.scrollTop = 160;
    }
  });
  await primaryNav(page)
    .getByRole("button", { name: "安装矩阵", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "安装矩阵" })).toBeVisible();
  await expectRouteHeadingInViewport(page, "安装矩阵");

  await page.keyboard.press("Control+K");
  await expect(
    page.getByPlaceholder("搜索 routines、文档、任务..."),
  ).toBeFocused();
  await page
    .getByPlaceholder("搜索 routines、文档、任务...")
    .fill("Install Discovery");
  await primaryNav(page)
    .getByRole("button", { name: "文档", exact: true })
    .click();
  await expectDocsSearchAligned(page);
  await expect(page.locator(".doc-row").first()).toContainText(
    "Install Discovery",
  );
  await page.getByPlaceholder("搜索 routines、文档、任务...").fill("");
  await page.locator(".statusbar-search").click();
  await expect(
    page.getByPlaceholder("搜索 routines、文档、任务..."),
  ).toBeFocused();
  const headerHelpButton = page
    .locator(".content-header")
    .getByRole("button", { name: "打开帮助" });
  await headerHelpButton.hover();
  await expect(page.getByRole("tooltip")).toContainText("文档帮助");
  await headerHelpButton.click();
  await expect(page.getByRole("dialog")).toContainText("文档帮助");
  await page.getByRole("button", { name: "关闭" }).click();

  await primaryNav(page)
    .getByRole("button", { name: "清单", exact: true })
    .click();
  await expect(page.getByText("第 1 / 3 页 · 41 项")).toBeVisible();
  await expect(page.locator(".inventory-grid.table-row")).toHaveCount(20);
  await page.getByPlaceholder("搜索清单...").fill("startup");
  await expect(page.getByText("第 1 / 1 页 · 2 项")).toBeVisible();
  await expect(
    page.locator(".inventory-grid.table-row code").getByText("startup-check", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByPlaceholder("搜索清单...").fill("zzzz-no-match");
  await expect(page.getByText("没有清单行")).toBeVisible();
  await expect(page.getByText("当前清单搜索没有匹配例程。")).toBeVisible();
  await page.getByRole("button", { name: "重置筛选" }).click();
  await expect(page.locator(".inventory-grid.table-row")).toHaveCount(20);

  await primaryNav(page)
    .getByRole("button", { name: "安装矩阵", exact: true })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "打开向导" })
    .click();
  await expect(page.getByRole("heading", { name: "分发" })).toBeVisible();
  await expectHeaderHelpNearTitle(page);
  await expect(page.getByText("完整执行流程")).toBeVisible();
  await expect(page.getByText("先审阅范围和目标")).toBeVisible();
  await expectDistributeFlowFits(page);
  await expect(page.locator(".stepper")).not.toContainText(
    /Inventory|Policy|Plan/,
  );
  await expect(page.getByRole("button", { name: "6 结果" })).toBeDisabled();
  await page.getByRole("button", { name: "2 选择内容" }).click();
  await expect(
    page.locator('.tool-skill-heading[aria-label="用户级 Codex 技能"]'),
  ).toBeVisible();
  await expect(
    page.locator('.tool-skill-heading[aria-label="用户级 Claude Code 技能"]'),
  ).toBeVisible();
  await expect(
    page.locator('.routine-scope-heading[aria-label="用户级共享流程"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: "3 审阅目标" }).click();
  await expect(page.getByText("2 个已审阅项目根目录。")).toBeVisible();
  await expect(page.getByText("已审阅发现根目录")).toBeVisible();
  await expect(page.getByText("已审阅源仓库")).toBeVisible();
  await expect(page.getByText("已审阅输出文件")).toBeVisible();
  await expect(page.getByText("已解析项目目标")).toBeVisible();
  const reviewedRoots = page
    .locator(".review-target-card")
    .filter({ hasText: "已审阅发现根目录" });
  await expect(reviewedRoots.getByText("D:\\Work\\Projects")).toBeVisible();
  await expect(
    reviewedRoots.getByText("D:\\Repositories", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".review-target-card")
      .filter({ hasText: "已审阅源仓库" })
      .getByText("D:\\Repositories\\agent-routines", { exact: true }),
  ).toBeVisible();
  const reviewedOutputs = page
    .locator(".review-target-card")
    .filter({ hasText: "已审阅输出文件" });
  await expect(
    reviewedOutputs.getByText(
      ".agent-routines/generated/install.manifest.json",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(
    reviewedOutputs.getByText(".agent-routines/generated/install.plan.json", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".target-line-detail .tool-icon-badge").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "4 应用模式" }).click();
  const mergeModeCard = page.locator(".mode-card", { hasText: "合并安装" });
  await expect(mergeModeCard.getByText("merge", { exact: true })).toBeVisible();
  await mergeModeCard.getByRole("button", { name: "打开帮助" }).click();
  await expect(page.getByRole("dialog")).toContainText("合并安装");
  await expect(page.getByRole("dialog")).toContainText("不会覆盖已有目标内容");
  await page.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("button", { name: "5 执行与验证" }).click();
  await page.getByRole("button", { name: "生成 dry-run plan" }).first().click();
  await expect(page.getByLabel("计划 JSON")).toHaveValue(/"preview": true/);
  await expect(page.getByLabel("清单差异")).toHaveValue(/已生成清单/);
  await expect(page.getByLabel("计划 JSON")).toHaveJSProperty("readOnly", true);
  await expect(
    page.getByRole("main").getByRole("button", {
      name: "写入 manifest",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "标记已审阅" }).click();
  await expect(page.getByText("清单摘要已审阅")).toBeVisible();
  await expect(page.getByRole("button", { name: "6 结果" })).toBeDisabled();
  await expect(
    page.getByRole("main").getByRole("button", {
      name: "写入 manifest",
      exact: true,
    }),
  ).toBeEnabled();
  const writeManifestStatus = page
    .locator(".pane.side .status-line")
    .filter({ hasText: "写入确认待完成" });
  await expect(writeManifestStatus).toContainText("缺失");
  await page
    .getByRole("main")
    .getByRole("button", {
      name: "写入 manifest",
      exact: true,
    })
    .click();
  await expect(writeManifestStatus).toContainText("一致");
  await expect(page.getByRole("button", { name: "6 结果" })).toBeEnabled();
  await page.getByRole("button", { name: "6 结果" }).click();
  await expect(page.getByRole("button", { name: "5 执行与验证" })).toHaveClass(
    /done/,
  );
  const applyButton = page.getByRole("main").getByRole("button", {
    name: "应用 merge",
    exact: true,
  });
  await expect(applyButton).toBeDisabled();
  await page.getByLabel("写入确认").fill("APPLY");
  await expect(applyButton).toBeEnabled();
  await applyButton.click();
  await expect(page.getByRole("status")).toContainText(
    "应用分发 已提交。可到任务中心查看命令证据。",
  );
  await primaryNav(page)
    .getByRole("button", { name: "安装矩阵", exact: true })
    .click();
  await page
    .locator('.matrix-filter-group[aria-label="全部工具"]')
    .getByRole("button", { name: "Claude Code" })
    .click();
  await page.getByPlaceholder("搜索 routines 或目标...").fill("commit-guard");
  await expect(
    page.locator(".routine-cell code").getByText("commit-guard", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".matrix-cell").first()).toContainText("一致");
  await page.getByPlaceholder("搜索 routines 或目标...").fill("");

  await primaryNav(page)
    .getByRole("button", { name: "任务中心", exact: true })
    .click();
  await expect(page.getByText("应用分发")).toBeVisible();
  await expect(page.getByText("生成 install plan")).toBeVisible();
  await expect(page.getByText("Browser preview task evidence.")).toBeVisible();
  await page.getByRole("button", { name: "写入归档" }).click();
  await expect(page.getByText(/已写入归档/)).toBeVisible();
  await page.getByRole("button", { name: "清理已完成" }).click();
  await expect(page.getByText("没有匹配任务")).toBeVisible();

  const sourceRepositoryShortcut = page.getByRole("button", {
    name: "打开设置重新选择源仓库",
  });
  if (await sourceRepositoryShortcut.isVisible()) {
    await sourceRepositoryShortcut.click();
    await expect(
      page.getByRole("heading", { name: "设置", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".settings-grid .path-value").first(),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "打开设置重新选择当前 config" })
      .click();
    await expect(
      page.locator(".settings-grid .path-value").nth(1),
    ).toBeFocused();
  } else {
    await primaryNav(page)
      .getByRole("button", { name: "设置", exact: true })
      .click();
  }
  await page
    .getByRole("main")
    .getByRole("button", { name: "选择... 源仓库" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "浏览器预览不支持系统文件选择框",
  );
  await expect(
    page.locator(".settings-grid .path-value").first(),
  ).toHaveAttribute("title", "D:\\Repositories\\agent-routines");
  await expect(
    page.locator(".settings-grid .path-value").nth(1),
  ).toHaveAttribute("title", /install-discovery\.config\.example\.json$/);
  await page
    .getByRole("main")
    .getByRole("button", { name: "选择... 当前 config" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "浏览器预览不支持系统文件选择框",
  );
  await expect(
    page.locator(".settings-grid .path-value").nth(1),
  ).toHaveAttribute("title", /install-discovery\.config\.example\.json$/);
  const firstPathValue = page.locator(".settings-grid .path-value").first();
  const beforeCopyHeight = await firstPathValue.evaluate((element) =>
    Math.round(element.getBoundingClientRect().height),
  );
  await page
    .getByRole("main")
    .getByRole("button", { name: "复制路径" })
    .first()
    .click();
  await expect(page.getByText("已复制")).toBeVisible();
  const copyFeedbackPosition = await firstPathValue.evaluate((element) => {
    const feedback = element.querySelector(".copy-feedback");
    const button = element.querySelector(".copy-button");
    if (!feedback || !button) {
      return null;
    }
    const feedbackRect = feedback.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      feedbackAboveButton: feedbackRect.bottom <= buttonRect.top,
      horizontalOverlap:
        feedbackRect.right > buttonRect.left &&
        feedbackRect.left < buttonRect.right,
      verticalOverlap:
        feedbackRect.bottom > buttonRect.top &&
        feedbackRect.top < buttonRect.bottom,
    };
  });
  expect(copyFeedbackPosition).not.toBeNull();
  expect(copyFeedbackPosition!.feedbackAboveButton).toBe(false);
  expect(copyFeedbackPosition!.horizontalOverlap).toBe(false);
  expect(copyFeedbackPosition!.verticalOverlap).toBe(true);
  const afterCopyHeight = await firstPathValue.evaluate((element) =>
    Math.round(element.getBoundingClientRect().height),
  );
  expect(afterCopyHeight).toBe(beforeCopyHeight);
  await page
    .getByRole("main")
    .getByRole("button", { name: "运行诊断" })
    .click();
  await expect(page.getByText("诊断完成").first()).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "深色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("main").getByRole("button", { name: "深色" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("main").getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Simplified Chinese" })
    .click();
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("guides dry-run result users back to an enabled apply mode", async ({
  page,
}) => {
  await openApp(page);

  await primaryNav(page)
    .getByRole("button", { name: "分发", exact: true })
    .click();
  await page.getByRole("button", { name: "4 应用模式" }).click();
  await page
    .locator(".mode-card", { hasText: "仅预演" })
    .getByRole("button", {
      name: /仅预演/,
    })
    .click();
  await page.getByRole("button", { name: "5 执行与验证" }).click();
  await page.getByRole("button", { name: "生成 dry-run plan" }).first().click();
  await expect(page.getByLabel("计划 JSON")).toHaveValue(/"preview": true/);
  await page.getByRole("button", { name: "标记已审阅" }).click();
  await page
    .getByRole("main")
    .getByRole("button", {
      name: "写入 manifest",
      exact: true,
    })
    .click();

  await page.getByRole("button", { name: "6 结果" }).click();
  await expect(page.getByText("计划已完成。")).toBeVisible();
  await expect(page.getByLabel("写入确认")).toHaveCount(0);
  const dryRunButton = page.getByRole("main").getByRole("button", {
    name: "仅 dry-run",
    exact: true,
  });
  await expect(dryRunButton).toBeDisabled();

  await page.getByRole("button", { name: "选择应用模式" }).click();
  await expect(
    page.getByText("所需确认短语：仅预演不执行 Apply。"),
  ).toBeVisible();
  await page
    .locator(".mode-card", { hasText: "合并安装" })
    .getByRole("button", {
      name: /合并安装/,
    })
    .click();
  await page.getByRole("button", { name: "6 结果" }).click();
  const applyButton = page.getByRole("main").getByRole("button", {
    name: "应用 merge",
    exact: true,
  });
  await page.getByLabel("写入确认").fill("APPLY");
  await expect(applyButton).toBeEnabled();
});

test("blocks apply when the reviewed manifest has no writable actions", async ({
  page,
}) => {
  await page.goto("/?plan=skip");
  await expect(page.getByRole("heading", { name: "安装矩阵" })).toBeVisible();
  await expectHeaderHelpNearTitle(page);
  await primaryNav(page)
    .getByRole("button", { name: "分发", exact: true })
    .click();
  await page.getByRole("button", { name: "5 执行与验证" }).click();
  await page.getByRole("button", { name: "生成 dry-run plan" }).first().click();
  await expect(page.getByLabel("清单差异")).toHaveValue(/"operation": "skip"/);
  await expect(page.getByRole("button", { name: "6 结果" })).toBeDisabled();
  await page.getByRole("button", { name: "标记已审阅" }).click();
  await expect(page.getByRole("button", { name: "6 结果" })).toBeDisabled();
  await page
    .getByRole("main")
    .getByRole("button", {
      name: "写入 manifest",
      exact: true,
    })
    .click();
  await expect(page.getByRole("button", { name: "6 结果" })).toBeEnabled();
  await page.getByRole("button", { name: "6 结果" }).click();
  await expect(page.getByRole("button", { name: "5 执行与验证" })).toHaveClass(
    /done/,
  );
  await expect(page.getByText("没有写入动作", { exact: true })).toBeVisible();
  await expect(
    page.getByText("计划动作：安装 0，替换 0，删除 0，跳过 2。"),
  ).toBeVisible();
  const applyButton = page.getByRole("main").getByRole("button", {
    name: "应用 merge",
    exact: true,
  });
  await page.getByLabel("写入确认").fill("APPLY");
  await expect(applyButton).toBeDisabled();
});

test("allows enabling user-level targets from the policy page", async ({
  page,
}) => {
  await page.goto("/?config=user-disabled");
  await expect(page.getByRole("heading", { name: "安装矩阵" })).toBeVisible();
  await primaryNav(page)
    .getByRole("button", { name: "策略", exact: true })
    .click();

  const userSummary = page
    .locator(".project-summary-item")
    .filter({ hasText: "用户级目标" })
    .first();
  await expect(userSummary).toContainText("已禁用");

  const userTargetsToggle = page.getByRole("checkbox", {
    name: "启用用户级目标",
  });
  await expect(userTargetsToggle).not.toBeChecked();
  await userTargetsToggle.check();
  await expect(userTargetsToggle).toBeChecked();
  await expect(userSummary.locator(".tool-icon-badge")).toHaveCount(2);
  await expect(page.getByText("已修改，有效")).toBeVisible();
  await expectPolicyMetaAligned(page);
});

test("accepts the browser automation contract for preview-only coverage", async ({
  page,
}) => {
  await openApp(page);
  await expect(page.getByText("浏览器预览")).toBeVisible();

  const exposedGlobals = await page.evaluate(() => {
    const candidate = window as unknown as {
      agentRoutines?: unknown;
      process?: unknown;
      require?: unknown;
    };
    return {
      agentRoutines: typeof candidate.agentRoutines,
      process: typeof candidate.process,
      require: typeof candidate.require,
    };
  });
  expect(exposedGlobals).toEqual({
    agentRoutines: "undefined",
    process: "undefined",
    require: "undefined",
  });

  await primaryNav(page)
    .getByRole("button", { name: "项目", exact: true })
    .click();
  await page.getByPlaceholder("D:\\Work\\Projects").fill("D:\\Work\\Projects");
  await page.getByRole("button", { name: "添加 root" }).click();
  await expect(page.getByText("配置无效")).toBeVisible();
  await expect(page.locator(".validation-message-list")).toContainText(
    "discovery.roots",
  );
  await expect(page.locator(".validation-message-list")).toContainText("重复");

  await primaryNav(page)
    .getByRole("button", { name: "分发", exact: true })
    .click();
  await expect(page.getByText("配置有未保存更改")).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "生成 dry-run plan" })
      .first(),
  ).toBeDisabled();

  await openApp(page);
  await primaryNav(page)
    .getByRole("button", { name: "策略", exact: true })
    .click();
  const excludedUserSkills = page
    .locator(".policy-section")
    .filter({
      has: page.locator('.routine-scope-heading[aria-label="用户级排除项"]'),
    })
    .first();
  await excludedUserSkills
    .getByRole("checkbox", { name: "pay-docs" })
    .uncheck();
  await excludedUserSkills
    .getByRole("checkbox", { name: "dms-repair" })
    .uncheck();
  await excludedUserSkills
    .getByRole("checkbox", { name: "api-sync" })
    .uncheck();
  await expect(excludedUserSkills.locator(".selected-strip")).toContainText(
    "未选择项目",
  );
  await expect(excludedUserSkills.locator(".selected-strip")).toHaveCSS(
    "min-height",
    "56px",
  );
  const userCodexSkills = page
    .locator(".policy-section")
    .filter({
      has: page.locator('.tool-skill-heading[aria-label="用户级 Codex 技能"]'),
    })
    .first();
  await userCodexSkills.getByRole("checkbox", { name: "api-sync" }).check();
  await expect(
    userCodexSkills.locator(".selected-token", { hasText: "api-sync" }),
  ).toBeVisible();
  const routineGrouping = await userCodexSkills
    .locator(".policy-routine-list")
    .evaluate((list) =>
      Array.from(list.querySelectorAll(".policy-routine-group")).map(
        (group) => ({
          checkedCount: group.querySelectorAll("input:checked").length,
          title:
            group
              .querySelector(".policy-routine-group-header span")
              ?.textContent?.trim() ?? "",
        }),
      ),
    );
  expect(routineGrouping).toMatchObject([
    { title: "已选择" },
    { title: "待选择", checkedCount: 0 },
  ]);
  expect(routineGrouping[0]?.checkedCount).toBeGreaterThan(0);
  const userClaudeSkills = page
    .locator(".policy-section")
    .filter({
      has: page.locator(
        '.tool-skill-heading[aria-label="用户级 Claude Code 技能"]',
      ),
    })
    .first();
  await expect(
    userClaudeSkills.locator(".selected-token", { hasText: "api-sync" }),
  ).toHaveCount(0);
  await userClaudeSkills.getByRole("checkbox", { name: "api-sync" }).check();
  await expect(
    userClaudeSkills.locator(".selected-token", { hasText: "api-sync" }),
  ).toBeVisible();
  await expect(page.getByText("已修改，有效")).toBeVisible();
  await userCodexSkills.getByRole("button", { name: "上移" }).last().click();
  await expect(userCodexSkills.locator(".selected-token").nth(2)).toContainText(
    "api-sync",
  );
  const policyMetrics = await page
    .locator(".policy-layout")
    .evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        viewportHeight: window.innerHeight,
      };
    });
  expect(policyMetrics.height).toBeLessThanOrEqual(
    policyMetrics.viewportHeight - 160,
  );
  await page.getByRole("tab", { name: /项目默认/ }).click();
  await expect(
    page.locator('.tool-skill-heading[aria-label="项目默认 Codex 技能"]'),
  ).toBeVisible();
  await expect(
    page.locator('.routine-scope-heading[aria-label="项目默认共享流程"]'),
  ).toBeVisible();
  const projectDefaultSharedSection = page
    .locator(".policy-section")
    .filter({
      has: page.locator('.routine-scope-heading[aria-label="项目默认共享流程"]'),
    })
    .first();
  const projectDefaultSharedMetrics = await projectDefaultSharedSection.evaluate(
    (section) => {
      const list = section.querySelector(".policy-routine-list");
      const listRect = list?.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      return {
        listHeight: listRect ? Math.round(listRect.height) : 0,
        sectionHeight: Math.round(sectionRect.height),
        emptyBelowList: listRect
          ? Math.round(sectionRect.bottom - listRect.bottom)
          : Number.NaN,
      };
    },
  );
  expect(projectDefaultSharedMetrics.listHeight).toBeLessThanOrEqual(320);
  expect(projectDefaultSharedMetrics.emptyBelowList).toBeLessThanOrEqual(1);
  await page.getByRole("tab", { name: /特定项目/ }).click();
  await expect(page.getByText("项目目标编辑器")).toBeVisible();
  await expect(
    page.locator('.routine-scope-heading[aria-label="项目共享流程"]'),
  ).toBeVisible();
  await page.getByRole("tab", { name: /建议/ }).click();
  await expect(
    page.getByRole("heading", { name: "共享流程运行时" }),
  ).toBeVisible();
  await expect(
    page.locator(".recommendation-marker", { hasText: "共享运行时" }).first(),
  ).toBeVisible();
  const recommendationMarkerState = await page
    .locator(".policy-recommendation-groups")
    .evaluate((root) => ({
      hasProjectReason:
        root.textContent?.includes("描述或策略表明它更适合项目级使用。"),
      hasReusableReason: root.textContent?.includes(
        "通用 agent 指导，可在多个项目复用。",
      ),
      hasWorkflowReason: root.textContent?.includes(
        "流程安装到共享 Agent Routines 运行时，不按工具分目录。",
      ),
      markers: Array.from(root.querySelectorAll(".recommendation-marker")).map(
        (marker) => marker.textContent?.trim() ?? "",
      ),
    }));
  expect(recommendationMarkerState.hasProjectReason).toBe(false);
  expect(recommendationMarkerState.hasReusableReason).toBe(false);
  expect(recommendationMarkerState.hasWorkflowReason).toBe(false);
  expect(recommendationMarkerState.markers).toEqual(
    expect.arrayContaining(["可复用", "项目级", "共享运行时"]),
  );
  await expectRecommendationCardsFit(page);
  await page
    .locator(".policy-recommendation-card", { hasText: "electron-app-builder" })
    .getByRole("button", { name: "技能源指令" })
    .click();
  await expect(page.getByRole("heading", { name: "文档" })).toBeVisible();
  await expect(page.locator(".docs-view .pane.fill")).toContainText(
    "electron-app-builder SKILL.md",
  );
  await expectNoDocumentOverflow(page);
});

test("keeps status bar labels horizontal in narrow preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await expect(
    page.getByText("窄视口：矩阵详情会以覆盖层打开。"),
  ).toBeVisible();
  await expect(page.locator(".preview-chip")).toBeVisible();
  const topbarTargets = await page
    .locator(".topbar .segmented button")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          label: button.getAttribute("title") ?? "",
          width: Math.round(rect.width),
        };
      }),
    );
  expect(topbarTargets).toHaveLength(5);
  for (const target of topbarTargets) {
    expect(target.width, target.label).toBeGreaterThanOrEqual(40);
    expect(target.height, target.label).toBeGreaterThanOrEqual(40);
  }
  await expect(page.locator(".detail-drawer")).toHaveCount(0);
  await page.locator(".matrix-cell").first().click();
  await expect(page.locator(".detail-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".detail-drawer")).toHaveCount(0);
  await primaryNav(page)
    .getByRole("button", { name: "策略", exact: true })
    .click();

  const metrics = await page
    .locator(".statusbar span:not(.statusbar-spacer)")
    .evaluateAll((spans) =>
      spans.map((span) => {
        const rect = span.getBoundingClientRect();
        return {
          height: rect.height,
          text: span.textContent?.trim() ?? "",
          whiteSpace: getComputedStyle(span).whiteSpace,
        };
      }),
    );

  expect(metrics.length).toBeGreaterThan(0);
  for (const metric of metrics) {
    expect(metric.whiteSpace, metric.text).toBe("nowrap");
    expect(metric.height, metric.text).toBeLessThanOrEqual(24);
  }
  await expectNoDocumentOverflow(page);
});

test("shows failed plan stderr and keeps write actions disabled", async ({
  page,
}) => {
  await page.goto("/?plan=fail");
  await expect(page.getByRole("heading", { name: "安装矩阵" })).toBeVisible();
  await primaryNav(page)
    .getByRole("button", { name: "分发", exact: true })
    .click();
  await page.getByRole("button", { name: "生成 dry-run plan" }).first().click();

  await expect(page.getByText("计划生成失败").first()).toBeVisible();
  await expect(page.getByLabel("计划 JSON")).toHaveValue(
    /projectDiscovery\.rootOptions must be an array\./,
  );
  await expect(page.getByLabel("清单差异")).toHaveValue("无已生成差异。");
  await expect(
    page.getByRole("main").getByRole("button", {
      name: "写入 manifest",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "6 结果" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "6 结果" })).toHaveClass(
    /blocked/,
  );
});

test("shows gate task status and blocks stale dirty-config plans", async ({
  page,
}) => {
  await openApp(page);

  await primaryNav(page)
    .getByRole("button", { name: "验收", exact: true })
    .click();
  await page.getByRole("button", { name: "运行选中" }).first().click();
  await expect(page.getByText("Browser preview task evidence.")).toBeVisible();
  await expect(
    page
      .locator(".table-row.validation-grid")
      .filter({ hasText: "validate-structure" })
      .first(),
  ).toContainText("已成功");
  await page.getByRole("button", { name: "运行全部只读门禁" }).click();
  await expect(
    page
      .locator(".table-row.validation-grid")
      .filter({ hasText: "run-workflows" })
      .first(),
  ).toContainText("已成功");

  await page.getByRole("button", { name: "项目" }).click();
  await page.getByPlaceholder("D:\\Work\\Projects").fill("D:\\Workbench");
  await page.getByRole("button", { name: "添加 root" }).click();
  await expect(page.getByText("已修改，有效")).toBeVisible();

  await primaryNav(page)
    .getByRole("button", { name: "分发", exact: true })
    .click();
  await expect(page.getByText("配置有未保存更改")).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", {
        name: "生成 dry-run plan",
      })
      .first(),
  ).toBeDisabled();

  await primaryNav(page).getByRole("button", { name: "项目" }).click();
  await page.getByRole("button", { name: "另存配置..." }).click();
  await expect(page.getByText("配置已保存")).toBeVisible();

  await primaryNav(page)
    .getByRole("button", { name: "分发", exact: true })
    .click();
  await expect(page.getByText("配置有未保存更改")).toHaveCount(0);
  const generateButton = page
    .getByRole("main")
    .getByRole("button", {
      name: "生成 dry-run plan",
    })
    .first();
  await expect(generateButton).toBeEnabled();
  await generateButton.click();
  await expect(page.getByLabel("计划 JSON")).toHaveValue(/"preview": true/);
});
