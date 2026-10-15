const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const { google } = require("googleapis");
const path = require("path");

let cachedAuth = null;
function getAuth() {
  if (cachedAuth) return cachedAuth;

  let creds;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is set but not valid JSON: " + e.message
      );
    }
  } else {
    const credsPath = path.join(__dirname, "..", "service-account.json");
    creds = require(credsPath);
  }

  cachedAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return cachedAuth;
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function monthName(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return MONTHS[d.getMonth()];
}

function yearOf(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return String(d.getFullYear());
}

const LOAD_RANGE = "A1:F200";

function cellText(sheet, r, c) {
  return String(sheet.getCell(r, c)?.value || "").trim().toUpperCase();
}

function findSemesterBlock(sheet, semester) {
  const startMonth = monthName(semester.startDate);
  const year = yearOf(semester.startDate);

  for (let r = 0; r < 199; r++) {
    if (cellText(sheet, r, 1) !== "SEMESTER") continue;

    const cVal = cellText(sheet, r + 1, 2);
    const eVal = cellText(sheet, r + 1, 4);

    if (cVal === startMonth && eVal === year) {
      return r;
    }
  }
  return -1;
}

function detectHeaderRanges(sheet) {
  const ranges = [];

  for (let r = 0; r < 199; r++) {
    const b = cellText(sheet, r, 1);

    if (b === "SEMESTER") {
      ranges.push({ start: r, end: r + 1 });
      ranges.push({ start: r + 1, end: r + 2 });
    }

    if (b === "NAME") {
      ranges.push({ start: r, end: r + 1 });
    }
  }

  return ranges;
}

async function applyFormatting(sheetId) {
  try {
    await new Promise((r) => setTimeout(r, 1200));

    const auth = getAuth();
    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells(LOAD_RANGE);

    const sheets = google.sheets({ version: "v4", auth });

    // 1. Bold + Montserrat 11 on every header row
    const headerRanges = detectHeaderRanges(sheet);
    console.log(`[sheet] detected ${headerRanges.length} header ranges to format`);

    if (headerRanges.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: headerRanges.map((range) => ({
            repeatCell: {
              range: {
                sheetId: sheet.sheetId,
                startRowIndex: range.start,
                endRowIndex: range.end,
                startColumnIndex: 0,
                endColumnIndex: 5,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                    fontFamily: "Montserrat",
                    fontSize: 11,
                  },
                },
              },
              fields:
                "userEnteredFormat.textFormat.bold," +
                "userEnteredFormat.textFormat.fontFamily," +
                "userEnteredFormat.textFormat.fontSize",
            },
          })),
        },
      });
    }

    // 2. Force ADMIN.NO column (C) to plain text, black, no underline
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheet.sheetId,
                startRowIndex: 0,
                endRowIndex: 200,
                startColumnIndex: 2,
                endColumnIndex: 3,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: {
                    type: "TEXT",
                    pattern: "@",
                  },
                  textFormat: {
                    underline: false,
                    foregroundColor: { red: 0, green: 0, blue: 0 },
                  },
                },
              },
              fields:
                "userEnteredFormat.numberFormat," +
                "userEnteredFormat.textFormat.underline," +
                "userEnteredFormat.textFormat.foregroundColor",
            },
          },
        ],
      },
    });

    // 3. Wrap + vertical-align on ROLE cell of each NAME row
    for (let r = 0; r < 199; r++) {
      if (cellText(sheet, r, 1) !== "NAME") continue;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheet.sheetId,
                  startRowIndex: r,
                  endRowIndex: r + 1,
                  startColumnIndex: 4,
                  endColumnIndex: 5,
                },
                cell: {
                  userEnteredFormat: {
                    wrapStrategy: "WRAP",
                    verticalAlignment: "MIDDLE",
                  },
                },
                fields:
                  "userEnteredFormat.wrapStrategy," +
                  "userEnteredFormat.verticalAlignment",
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: sheet.sheetId,
                  startRowIndex: r,
                  endRowIndex: r + 1,
                  startColumnIndex: 1,
                  endColumnIndex: 4,
                },
                cell: {
                  userEnteredFormat: {
                    verticalAlignment: "MIDDLE",
                  },
                },
                fields: "userEnteredFormat.verticalAlignment",
              },
            },
          ],
        },
      });
    }

    // 4. Border each semester block
    for (let r = 0; r < 199; r++) {
      if (cellText(sheet, r, 1) !== "SEMESTER") continue;

      let blockEnd = r + 1;
      for (let rr = r + 1; rr < 199; rr++) {
        if (cellText(sheet, rr, 1) === "SEMESTER") break;

        let hasValue = false;
        for (let c = 0; c < 5; c++) {
          if (String(sheet.getCell(rr, c)?.value || "").trim()) {
            hasValue = true;
            break;
          }
        }
        if (hasValue) blockEnd = rr + 1;
      }

      console.log(`[sheet] border range rows ${r + 1}–${blockEnd}`);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              updateBorders: {
                range: {
                  sheetId: sheet.sheetId,
                  startRowIndex: r,
                  endRowIndex: blockEnd,
                  startColumnIndex: 0,
                  endColumnIndex: 5,
                },
                top:    { style: "SOLID", color: { red: 0, green: 0, blue: 0 } },
                bottom: { style: "SOLID", color: { red: 0, green: 0, blue: 0 } },
                left:   { style: "SOLID", color: { red: 0, green: 0, blue: 0 } },
                right:  { style: "SOLID", color: { red: 0, green: 0, blue: 0 } },
                innerHorizontal: { style: "SOLID", color: { red: 0, green: 0, blue: 0 } },
                innerVertical:   { style: "SOLID", color: { red: 0, green: 0, blue: 0 } },
              },
            },
          ],
        },
      });
    }

    console.log(`[sheet] formatting done`);
  } catch (err) {
    console.warn(`[sheet] formatting failed:`, err.message);
  }
}

async function writeRosterToSheet(sheetId, semester, rows, semesterIndex = 1) {
  if (!sheetId) throw new Error("Sheet ID is required");
  if (!semester) throw new Error("Semester is required");

  const auth = getAuth();
  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  await sheet.loadCells(LOAD_RANGE);

  console.log(`[sheet] loaded cells ${LOAD_RANGE}, header search...`);

  const headerRowIndex = findSemesterBlock(sheet, semester);
  console.log(`[sheet] header row found at index:`, headerRowIndex);

  if (headerRowIndex >= 0) {
    // SEMESTER row → values row → NAME row → data
    const dataStartRow = headerRowIndex + 3;

    let dataEndRow = dataStartRow;
    for (let r = dataStartRow; r < 199; r++) {
      const bVal = cellText(sheet, r, 1);
      const aVal = String(sheet.getCell(r, 0)?.value || "").trim();

      if (bVal === "SEMESTER" || bVal === "NAME") break;
      if (bVal === "" && aVal === "") break;
      dataEndRow = r + 1;
    }

    const clearEnd = Math.max(dataEndRow, dataStartRow + rows.length);
    for (let r = dataStartRow; r < clearEnd; r++) {
      for (let c = 0; c < 5; c++) {
        if (r < 200) sheet.getCell(r, c).value = null;
      }
    }

    rows.forEach((row, i) => {
      const targetRow = dataStartRow + i;
      if (targetRow >= 200) return;
      sheet.getCell(targetRow, 0).value = row.index;
      sheet.getCell(targetRow, 1).value = row.name;
      sheet.getCell(targetRow, 2).value = row.admissionNumber || "";
      sheet.getCell(targetRow, 3).value = row.contact;
      sheet.getCell(targetRow, 4).value = row.role;
    });

    await sheet.saveUpdatedCells();
    await applyFormatting(sheetId);

    return { mode: "updated", written: rows.length };
  }

  let lastRow = 0;
  for (let r = 199; r >= 0; r--) {
    let hasContent = false;
    for (let c = 0; c < 5; c++) {
      if (sheet.getCell(r, c)?.value) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      lastRow = r;
      break;
    }
  }

  const startRow = lastRow + 2;

  const year = yearOf(semester.startDate);
  const startMonth = monthName(semester.startDate);
  const endMonth = monthName(semester.endDate);

  const newRows = [
    ["", "SEMESTER", "MONTH", "TO", "YEAR"],
    ["", String(semesterIndex), startMonth, endMonth, year],
    ["", "NAME", "ADMIN.NO", "CONTACT", "ROLE e.g. cCairperson, Secreatary, Treasurer, Member etc"],
  ];

  rows.forEach((row) => {
    newRows.push([
      row.index,
      row.name,
      row.admissionNumber || "",
      row.contact,
      row.role,
    ]);
  });

  for (let i = 0; i < newRows.length; i++) {
    const r = startRow + i;
    if (r >= 200) break;
    const rowData = newRows[i];
    for (let c = 0; c < 5; c++) {
      sheet.getCell(r, c).value = rowData[c] || "";
    }
  }

  await sheet.saveUpdatedCells();
  await applyFormatting(sheetId);

  return { mode: "appended", written: rows.length };
}

module.exports = { writeRosterToSheet };