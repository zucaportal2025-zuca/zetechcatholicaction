const { JWT } = require("google-auth-library");
const { google } = require("googleapis");
const creds = require("./service-account.json");

const SHEET_ID = "1NvN403HneedL4gvheV7TCNYJStDeqd8iT1NdMD21g14";

async function run() {
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    includeGridData: true,
  });

  const sheet = res.data.sheets[0];
  console.log("Tab title:", sheet.properties.title);
  console.log("Tab id:", sheet.properties.sheetId);

  const rows = sheet.data[0].rowData || [];
  for (let r = 0; r < Math.min(6, rows.length); r++) {
    const cells = rows[r].values || [];
    for (let c = 0; c < Math.min(5, cells.length); c++) {
      const cell = cells[c];
      const v = cell?.effectiveValue?.stringValue || "";
      if (!v) continue;
      const fmt = cell?.effectiveFormat?.textFormat || {};
      console.log(`R${r + 1}C${c + 1} "${v}": bold=${fmt.bold}, font=${fmt.fontFamily}, size=${fmt.fontSize}`);
    }
  }
}

run().catch(console.error);