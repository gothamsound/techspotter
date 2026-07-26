// Brief §8.8: a zero-scene document (a novel) fails loudly, never an
// empty matrix. An empty/imageonly PDF gets its own plain failure.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow, ParseError } from '../src/parser/parse.js';

function novelFixture() {
  const sp = new Screenplay();
  sp.page()
    .action(
      'The night was cold when Marta finally reached the station.',
      'She had walked eleven miles through the sleet, and her hands',
      'were past feeling. Past the shuttered ticket office she went,',
      'past the men sleeping under newsprint.',
    )
    .blank()
    .action('INTO THE NIGHT')
    .blank()
    .action(
      'The morning brought no relief, only a paler shade of the same',
      'gray, and the distant sound of a train that never came.',
    );
  return sp.build();
}

function emptyFixture() {
  const sp = new Screenplay();
  sp.page();
  return sp.build();
}

test('novel manuscript: loud zero-scene failure', async () => {
  const pages = await extractRuns(novelFixture());
  assert.throws(
    () => parseShow(pages),
    (err) =>
      err instanceof ParseError &&
      err.code === 'zero-scenes' &&
      /No scenes found/.test(err.message),
  );
});

test('empty PDF: loud no-text failure', async () => {
  const pages = await extractRuns(emptyFixture());
  assert.throws(
    () => parseShow(pages),
    (err) => err instanceof ParseError && err.code === 'no-text',
  );
});
