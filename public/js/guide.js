/* Havasu Prep — Guide: trail intel, permits, rules, safety, contacts */
'use strict';

/* Contact numbers verified against official sources on 2026-09-26 (NPS, the Havasupai Tribe official FAQ, Coconino County, hospital listings). tel: links use digits only. */
const CONTACTS = [
  { name: 'Havasupai Tourist Office', sub: 'Trip questions. Reservations support is email only: info@havasupaireservations.com', num: '(928) 448 2121', tel: '+19284482121' },
  { name: 'Havasupai / BIA Police', sub: 'Law enforcement on the reservation, PO Box 62, Supai', num: '(928) 448 2891', tel: '+19284482891' },
  { name: 'Campground Rangers Office', sub: 'Rangers in the canyon near the campground', num: '(928) 448 2180', tel: '+19284482180' },
  { name: 'Grand Canyon Caverns Inn', sub: 'Permit check in, Mile Marker 115, Route 66, Peach Springs', num: '(928) 422 3223', tel: '+19284223223' },
  { name: 'Coconino County Sheriff', sub: 'Non emergency, search and rescue coordination', num: '(928) 774 4523', tel: '+19287744523' },
  { name: 'Tribal Cafe, Supai village', sub: 'Hours inconsistent, do not rely on it for meals', num: '(928) 448 2981', tel: '+19284482981' },
  { name: 'Havasupai Trading Company', sub: 'Village store, cards accepted with a $10 minimum', num: '(928) 448 2951', tel: '+19284482951' },
  { name: 'Kingman Regional Medical Center', sub: 'Nearest full hospital, about 2 hours from the trailhead', num: '(928) 757 2101', tel: '+19287572101' },
  { name: 'Flagstaff Medical Center', sub: 'Alternate hospital option toward Phoenix', num: '(928) 779 3366', tel: '+19287793366' },
  { name: 'Arizona road conditions', sub: 'ADOT, for Indian Road 18 and Route 66 conditions', num: '511', tel: '511' },
  { name: 'Poison Control', sub: 'US nationwide', num: '1 800 222 1222', tel: '+18002221222' },
];

const SECTIONS = [
  { id: 'hike', label: 'The Hike' },
  { id: 'permits', label: 'Permits' },
  { id: 'rules', label: 'Rules' },
  { id: 'safety', label: 'Safety' },
  { id: 'seasons', label: 'Seasons' },
  { id: 'contacts', label: 'Contacts' },
];

let GUIDE_SEC = 'hike';
RENDER.guide = function () {
  const seg = '<div class="seg-wrap"><div class="seg">' + SECTIONS.map((s) =>
    '<button class="' + (GUIDE_SEC === s.id ? 'active' : '') + '" data-gsec="' + s.id + '">' + s.label + '</button>').join('') + '</div></div>';
  return '<div class="pg-hd"><div class="pg-eyebrow">Guide</div>' +
    '<div class="pg-title">Know before you go.</div>' +
    '<div class="pg-sub">The essentials for a safe, respectful, enjoyable trip. When in doubt, the Tribe word is final.</div></div>' +
    seg + '<div class="card guide-sec" id="guide-body">' + guideBody() + '</div>';
};

RENDER.guide_mount = function () {
  $$('#panel [data-gsec]').forEach((b) => b.onclick = () => {
    GUIDE_SEC = b.dataset.gsec;
    $$('#panel [data-gsec]').forEach((x) => x.classList.toggle('active', x === b));
    $('#guide-body').innerHTML = guideBody();
    $('#guide-body').style.animation = 'none';
    void $('#guide-body').offsetWidth;
    $('#guide-body').style.animation = '';
  });
};

function guideBody() {
  switch (GUIDE_SEC) {
    case 'hike': return (
      '<h3>The trail, mile by mile</h3>' +
      '<p>Every step of this trip is on the Havasupai Reservation, and every visitor needs a permit. The trailhead is <b>Hualapai Hilltop</b>, at the end of Indian Road 18, about 60 miles from the Route 66 turnoff. There is no water, no shade, and no services at the trailhead, so arrive ready. Sleeping in cars at the trailhead is not allowed.</p>' +
      '<ul>' +
      '<li><b>Hilltop to Supai village:</b> 8 miles. The first 1.5 miles drop about 800 feet down steep rocky switchbacks, then the trail levels into a sandy wash.</li>' +
      '<li><b>Supai village to the campground:</b> 2 miles. Havasu Falls sits about a mile past the village, right before the campground.</li>' +
      '<li><b>Campground to Mooney Falls:</b> half a mile, ending in a steep descent down chains and ladders through a cliff tunnel. Gloves help.</li>' +
      '<li><b>Mooney Falls to Beaver Falls:</b> about 2.1 miles of creek crossings and ladders. A great day hike from camp.</li>' +
      '<li><b>Beaver Falls to the Confluence:</b> another 3.8 miles for the truly ambitious, where Havasu Creek meets the Colorado River.</li>' +
      '</ul>' +
      '<p>Net elevation change is about <b>2,000 feet</b> (5,200 at the hilltop, 3,205 in the village). Most hikers take <b>4 to 5 hours down</b> and <b>5 to 7 hours back up</b> with a full pack. There is <b>no water on the trail</b>, so carry at least 3 liters for the hike in, start at dawn, and save energy: the hike out climbs those switchbacks at the very end.</p>');
    case 'permits': return (
      '<h3>Permits and check in</h3>' +
      '<p>A <b>permit is required for every visitor</b>, booked only through <b>havasupaireservations.com</b>. No day hiking is allowed. Every booking is <b>4 days and 3 nights</b>, no more and no less. The 2026 campground price is <b>$455 per person</b> for the full stay, all permits, fees, and taxes included. Prices change by season, so confirm the current price when you book.</p>' +
      '<ul>' +
      '<li><b>Check in</b> at the Grand Canyon Caverns Inn, Mile Marker 115 on Route 66 near Peach Springs. You can check in the day before your hike or the morning of, and you may not start hiking until you have checked in.</li>' +
      '<li>Check in hours vary month to month. The Tribe emails the current hours before each trip, so watch for that email.</li>' +
      '<li>The trip leader, or one of up to two alternate trip leaders named at booking, must check in with <b>valid photo ID</b>. Bring your <b>license plate number</b> too, it is needed for the parking pass.</li>' +
      '<li>You will receive <b>wristbands and tags</b> at check in. Wear the wristband the whole trip.</li>' +
      '<li>Permits are <b>non transferable</b>. Buying, selling, or transferring bookings can get the booking canceled with no refund and a permanent ban.</li>' +
      '<li>Cancellation: <b>50 percent refund</b> if you cancel at least 90 days before the first day of the booking. Inside 90 days there is no refund.</li>' +
      '</ul>' +
      '<p>Book only through the official tribal site. Third party resellers are not legitimate and the Tribe does not honor them.</p>');
    case 'rules': return (
      '<h3>Reservation rules</h3>' +
      '<p>You are a guest in someone home. These rules are strict and enforced, with fines, immediate removal, and tribal court prosecution for violations, and no refunds.</p>' +
      '<ul>' +
      '<li><b>No alcohol or drugs</b> anywhere on the reservation, including the trailhead parking area. The reservation is dry.</li>' +
      '<li><b>No drones</b> or any aerial photography. Personal photos are fine, but do not photograph tribal members, homes, buildings, burial grounds, or sacred sites, and no commercial filming of any kind.</li>' +
      '<li><b>No pets</b>, including service animals and privately owned horses, anywhere on the reservation.</li>' +
      '<li><b>Pack out all trash.</b> If you carried it in, you carry it out to the trailhead, including partially used fuel canisters and worn out gear.</li>' +
      '<li><b>No campfires</b> or any other fires in the campground. Camp stoves are fine.</li>' +
      '<li><b>Do not dive or jump from the falls</b>, and do not climb the walls or the falls. Anyone caught jumping faces a $5,000 fine, a 10 year ban, immediate removal, and the rescue costs.</li>' +
      '<li>Stay on marked trails. Respect residents and their property. The village is a living community, not a theme park.</li>' +
      '</ul>' +
      '<h3>Mules and helicopter</h3>' +
      '<ul>' +
      '<li><b>Pack mules:</b> $400 round trip per mule, requested online at least 72 hours before arrival. One mule carries up to 4 bags, 32 lbs max per bag, soft sided only. Inbound bags go to the hilltop between 4 and 9 AM and arrive at camp between 2 and 5 PM.</li>' +
      '<li><b>Helicopter:</b> $300 one way per person, first come first served, tribal members get priority. It generally flies Sunday, Monday, Thursday, and Friday, but the schedule changes without notice and it may not fly for tourists at all. Do not plan around it.</li>' +
      '</ul>' +
      '<h3>Food in the canyon</h3>' +
      '<p>The village store and cafe have inconsistent hours and supply deliveries arrive by mule or helicopter, so <b>pack all the food you need for the entire trip</b>. Store food in odor proof bags or a bear canister, not because of bears, but because mice and squirrels will chew straight through your pack to reach it.</p>');
    case 'safety': return (
      '<div class="alert-card"><h4>Flash floods kill in this canyon</h4>' +
      '<p>Havasu Creek runs through a narrow canyon. During monsoon season (roughly <b>July through September</b>) storms many miles away can send a wall of water down the creek with almost no warning. Serious floods hit in 2018, 2019, 2022, and 2024, and the canyon can be closed immediately at any time. Never camp in the wash or creek bed. If you hear or see flood water approaching, or you are caught in a rainstorm, <b>get to high ground immediately</b> and wait until it clears. Do <b>not</b> hike past the top of Mooney Falls or enter narrow parts of the canyon when it is raining or flooding.</p></div>' +
      '<h3>Staying safe out there</h3>' +
      '<ul>' +
      '<li>Carry <b>at least 3 liters of water</b> for the hike in. There is no water on the trail between the trailhead and the village. Drinking water is available in Supai village and from a freshwater spring in the campground.</li>' +
      '<li>Filter or treat all creek water before drinking. The Tribe recommends filtering everything to be extra safe.</li>' +
      '<li>Start hiking <b>at or before dawn</b>. Summer temperatures can top 115 degrees, and the trails close when the temperature exceeds 115.</li>' +
      '<li>There is <b>essentially no cell service</b> past the trailhead, including the campground and most trails. Tell someone your plan and return date. In a life threatening emergency, dial 911 if you have any signal at all.</li>' +
      '<li>There are <b>no public medical facilities</b> in Supai village. The clinic there serves tribal members only, and an injury evacuation can take many hours or even days.</li>' +
      '<li>The Mooney Falls descent is exposed and slippery. Take your time, use the chains, wear shoes with grip.</li>' +
      '<li>Know the signs of heat exhaustion: headache, nausea, dizziness, stops sweating. Rest in shade, cool down, hydrate with electrolytes.</li>' +
      '</ul>' +
      '<p><b>Closure alerts</b> are posted on the Tribe official site, theofficialhavasupaitribe.com, and the Havasupai Tribe Tourism Facebook page. Check both in the days before your trip.</p>');
    case 'seasons': return (
      '<h3>When to go</h3>' +
      '<ul>' +
      '<li><b>Cooler months:</b> ideal for hiking and exploring, per the Tribe official FAQ. Spring and fall bring the best trail weather.</li>' +
      '<li><b>Warmer months:</b> ideal for being in the water. Peak season runs May through September, when temperatures can top 100 degrees and drop into the 50s at night. Plan hikes for early morning.</li>' +
      '<li><b>Monsoon season</b> (July through September) brings flash flood risk. Read the Safety tab before a summer trip.</li>' +
      '<li><b>Winter:</b> the Tribe is generally closed to tourism. Shoulder trips can be cold and may even see snow.</li>' +
      '</ul>' +
      '<p>The creek stays around <b>70 degrees year round</b>, swimmable even when the air is cool. Nights in the canyon run colder than the rim forecast suggests, so check the forecast for Supai specifically, not just the Grand Canyon. Pack layers for a big swing between midday and midnight in spring and fall.</p>' +
      '<p><b>Getting there:</b> after check in, drive about 60 miles up Indian Road 18 to Hualapai Hilltop (about 5 miles west of the Inn on Route 66). The road is paved but open range, with animals crossing, so allow at least 1.5 hours. Fuel up first: the nearest gas is 70 to 90 miles away in Peach Springs or Seligman, and there are no services at the trailhead.</p>');
    case 'contacts': return (
      '<h3>Numbers that matter</h3>' +
      '<p>Save these before you lose signal. In a true emergency on the trail, call 911 first if you have any signal at all.</p>' +
      CONTACTS.map((c) =>
        '<div class="contact-card"><div class="grow"><div class="t1">' + esc(c.name) + '</div>' +
        '<div class="t2">' + esc(c.sub) + '</div></div>' +
        '<a class="num" href="tel:' + c.tel + '">' + esc(c.num) + '</a></div>').join('') +
      '<p style="margin-top:14px">Numbers verified against official sources in September 2026. If one fails, ask at the tourist office in Supai village.</p>');
  }
  return '';
}
