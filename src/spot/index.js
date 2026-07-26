// The department scan: parsed show in, sound + video moment lists out.
// Pure module; the UI renders and the operator rules.

import { spotSound } from './sound.js';
import { spotVideo } from './video.js';

export function spotShow(parsed, opts = {}) {
  return {
    sound: spotSound(parsed, opts),
    video: spotVideo(parsed, opts),
  };
}
