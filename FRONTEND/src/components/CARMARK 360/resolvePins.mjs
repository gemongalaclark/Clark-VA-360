// Finds the map pin for every dealer in dealerList.js from its Google Maps link, and saves them in dealerPins.js.
// Run it again whenever you add or change a dealer:
//   node "FRONTEND/src/components/CARMARK 360/resolvePins.mjs"
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEALERS } from './dealerList.js';
import { pinFromMapsLink } from './carmarkRules.js';

/* Short links (maps.app.goo.gl) redirect to the full place link, which holds the pin */
async function fullLink(url) {
  if (!/goo\.gl|g\.co/.test(url)) return url;
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
  return res.headers.get('location') || url;
}

const pins = {};
const byLink = new Map();
for (const d of DEALERS) {
  if (!d.mapsUrl) { console.log(`  no link   ${d.name}`); continue; }
  byLink.set(d.mapsUrl, [...(byLink.get(d.mapsUrl) || []), d.name]);
  if (pins[d.mapsUrl]) continue;
  try {
    const pin = pinFromMapsLink(await fullLink(d.mapsUrl));
    if (pin) {
      pins[d.mapsUrl] = pin;
      console.log(`  pinned    ${d.name}  →  ${pin.place || 'map point'} (${pin.lat}, ${pin.lng})`);
    } else console.log(`  NOT FOUND ${d.name}: the link has no location in it`);
  } catch (e) {
    console.log(`  FAILED    ${d.name}: ${e.message}`);
  }
}
for (const [link, names] of byLink) {
  if (names.length > 1) console.log(`\n  CHECK: ${names.join(' and ')} use the same link (${link}), so they get the same pin.`);
}

const out = `/* Map pins for the dealers in dealerList.js, read from each dealer's Google Maps link.
   Made by resolvePins.mjs. Don't edit by hand: run it again after adding dealers. */

export const PINS = ${JSON.stringify(pins, null, 2)};
`;
writeFileSync(fileURLToPath(new URL('./dealerPins.js', import.meta.url)), out);
console.log(`\nSaved ${Object.keys(pins).length} pins to dealerPins.js`);
