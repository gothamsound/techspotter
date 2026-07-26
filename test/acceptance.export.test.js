// Brief §8.9: CSV/XLSX cell values match the grid including operator
// edits and dismissed flags. XLSX goes through the actual vendored
// SheetJS build (write -> read back).

import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from '../vendor/sheetjs/xlsx.mjs';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';
import { toggleSpeaker, cycleCell } from '../src/parser/edits.js';
import { matrixRows, matrixCsv, momentRows } from '../src/export/grid.js';

async function edited() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. LAB - NIGHT')
    .blank()
    .action('Victor works. Dana watches from the doorway. A KNOCK; he flinches.')
    .blank()
    .cue('VICTOR')
    .dialogue('Almost there.')
    .blank()
    .slug('EXT. ROOF - DAWN')
    .blank()
    .cue('DANA')
    .dialogue('He was here.');
  const parsed = parseShow(await extractRuns(sp.build()));
  const spot = spotShow(parsed, { sourceDoc: 'f.pdf' });
  toggleSpeaker(parsed, '2', 'VICTOR'); // operator adds VICTOR to scene 2
  cycleCell(parsed, '1', 'DANA'); // suggested -> confirmed present
  spot.sound.moments[0].dismissed = true; // operator dismisses the KNOCK
  return { parsed, spot };
}

test('grid rows match the edited grid: S / P cells and counts', async () => {
  const { parsed } = await edited();
  const rows = matrixRows(parsed);
  const head = rows[0];
  const s1 = rows[1];
  const s2 = rows[2];
  const col = (name) => head.indexOf(name);

  assert.equal(s1[col('VICTOR')], 'S');
  assert.equal(s1[col('DANA')], 'P');
  assert.equal(s2[col('VICTOR')], 'S');
  assert.equal(s2[col('DANA')], 'S');
  assert.equal(s1[col('speaking')], 1);
  assert.equal(s1[col('present')], 1);

  const csv = matrixCsv(parsed);
  assert.match(csv.split('\r\n')[1], /,S,P$/);
});

test('moment rows carry the dismissed flag; XLSX round-trips values', async () => {
  const { parsed, spot } = await edited();
  const sound = momentRows(spot.sound.moments);
  assert.equal(sound[1][sound[0].indexOf('dismissed')], 'true');

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrixRows(parsed)), 'Matrix');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sound), 'Sound');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(momentRows(spot.video.moments)), 'Video');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const back = XLSX.read(buf, { type: 'buffer' });
  assert.deepEqual(back.SheetNames, ['Matrix', 'Sound', 'Video']);
  const matrix = XLSX.utils.sheet_to_json(back.Sheets.Matrix, { header: 1 });
  assert.equal(matrix[1][matrix[0].indexOf('VICTOR')], 'S');
  assert.equal(matrix[1][matrix[0].indexOf('DANA')], 'P');
  const soundBack = XLSX.utils.sheet_to_json(back.Sheets.Sound, { header: 1 });
  assert.equal(soundBack[1][soundBack[0].indexOf('dismissed')], 'true');
});
