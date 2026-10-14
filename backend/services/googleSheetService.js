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

function findSemesterBlock(sheet, semester) {
  const startMonth = monthName(semester.startDate);
  const year = yearOf(semester.startDate);

  for (let r = 0; r < 199; r++) {
    const bVal = String(sheet.getCell(r, 1)?.value || "").trim().toUpperCase();
    if (bVal !== "SEMESTER") continue;

    const cVal = String(sheet.getCell(r + 1, 2)?.value || "").trim().toUpperCase();
    const eVal = String(sheet.getCell(r + 1, 4)?.value || "").trim().toUpperCase();

    if (cVal === startMonth && eVal === year) {
      return r;
    }
  }
  return -1;
}

async function boldRows(auth, spreadsheetId, tabId, ranges) {
  const sheets = google.sheets({ version: "v4", auth });

  const requests = ranges.map((range) => ({
    repeatCell: {
      range: {
        sheetId: tabId,
        startRowIndex: range.start,
        endRowIndex: range.end,
        startColumnIndex: 0,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true },
        },
      },
      fields: "userEnteredFormat.textFormat.bold",
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
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
    const dataStartRow = headerRowIndex + 4;

    let dataEndRow = dataStartRow;
    for (let r = dataStartRow; r < 199; r++) {
      const bVal = String(sheet.getCell(r, 1)?.value || "").trim().toUpperCase();
      const aVal = String(sheet.getCell(r, 0)?.value || "").trim();

      if (bVal === "SEMESTER") break;
      if (bVal === "" && aVal === "") break;
      dataEndRow = r + 1;
    }

    for (let r = dataStartRow; r < dataEndRow; r++) {
      for (let c = 0; c < 5; c++) {
        sheet.getCell(r, c).value = null;
      }
    }

    rows.forEach((row, i) => {
      const targetRow = dataStartRow + i;
      if (targetRow >= 200) return;
      sheet.getCell(targetRow, 0).value = row.index;
      sheet.getCell(targetRow, 1).value = row.name;
      sheet.getCell(targetRow, 2).value = row.admissionNumber;
      sheet.getCell(targetRow, 3).value = row.contact;
      sheet.getCell(targetRow, 4).value = row.role;
    });

    await sheet.saveUpdatedCells();

    try {
      await boldRows(auth, sheetId, sheet.sheetId, [
        { start: headerRowIndex, end: headerRowIndex + 1 },
        { start: headerRowIndex + 1, end: headerRowIndex + 2 },
        { start: headerRowIndex + 3, end: headerRowIndex + 4 },
      ]);
      console.log(`[sheet] bolded header rows`);
    } catch (err) {
      console.warn(`[sheet] bold formatting failed:`, err.message);
    }

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
    [],
    ["", "NAME", "ADMIN.NO", "CONTACT", "ROLE e.g. cCairperson, Secreatary, Treasurer, Member etc"],
  ];

  rows.forEach((row) => {
    newRows.push([row.index, row.name, row.admissionNumber, row.contact, row.role]);
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

  try {
    await boldRows(auth, sheetId, sheet.sheetId, [
      { start: startRow, end: startRow + 1 },
      { start: startRow + 1, end: startRow + 2 },
      { start: startRow + 3, end: startRow + 4 },
    ]);
    console.log(`[sheet] bolded header rows`);
  } catch (err) {
    console.warn(`[sheet] bold formatting failed:`, err.message);
  }

  return { mode: "appended", written: rows.length };
}

module.exports = { writeRosterToSheet };