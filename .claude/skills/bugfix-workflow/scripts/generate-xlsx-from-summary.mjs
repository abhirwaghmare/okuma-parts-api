/**
 * Builds a bug-analysis workbook from bug-analysis-summary-*.json.
 * Styling: see `.claude/skills/bugfix-workflow/references/bulk-spec.md` section 10 (Excel layout).
 * Empty tracked columns: in-cell Reason + What to do (yellow highlight). No separate Data quality sheet.
 *
 * Usage: node generate-xlsx-from-summary.mjs <input.json> [output.xlsx]
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF7' } };
const ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
const GAP_CELL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CE' } };
const ACTIONABLE_Y_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
const ACTIONABLE_N_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
const AUTHORING_ROW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E5' } };
const BORDER = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
};
const HEADER_FONT = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1F2937' } };
const BODY_FONT = { name: 'Calibri', size: 11, color: { argb: 'FF111827' } };

function str(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function isBlank(v) {
  return str(v).trim() === '';
}

function isResolved(t) {
  if (t.resolvedReason) return true;
  const st = str(t.status);
  return st === 'Fixed' || st === 'Resolved';
}

function fixCategory(t) {
  return t.authoringOrContentOnly ? 'Authoring / content' : 'Code';
}

function exclusionSignal(t) {
  const er = str(t.exclusionReason).toLowerCase();
  const hasTag = /\btag\b|ai agent fix/i.test(er) || /\bAI agent fix\b/i.test(str(t.tags));
  const hasComment = /\bcomment\b|\bpr\b|pull request/i.test(er) || !!t.parsedAgentPrUrl;
  if (hasTag && hasComment) return 'Both';
  if (hasComment) return 'Comment';
  if (hasTag) return 'Tag';
  return '';
}

const FIELD_HELP = {
  id: {
    why: 'Work item id missing on this ticket object.',
    fix: 'Ensure Stage 1 fetch writes id from the tracker (e.g. Azure DevOps System.Id) into each tickets[] entry; re-run @bulk-bug-fixer or repair JSON.',
  },
  title: {
    why: 'Title not copied from the tracker.',
    fix: 'Populate title from System.Title (or equivalent) during triage (Stage 2); re-fetch work item or edit JSON and regenerate Excel.',
  },
  state: {
    why: 'Work item state not stored on ticket.',
    fix: 'Copy state from the tracker API in Stage 1/2; required for Actionable rules and Stage 7.',
  },
  testPageUrl: {
    why: 'No test page URL recorded (sufficiency failed, no URL in WI, or Pass 2 never ran).',
    fix: 'Add a publish-stage URL to the work item, re-run Stages 2–3 (live repro), or set testPageUrl to the URL CDT/Playwright opened.',
  },
  scope: {
    why: 'FE/BE/Mixed not reconciled after root cause.',
    fix: 'After Stage 4, set scope from affected files per .claude/skills/bugfix-workflow/references/bulk-spec.md Report accuracy §3; re-merge RCA into JSON.',
  },
  category: {
    why: 'Bug category not assigned.',
    fix: 'Assign category from Bug Categories table in .claude/skills/bugfix-workflow/references/bulk-spec.md during triage/RCA; regenerate Stage 5 JSON.',
  },
  subCategory: {
    why: 'Sub-category not assigned.',
    fix: 'Assign subCategory alongside category (both mandatory in the bug-analysis summary JSON schema).',
  },
  fixability: {
    why: 'Fixability (HIGH/MEDIUM/LOW/INSUFFICIENT) not set.',
    fix: 'Complete triage Step 1 in @bulk-bug-fixer; set fixability before Stage 5 export.',
  },
  exclusionReason: {
    why: 'Exclusion reason blank while ticket is not actionable.',
    fix: 'Apply Report accuracy §8: set exclusionReason when actionableForBulkFix is false (state, tags, agent PR, authoring-only).',
  },
  reproductionResult: {
    why: 'No Pass 2 verdict (Reproducible / Not Reproducible / Inconclusive).',
    fix: 'Run bulk Stage 3 or single-ticket Step 2 (CDT + Playwright); do not leave Not Checked for sufficiency-passing tickets.',
  },
  reproductionEvidence: {
    why: 'No live evidence string (tool, URL, observation).',
    fix: 'Record reproductionEvidence per Report accuracy §5 after browser pass.',
  },
  rootCause: {
    why: 'Root cause analysis not written for this valid ticket.',
    fix: 'Complete Stage 4 parallel RCA; merge rootCause into JSON before Stage 5.',
  },
  recommendedFix: {
    why: 'No file-level recommended fix text.',
    fix: 'Stage 4 must populate actionable recommendedFix (no Deferred stubs); re-run RCA or edit JSON.',
  },
  impactedAreas: {
    why: 'Impacted areas (feature + paths + modules) not filled.',
    fix: 'Populate per Report accuracy §7 after RCA.',
  },
  areaPath: {
    why: 'Area path not copied from the tracker.',
    fix: 'Include areaPath from work item fields during Stage 1 fetch.',
  },
  severity: {
    why: 'Severity not copied from the tracker.',
    fix: 'Map tracker severity into ticket JSON during fetch/triage.',
  },
  invalidReason: {
    why: 'Routing reason missing for this bucket.',
    fix: 'Set invalidReason when marking Invalid, Blocked, Insufficient, or Duplicate (bulk-bug-fixer agent triage rules).',
  },
  commentsSignal: {
    why: 'commentsSignal not set (bulk mandatory).',
    fix: 'After Step 0b comments read, set RESOLVED/BLOCKED/CLEAR/NO COMMENTS per bulk triage rules.',
  },
  resolvedReason: {
    why: 'Resolution summary missing for resolved ticket.',
    fix: 'Set resolvedReason from tracker state and/or PR reference only; re-run triage or edit JSON.',
  },
  duplicateOf: {
    why: 'Primary bug id not set for duplicate.',
    fix: 'Set duplicateOf and duplicateOfUrl after duplicate detection in Stage 4.',
  },
  duplicateOfUrl: {
    why: 'Link to primary work item missing.',
    fix: 'Set duplicateOfUrl to full work-item URL of primary bug.',
  },
  exclusionReasonExcluded: {
    why: 'Excluded from auto-PR but no exclusion detail.',
    fix: 'Set exclusionReason from tag/comment detection per §8.',
  },
  authoringOrContentOnly: {
    why: 'authoringOrContentOnly boolean not set (Fix category cannot be trusted).',
    fix: 'Set during triage §9; drives Fix category and actionableForBulkFix.',
  },
  summaryMetric: {
    why: 'Orchestrator did not populate this summary.* field and no derived value was available.',
    fix: 'Stage 5 must set summary counts from processed tickets; re-run report generation from completed checkpoint.',
  },
};

const OPTIONAL_NO_GAP = new Set(['mergeNote', 'parsedAgentPrUrl', 'branchName', 'actionTaken', 'description', 'url']);

/**
 * @param {Array<[string|number, string, string, string, string, string]>} gaps
 */
function cellWithQuality(gaps, ticket, field, columnName, sheetName, opts = {}) {
  const key = opts.helpKey || field;
  const raw = opts.getValue ? opts.getValue(ticket) : ticket[field];
  const s = str(raw);
  if (!isBlank(s)) return s;
  if (opts.optional || OPTIONAL_NO_GAP.has(field)) return '';

  const help = FIELD_HELP[key] || {
    why: `Field "${field}" is empty in this ticket object in bug-analysis-summary JSON.`,
    fix: `Populate "${field}" by completing the relevant @bulk-bug-fixer stage (.claude/skills/bugfix-workflow/references/bulk-spec.md), regenerate bug-analysis-summary JSON, then re-run this script.`,
  };

  const id = ticket.id ?? '—';
  gaps.push([id, sheetName, columnName, field, help.why, help.fix]);

  return `— EMPTY —\nReason: ${help.why}\nWhat to do: ${help.fix}`;
}

function fixCategoryCell(gaps, t, sheetName) {
  if (t.authoringOrContentOnly !== true && t.authoringOrContentOnly !== false) {
    return cellWithQuality(gaps, t, 'authoringOrContentOnly', 'Fix category', sheetName, {
      getValue: () => '',
      helpKey: 'authoringOrContentOnly',
    });
  }
  return fixCategory(t);
}

function applyHeaderRow(worksheet, colCount) {
  const row = worksheet.getRow(1);
  row.height = 28;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { ...HEADER_FONT };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = BORDER;
  }
  worksheet.views = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];
}

function styleBody(worksheet, headers, startRow, endRow, colCount) {
  const actionableCol = headers.findIndex((h) => str(h).trim().toLowerCase() === 'actionable (y/n)') + 1;
  const fixCategoryCol = headers.findIndex((h) => str(h).trim().toLowerCase() === 'fix category') + 1;

  for (let r = startRow; r <= endRow; r++) {
    const zebra = r % 2 === 0;
    const row = worksheet.getRow(r);
    row.height = 22;
    const fixCategoryValue = fixCategoryCol > 0 ? str(row.getCell(fixCategoryCol).value).toLowerCase() : '';
    const isAuthoringRow = fixCategoryValue.includes('authoring');
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      const val = cell.value;
      const text = val != null && typeof val === 'object' && val.richText ? '' : str(val);
      const isGap = text.includes('— EMPTY —');
      cell.font = { ...BODY_FONT };
      if (isGap) {
        cell.fill = GAP_CELL_FILL;
        row.height = Math.max(row.height || 0, 52);
      } else if (isAuthoringRow) {
        cell.fill = AUTHORING_ROW_FILL;
      } else if (zebra) {
        cell.fill = ZEBRA_FILL;
      }
      if (!isGap && c === actionableCol) {
        const actionable = text.trim().toUpperCase();
        if (actionable === 'Y') cell.fill = ACTIONABLE_Y_FILL;
        if (actionable === 'N') cell.fill = ACTIONABLE_N_FILL;
      }
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = BORDER;
    }
  }
}

function addDataSheet(workbook, name, headers, rows, widths) {
  const ws = workbook.addWorksheet(name, {
    properties: { defaultRowHeight: 22, defaultColWidth: 12 },
  });
  ws.addRow(headers);
  for (const row of rows) ws.addRow(row);
  const colCount = headers.length;
  applyHeaderRow(ws, colCount);
  widths.forEach((w, i) => {
    if (w) ws.getColumn(i + 1).width = w;
  });
  if (rows.length > 0) styleBody(ws, headers, 2, rows.length + 1, colCount);
  return ws;
}

function countBy(tickets, pred) {
  return tickets.filter(pred).length;
}

/**
 * @param {Array<[string|number, string, string, string, string, string]>} gaps
 */
function buildSummaryRows(data, tickets, gaps) {
  const s = data.summary || {};

  const pick = (key, derived) => {
    const v = s[key];
    if (v !== undefined && v !== null && str(v) !== '') return str(v);
    if (derived !== undefined && derived !== null && str(derived) !== '') return str(derived);

    const help = FIELD_HELP.summaryMetric;
    gaps.push([
      '—',
      'Summary',
      key,
      `summary.${key}`,
      help.why,
      `${help.fix} For "${key}", also ensure tickets[] is complete so counts can be derived.`,
    ]);
    return `— EMPTY —\nReason: ${help.why}\nWhat to do: ${help.fix}`;
  };

  // Summary tab: concise metrics only — counts must match the corresponding worksheet row counts
  // (see .claude/skills/bugfix-workflow/references/bulk-spec.md §10 / Summary sheet). No readerNote, Stage 7, or fixability subtotals here.
  const rows = [];

  const nValidTab = countBy(tickets, (t) => t.valid === true && t.excludedFromBulkAction !== true);
  const nExcludedTab = countBy(tickets, (t) => t.excludedFromBulkAction === true && !isResolved(t));
  const nInvalidTab = countBy(tickets, (t) => t.status === 'Not Reproducible' || t.status === 'Invalid');
  const nResolvedTab = countBy(tickets, isResolved);
  const nBlockedTab = countBy(tickets, (t) => t.status === 'Blocked');
  const nDuplicateTab = countBy(tickets, (t) => t.status === 'Duplicate');
  const nInsufficientTab = countBy(
    tickets,
    (t) => t.status === 'Additional Info Required' || t.status === 'Insufficient'
  );

  // Tab-aligned counts: always from tickets[] so Summary values match worksheet row counts (not stale summary.* JSON).
  rows.push(['Total Tickets', pick('total', tickets.length)]);
  rows.push(['Valid', String(nValidTab)]);
  rows.push([
    'Excluded from auto-PR (e.g. AI dev tag or PR already raised)',
    String(nExcludedTab),
  ]);
  rows.push(['Invalid', String(nInvalidTab)]);
  rows.push(['Resolved Bugs', String(nResolvedTab)]);
  rows.push(['Blocked', String(nBlockedTab)]);
  rows.push(['Duplicate', String(nDuplicateTab)]);
  rows.push(['Insufficient', String(nInsufficientTab)]);

  const categoryMap = {};
  for (const t of tickets) {
    const c = str(t.category).trim() || 'Other';
    categoryMap[c] = (categoryMap[c] || 0) + 1;
  }
  const catKeys = Object.keys(categoryMap).sort((a, b) => a.localeCompare(b));
  if (catKeys.length === 0 && tickets.length > 0) {
    gaps.push([
      '—',
      'Summary',
      'Category breakdown',
      'tickets[].category',
      'No category values on tickets.',
      'Set category on each ticket during Stage 5 export; regenerate JSON.',
    ]);
    rows.push([
      'Category — (none)',
      '— EMPTY —\nReason: No category values on tickets.\nWhat to do: Populate tickets[].category in bug-analysis-summary JSON.',
    ]);
  } else {
    for (const k of catKeys) {
      rows.push([`Category — ${k}`, String(categoryMap[k])]);
    }
  }

  return rows;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node generate-xlsx-from-summary.mjs <bug-analysis-summary.json> [output.xlsx]');
    process.exit(1);
  }
  const inputPath = path.resolve(argv[0]);
  const replacedOutPath = inputPath.replace(/\.json$/i, '.xlsx');
  const defaultOutPath = replacedOutPath === inputPath ? `${inputPath}.xlsx` : replacedOutPath;
  const outPath = argv[1] ? path.resolve(argv[1]) : defaultOutPath;

  if (!fs.existsSync(inputPath)) {
    console.error('Input not found:', inputPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);
  const tickets = Array.isArray(data.tickets) ? data.tickets : [];

  const validTickets = tickets.filter((t) => t.valid === true && t.excludedFromBulkAction !== true);
  const invalidTickets = tickets.filter(
    (t) =>
      t.excludedFromBulkAction !== true &&
      (t.status === 'Not Reproducible' || t.status === 'Invalid')
  );
  const blockedTickets = tickets.filter(
    (t) => t.excludedFromBulkAction !== true && t.status === 'Blocked'
  );
  const resolvedTickets = tickets.filter(
    (t) => t.excludedFromBulkAction !== true && isResolved(t)
  );
  const duplicateTickets = tickets.filter(
    (t) => t.excludedFromBulkAction !== true && t.status === 'Duplicate'
  );
  const insufficientTickets = tickets.filter(
    (t) =>
      t.excludedFromBulkAction !== true &&
      (t.status === 'Additional Info Required' || t.status === 'Insufficient')
  );
  const excludedTracking = tickets.filter((t) => t.excludedFromBulkAction === true);

  /** @type {Array<[string|number, string, string, string, string, string]>} */
  const gaps = [];

  const summaryRows = buildSummaryRows(data, tickets, gaps);

  const validRows = validTickets.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Valid Tickets'),
    fixCategoryCell(gaps, t, 'Valid Tickets'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'testPageUrl', 'Test Page URL', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'scope', 'Scope', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'category', 'Category', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'subCategory', 'Sub-Category', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'fixability', 'Fixability', 'Valid Tickets'),
    t.actionableForBulkFix ? 'Y' : 'N',
    t.actionableForBulkFix === false
      ? cellWithQuality(gaps, t, 'exclusionReason', 'Exclusion reason', 'Valid Tickets')
      : str(t.exclusionReason),
    cellWithQuality(gaps, t, 'reproductionResult', 'Reproduction Result', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'reproductionEvidence', 'Reproduction Evidence', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'rootCause', 'Root Cause', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'recommendedFix', 'Recommended Fix', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'impactedAreas', 'Impacted Areas', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Valid Tickets'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Valid Tickets'),
  ]);

  const invalidRows = invalidTickets.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Invalid Tickets'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Invalid Tickets'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Invalid Tickets'),
    cellWithQuality(gaps, t, 'testPageUrl', 'Test Page URL', 'Invalid Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'scope', 'Scope', 'Invalid Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'category', 'Category', 'Invalid Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'subCategory', 'Sub-Category', 'Invalid Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'invalidReason', 'Reason (Why Invalid)', 'Invalid Tickets'),
    cellWithQuality(gaps, t, 'reproductionResult', 'Reproduction Result', 'Invalid Tickets'),
    cellWithQuality(gaps, t, 'reproductionEvidence', 'Reproduction Evidence', 'Invalid Tickets', {
      optional: true,
    }),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Invalid Tickets'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Invalid Tickets'),
  ]);

  const blockedRows = blockedTickets.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Blocked Tickets'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Blocked Tickets'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Blocked Tickets'),
    cellWithQuality(gaps, t, 'scope', 'Scope', 'Blocked Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'category', 'Category', 'Blocked Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'subCategory', 'Sub-Category', 'Blocked Tickets', { optional: true }),
    cellWithQuality(gaps, t, 'invalidReason', 'Block Reason', 'Blocked Tickets', { helpKey: 'invalidReason' }),
    cellWithQuality(gaps, t, 'commentsSignal', 'Comments Signal', 'Blocked Tickets'),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Blocked Tickets'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Blocked Tickets'),
  ]);

  const resolvedRows = resolvedTickets.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Resolved Bugs'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Resolved Bugs'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Resolved Bugs'),
    cellWithQuality(gaps, t, 'resolvedReason', 'Resolution Reason', 'Resolved Bugs'),
    cellWithQuality(gaps, t, 'parsedAgentPrUrl', 'PR Link', 'Resolved Bugs', { optional: true }),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Resolved Bugs'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Resolved Bugs'),
  ]);

  const duplicateRows = duplicateTickets.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Duplicate Tickets'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Duplicate Tickets'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Duplicate Tickets'),
    cellWithQuality(gaps, t, 'duplicateOf', 'Duplicate Of (Reason)', 'Duplicate Tickets', {
      getValue: () => t.duplicateOf ?? t.invalidReason,
      helpKey: 'duplicateOf',
    }),
    cellWithQuality(gaps, t, 'duplicateOfUrl', 'Link to Other Bug', 'Duplicate Tickets'),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Duplicate Tickets'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Duplicate Tickets'),
  ]);

  const insufficientRows = insufficientTickets.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Insufficient Tickets'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Insufficient Tickets'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Insufficient Tickets'),
    cellWithQuality(gaps, t, 'invalidReason', 'Missing Information', 'Insufficient Tickets', {
      helpKey: 'invalidReason',
    }),
    cellWithQuality(gaps, t, 'testPageUrl', 'Test Page URL (if any)', 'Insufficient Tickets', {
      optional: true,
    }),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Insufficient Tickets'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Insufficient Tickets'),
  ]);

  const excludedRows = excludedTracking.map((t) => [
    cellWithQuality(gaps, t, 'id', 'ID', 'Excluded from auto-PR'),
    cellWithQuality(gaps, t, 'title', 'Title', 'Excluded from auto-PR'),
    cellWithQuality(gaps, t, 'state', 'ADO State', 'Excluded from auto-PR'),
    exclusionSignal(t),
    cellWithQuality(gaps, t, 'exclusionReason', 'Exclusion detail', 'Excluded from auto-PR', {
      helpKey: 'exclusionReasonExcluded',
    }),
    cellWithQuality(gaps, t, 'parsedAgentPrUrl', 'PR link (if parsed)', 'Excluded from auto-PR', {
      optional: true,
    }),
    cellWithQuality(gaps, t, 'testPageUrl', 'Test Page URL', 'Excluded from auto-PR', {
      optional: true,
    }),
    cellWithQuality(gaps, t, 'areaPath', 'Area Path', 'Excluded from auto-PR'),
    cellWithQuality(gaps, t, 'severity', 'Severity', 'Excluded from auto-PR'),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'bug-analysis-xlsx';
  wb.created = new Date();

  addDataSheet(wb, 'Summary', ['Metric', 'Value'], summaryRows, [44, 62]);
  addDataSheet(
    wb,
    'Valid Tickets',
    [
      'ID',
      'Title',
      'Fix category',
      'ADO State',
      'Test Page URL',
      'Scope',
      'Category',
      'Sub-Category',
      'Fixability',
      'Actionable (Y/N)',
      'Exclusion reason',
      'Reproduction Result',
      'Reproduction Evidence',
      'Root Cause',
      'Recommended Fix',
      'Impacted Areas',
      'Area Path',
      'Severity',
    ],
    validRows,
    [11, 36, 16, 14, 52, 10, 18, 22, 14, 16, 24, 18, 48, 48, 52, 48, 28, 12]
  );
  addDataSheet(
    wb,
    'Invalid Tickets',
    [
      'ID',
      'Title',
      'ADO State',
      'Test Page URL',
      'Scope',
      'Category',
      'Sub-Category',
      'Reason (Why Invalid)',
      'Reproduction Result',
      'Reproduction Evidence',
      'Area Path',
      'Severity',
    ],
    invalidRows,
    [11, 36, 14, 48, 10, 18, 22, 40, 18, 48, 28, 12]
  );
  addDataSheet(
    wb,
    'Blocked Tickets',
    [
      'ID',
      'Title',
      'ADO State',
      'Scope',
      'Category',
      'Sub-Category',
      'Block Reason',
      'Comments Signal',
      'Area Path',
      'Severity',
    ],
    blockedRows,
    [11, 36, 14, 10, 18, 22, 36, 24, 28, 12]
  );
  addDataSheet(
    wb,
    'Resolved Bugs',
    ['ID', 'Title', 'ADO State', 'Resolution Reason', 'PR Link', 'Area Path', 'Severity'],
    resolvedRows,
    [11, 36, 14, 48, 44, 28, 12]
  );
  addDataSheet(
    wb,
    'Duplicate Tickets',
    [
      'ID',
      'Title',
      'ADO State',
      'Duplicate Of (Reason)',
      'Link to Other Bug',
      'Area Path',
      'Severity',
    ],
    duplicateRows,
    [11, 36, 14, 44, 52, 28, 12]
  );
  addDataSheet(
    wb,
    'Insufficient Tickets',
    [
      'ID',
      'Title',
      'ADO State',
      'Missing Information',
      'Test Page URL (if any)',
      'Area Path',
      'Severity',
    ],
    insufficientRows,
    [11, 36, 14, 52, 48, 28, 12]
  );
  addDataSheet(
    wb,
    'Excluded from auto-PR',
    [
      'ID',
      'Title',
      'ADO State',
      'Signal',
      'Exclusion detail',
      'PR link (if parsed)',
      'Test Page URL',
      'Area Path',
      'Severity',
    ],
    excludedRows,
    [11, 36, 14, 14, 40, 44, 52, 28, 12]
  );

  const realGaps = gaps.filter((g) => g[4] !== 'No tracked gaps detected.');
  await wb.xlsx.writeFile(outPath);
  console.log(`Wrote ${outPath} (${realGaps.length} in-cell gap hint(s), no Data quality tab)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
