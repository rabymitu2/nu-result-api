import express from "express";
import cors from "cors";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

app.get("/check-result", async (req, res) => {
  const roll = req.query.roll;
  if (!roll) return res.status(400).json({ error: "Missing roll or ID" });

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();
    await page.goto("http://app55.nu.edu.bd/nu-web/admissionTestResultQueryForm", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.type('input[name="examRollOrAppId"]', roll);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "domcontentloaded" })
    ]);

    const result = await page.evaluate(() => {
      const get = (label) => {
        const el = Array.from(document.querySelectorAll(".form-group"))
          .find(e => e.innerText.startsWith(label));
        return el ? el.innerText.replace(label, "").trim() : null;
      };
      return {
        applicationId: get("Application ID :"),
        rollNo: get("Admission Test Roll No :"),
        name: get("Applicant Name :"),
        result: get("Result :")
      };
    });

    await browser.close();

    if (!result.result) {
      return res.status(404).json({ error: "ফলাফল পাওয়া যায়নি!" });
    }

    res.json(result);
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({
      error: "Internal error",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
