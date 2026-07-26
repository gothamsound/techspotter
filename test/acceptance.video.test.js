// Brief §8.7: video categories are correct; FaceTime overlaps Sound
// (phone) and Video (video-playback) by design.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';

async function spotted() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. LIVING ROOM - NIGHT')
    .blank()
    .action('ON THE TV: a newscast.')
    .blank()
    .cue('VICTOR')
    .dialogue('Turn it up.')
    .blank()
    .slug('INT. BEDROOM - NIGHT')
    .blank()
    .action('INSERT - PHONE SCREEN: a text from MOM.')
    .blank()
    .cue('DANA')
    .dialogue('She never texts first.')
    .blank()
    .slug('INT. VAN - NIGHT')
    .blank()
    .action('They huddle around the laptop, watching the footage.')
    .blank()
    .cue('VICTOR')
    .dialogue('Play it again.')
    .blank()
    .slug('INT. HALLWAY - DAY')
    .blank()
    .action('She FaceTimes Dana from the hallway.')
    .blank()
    .cue('DANA')
    .dialogue('This better be good.');
  const parsed = parseShow(await extractRuns(sp.build()));
  return spotShow(parsed, { sourceDoc: 'fixture.pdf' });
}

test('video: phone-screen, tv-screen, video-playback categories', async () => {
  const spot = await spotted();
  const byScene = (id) => spot.video.moments.filter((m) => m.scene === id);

  assert.equal(byScene('1')[0].category, 'tv-screen');
  assert.equal(byScene('2')[0].category, 'phone-screen');
  assert.match(byScene('2')[0].snippet, /PHONE SCREEN: a text from MOM/);
  assert.equal(byScene('3')[0].category, 'video-playback');
});

test('video: FaceTime is phone (sound) AND video-playback (video)', async () => {
  const spot = await spotted();
  const sound4 = spot.sound.moments.filter((m) => m.scene === '4');
  const video4 = spot.video.moments.filter((m) => m.scene === '4');
  assert.ok(sound4.some((m) => m.category === 'phone'));
  assert.ok(video4.some((m) => m.category === 'video-playback'));
  assert.ok(sound4[0].characters.includes('DANA'));
});
