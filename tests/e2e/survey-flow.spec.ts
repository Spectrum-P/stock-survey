import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";

test("demo dashboard and flat workspace are navigable", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Stock condition overview" })).toBeVisible();
  await page.goto("/surveys/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/workspace");
  await expect(page.getByRole("heading", { name: "Flat 01 survey" })).toBeVisible();
  await expect(page.getByText("Element coverage")).toBeVisible();
});

test("six-stage element form retains flat context", async ({ page }) => {
  await page.goto("/surveys/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/element/Render");
  await expect(page.getByRole("heading", { name: "Render assessment" })).toBeVisible();
  await expect(page.getByText("Choose the element", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Record construction", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Record construction", { exact: true })).toBeVisible();
});

test("records filters and detail drawer work", async ({ page }) => {
  await page.goto("/records");
  await page.getByPlaceholder("Search property, flat or defect").fill("fan inoperative");
  await expect(page.getByText("Fan inoperative").first()).toBeVisible();
  await page.getByText("Fan inoperative").first().click();
  await expect(page.getByRole("heading", { name: "Extract Ventilation" })).toBeVisible();
});

test("records can export a property and a single unit as Excel", async ({ page }) => {
  await page.goto("/records");
  const propertyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export property Excel" }).click();
  const propertyFile = await propertyDownload;
  expect(propertyFile.suggestedFilename()).toMatch(/_all-flats_stock-condition_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const propertyPath = await propertyFile.path();
  expect(propertyPath).toBeTruthy();
  const propertyWorkbook = new ExcelJS.Workbook();
  await propertyWorkbook.xlsx.readFile(propertyPath!);
  expect(propertyWorkbook.getWorksheet("Master Database")?.getRow(4).cellCount).toBe(23);

  await page.getByLabel("Excel scope").selectOption("unit");
  const unitDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export unit Excel" }).click();
  const unitFile = await unitDownload;
  expect(unitFile.suggestedFilename()).toMatch(/_stock-condition_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const unitPath = await unitFile.path();
  expect(unitPath).toBeTruthy();
  const unitWorkbook = new ExcelJS.Workbook();
  await unitWorkbook.xlsx.readFile(unitPath!);
  expect(unitWorkbook.getWorksheet("Unit Survey")?.getRow(4).cellCount).toBe(20);
});

test("unit report generation opens a populated editor", async ({ page }) => {
  // Warm the API route before the interaction so a cold Next.js dev compile
  // cannot trigger Fast Refresh halfway through the client click handler.
  const warmResponse = await page.request.post("/api/reports/generate", {
    data: { scope: { kind: "survey", surveyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, reportType: "stock_condition" },
  });
  await expect(warmResponse.status()).toBe(202);
  await expect((await page.request.get("/api/reports/demo-generated")).status()).toBe(200);
  await expect((await page.request.get("/reports/demo-generated")).status()).toBe(200);
  await page.goto("/reports");
  await page.getByLabel("Report scope").selectOption("unit");
  const generated = page.waitForResponse((response) => response.url().endsWith("/api/reports/generate") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect((await generated).status()).toBe(202);
  await expect(page).toHaveURL(/\/reports\/demo-generated$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Report review" })).toBeVisible();
  await expect(page.getByLabel("Report title")).toHaveValue(/Bishop Hall · Flat 01/);
  await expect(page.getByLabel("Client")).toHaveValue("Stock Condition Survey Demo");
});
