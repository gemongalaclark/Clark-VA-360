/* Checks made for one generation, shown first on the Checklist page, above the checks
   every used car needs. Ids are stored on the phone, so keep them stable.
   Shared lines are written once here and reused. */

const CVT_DRIVE = ['cvt', 'Pull away gently from a stop, then accelerate slowly to 60 km/h. The CVT should feel smooth and quiet: shudder, a whine that rises with speed, or a delay before it moves means old fluid or a worn CVT.'];
const CVT_FLUID = ['cvtfluid', 'Ask for the receipt of the last CVT fluid change (usually every 40,000–50,000 km). “Never changed” on a high-mileage unit is a bargaining point.'];
const FLEET_WEAR = ['fleetwear', 'Compare the odometer with the shine on the steering wheel, the worn driver-seat bolster and the pedal rubbers. Heavy wear with low mileage means the odometer was rolled back.'];
const GRAB_MARKS = ['grabmarks', 'Look for Grab/TNVS sticker marks on the windows, extra phone-mount holes on the dash and dashcam or tracker wiring: signs of ride-hailing use.'];
const RENTAL = ['rental', 'Ask if it was ever a rent-a-car unit. Rental cars are driven hard by many people and are often sold with “fresh” papers.'];
const REARAC = ['rearac', 'Rear A/C: turn it on at every fan speed. It should blow cold to the second and third rows within a few minutes.'];
const THIRD_ROW = ['thirdrow', 'Fold and unfold the second and third rows. Every latch locks, and every seat belt pulls out and clicks in, in all seven seats.'];
const REVCAM = ['revcam', 'Shift into reverse: the camera picture is clear (no fog or lines) and the guide lines show.'];
const CAM360 = ['cam360', '360° camera: check the front, side and rear views one by one. A blank or misty view means a damaged camera, often after a flood or a side-mirror hit.'];
const CARPLAY = ['carplay', 'Plug in your own phone: Apple CarPlay or Android Auto connects, and calls and music play through the speakers.'];
const LED_LAMPS = ['ledlamps', 'LED headlights: both sides light up evenly with no flicker or droplets inside. A replacement LED unit costs far more than a halogen bulb.'];
const TIMING_CHAIN = ['chain', 'This engine has a timing chain (no belt to replace). On a cold start, a rattle that lasts more than a second or two needs a mechanic to check the chain tensioner.'];
const AC_COLD = ['accold', 'Let it idle with the A/C on high for ten minutes in the sun. It should stay cold, and the engine fan should not roar non-stop.'];
const MOUNTS = ['mounts', 'In Drive with your foot on the brake, feel the steering wheel and seat. Strong shaking means worn engine mounts.'];
const UNDERSIDE = ['underside', 'Crouch down and look under the front bumper, the side skirts and the floor for scrapes, cracks and fresh black paint hiding rust or repairs.'];
const KNOCKS = ['knocks', 'Drive slowly over humps and rough roads with the windows down. Knocks from the front usually mean worn stabilizer links or bushings.'];
const BRAKE_JUDDER = ['judder', 'Brake firmly from 60–80 km/h. A shaking steering wheel means warped front discs: cheap to fix, but a good bargaining point.'];
const AT4 = ['at4', 'Drive it warm through all four gears. Shifts should be clean: flaring revs between gears, slipping on an uphill or a late, harsh downshift means a worn 4-speed automatic.'];
const ATF = ['atf', 'Ask when the automatic transmission fluid was last changed. On a high-mileage unit with no record, budget for a fluid service.'];
const NEW_WHY = ['why', 'Ask why a nearly new car is being sold, and check the sales invoice date against what the seller says.'];
const NEW_LOAN = ['loan', 'If the CR says “encumbered”, the bank still owns it. Deal through the bank: get its written consent or the release of chattel mortgage before paying.'];
const NEW_RUST = ['newrust', 'A car this young should have no rust at all. Any rust on the seat rails, bolts under the dash or the spare-tyre well means flood water, most likely Typhoon Tino (November 2025).'];
const ACCESSORIES = ['extras', 'List what is included: tint, dashcam, matting, seat covers, spare key. Make sure the deed of sale or receipt says so.'];
const HYBRID_READY = ['ready', 'Hybrid: press start. Only the “READY” light should come on, with no hybrid system warning. It should move off silently on electric power at low speed.'];
const HYBRID_DEALER = ['hybridcheck', 'Book a hybrid system health check at the brand’s dealer before paying. Confirm the hybrid battery warranty still runs and moves to you.'];
const TURBO_DIESEL_SMOKE = ['smoke', 'Watch the exhaust on a cold start and under full throttle in 2nd gear. A puff is normal; heavy black, white or blue smoke is not.'];
const BLOWBY = ['blowby', 'With the engine idling, open the oil filler cap. Strong smoke puffing out means a worn engine.'];
const DIESEL_FUEL = ['fuelfilter', 'Ask when the diesel fuel filter was last changed. If the water-in-fuel light has ever come on, the filter must be drained or replaced.'];
const AIRBOX = ['airbox', 'Open the air filter box. Water marks, mud or a soaked filter mean the engine may have sucked in flood water. Walk away.'];
const VIN_RECALL = (brand) => ['recall', `Give the VIN to a ${brand} dealer and ask about open recalls, remaining warranty and service history in their system.`];
const OIL_DILUTION = ['oildilution', 'Pull the dipstick. Oil above the full mark or smelling of gasoline means fuel is getting into the oil (oil dilution) on this 1.5 turbo.'];
const TOW_4X4 = ['fourwd', '4x4: on loose ground, shift into 4H, then 4L, and back. The dash lights should change without flashing, and it should drive off without clunks or binding.'];

export const GEN_CHECKS = {
  /* ───────── Mitsubishi Xpander ───────── */
  'xpander-2018': {
    intro: 'The early Xpander had a fuel-pump recall and many were ex-Grab units. Prove the recall was done and the mileage is real.',
    items: [
      ['fuelpump', 'Ask a Mitsubishi dealer to check the VIN: units sold May 2018 to October 2019 were recalled for a faulty fuel pump. Get proof the recall work was done.'],
      ['hardstart', 'Ask the seller not to start it before you arrive. Start it cold, twice. Long cranking or a stall points to the fuel pump or a fuse.'],
      AT4, ATF,
      ['clutch', 'GLX manual: the clutch should bite near the middle of the pedal and not slip on an uphill start.'],
      BRAKE_JUDDER, KNOCKS, THIRD_ROW, REARAC, FLEET_WEAR, GRAB_MARKS,
      ['cross', 'Xpander Cross and GLS Sport: check the plastic cladding, skid plates and low bumper lips for cracks. Body-kit parts are costly to replace.'],
    ],
  },
  'xpander-2022': {
    intro: 'Still young, so warranty and PMS records matter, but many were already worked hard as Grab and fleet cars.',
    items: [
      VIN_RECALL('Mitsubishi'),
      ['pms', 'The PMS booklet should have Mitsubishi dealer stamps at every interval. Skipped services can void the remaining warranty.'],
      AT4, KNOCKS, BRAKE_JUDDER, REVCAM, LED_LAMPS, THIRD_ROW, REARAC, FLEET_WEAR, GRAB_MARKS,
      ['cross', 'Xpander Cross: look under the front and rear for scrapes on the skid plates, a sign it was driven off-road.'],
    ],
  },
  'xpander-2026': {
    intro: 'A near-new car. The main risks are a hidden flood history and an unpaid bank loan.',
    items: [
      NEW_WHY, NEW_LOAN, NEW_RUST, VIN_RECALL('Mitsubishi'),
      ['pms', 'The early PMS visits should be stamped by a Mitsubishi dealer in the booklet.'],
      CAM360, CARPLAY, AT4, ACCESSORIES,
    ],
  },

  /* ───────── Toyota Fortuner ───────── */
  'fortuner-2012': {
    intro: 'Old-shape diesel Fortuners live or die by their injectors, timing belt and flood history. Inspect the engine bay closely.',
    items: [
      ['timingbelt', '2.5 and 3.0 diesel: ask for the receipt of the last timing belt replacement (usually around 100,000 km). No proof means budgeting for one now. The 2.7 gas uses a chain.'],
      ['injectors', 'Cold start: listen for loud knocking and watch for heavy smoke. Worn injectors on the 2KD/1KD are expensive. Ask for injector service receipts.'],
      TURBO_DIESEL_SMOKE, BLOWBY, AIRBOX,
      ['intercooler', 'Look at the intercooler and its hoses on top of the engine: oily residue is normal wear, but mud or a water line means flood water.'],
      AT4, TOW_4X4,
      ['chassis', 'Look under the car at the chassis rails, rear floor and rear suspension mounts for heavy rust, especially on units from coastal towns.'],
      ['steering', 'Turn the wheel lock to lock with the engine on: no whine from the power steering pump and no fluid leaks underneath.'],
      REARAC,
    ],
  },
  'fortuner-2016': {
    intro: 'The most-flooded SUV type in Cebu. Check the flood signs twice, then the diesel and the 6-speed automatic.',
    items: [
      AIRBOX,
      ['floodrows', 'Lift the floor mats in all three rows and check the third-row seat anchors and the cargo floor for silt or rust.'],
      ['ecu', 'Look at the fuse boxes under the dash and in the engine bay for green or white crust on the plugs.'],
      TURBO_DIESEL_SMOKE,
      ['egr', 'A lumpy idle or black smoke when you floor it can mean a clogged intake and EGR from city driving. Ask when it was last cleaned.'],
      DIESEL_FUEL, TIMING_CHAIN,
      ['shudder', 'Drive between 40 and 70 km/h with light throttle. A shudder or bump can mean old ATF or torque-converter wear.'],
      TOW_4X4,
      ['tailgate', '2.8 V: the power tailgate opens and closes fully from the key, the driver’s button and the tailgate button.'],
      REARAC,
    ],
  },
  'fortuner-2021': {
    intro: 'Young, expensive and often still financed. Clear the papers and the flood history before you look at the engine.',
    items: [
      NEW_LOAN,
      ['claim', 'Ask the seller’s insurer whether a flood or total-loss claim was ever filed on this plate.'],
      NEW_RUST, VIN_RECALL('Toyota'),
      ['tss', 'Q, LTD and GR Sport: test adaptive cruise on the highway and make sure the lane departure alert beeps. No safety-system warning on the dash.'],
      ['windshield', 'Ask if the windshield was ever replaced. The Toyota Safety Sense camera behind it must be recalibrated afterwards.'],
      CAM360, TOW_4X4,
      ['tailgate', 'The power tailgate opens and closes fully from the key, the driver’s button and the tailgate button.'],
      CARPLAY,
      ['shudder', 'Drive between 40 and 70 km/h with light throttle. A shudder or bump can mean torque-converter wear.'],
    ],
  },

  /* ───────── Mitsubishi Montero Sport ───────── */
  'montero-2008': {
    intro: 'The old-shape Montero is tough, but its timing belts and the flood risk can make it a money pit.',
    items: [
      ['timingbelt', '2.5 (4D56): ask for the receipt for both the timing belt and the balance-shaft belt. No proof means budgeting for both now.'],
      ['injectors', '3.2 (4M41): watch a cold start for heavy smoke and listen for knocking. Injector work on this engine is costly.'],
      TURBO_DIESEL_SMOKE, BLOWBY, AIRBOX,
      ['interlock', 'With the engine on, the shifter must not leave Park unless you press the brake. Idle should stay steady with the A/C on.'],
      ['at', 'Automatic: shifts should be smooth when warm, with no slipping on an uphill.'],
      TOW_4X4,
      ['rust', 'Check the chassis, the rear floor and around the tailgate hinges for rust.'],
      REARAC,
    ],
  },
  'montero-2016': {
    intro: 'The 4N15 diesel and 8-speed automatic are good when serviced. Proof of service is what you are buying.',
    items: [
      ['valves', 'Ask for proof the 4N15 valve clearances were checked at the scheduled interval, by a Mitsubishi dealer or a mechanic who knows this engine.'],
      ['at8', '8-speed automatic: shifts should be quick and smooth. Harsh or late shifts, or a gear warning, need an OBD scan before you pay.'],
      ['volts', 'With the engine running, a voltmeter at the battery should read about 13.8–14.5 V. Lower means the alternator is failing.'],
      TURBO_DIESEL_SMOKE, TIMING_CHAIN, AIRBOX,
      ['superselect', 'GT 4WD: shift through 2H, 4H, 4HLc and 4LLc on loose ground, then try the rear diff lock. The dash lights should stop flashing each time.'],
      ['gtsafety', 'GT: the blind spot lights in the mirrors work, and the power tailgate opens and closes fully.'],
      REVCAM, REARAC,
      ['rust', 'Inspect the chassis and underbody for heavy rust.'],
    ],
  },
  'montero-2020': {
    intro: 'Watch for flood damage on the electronics-heavy GT variants and for heavy fleet use on the base trims.',
    items: [
      AIRBOX,
      ['sensors', 'GT: walk around the car with the engine on. Every camera, parking sensor and driver-assist warning should work: flood water kills these first.'],
      CAM360,
      ['at8', '8-speed automatic: shifts should be quick and smooth. Harsh or late shifts, or a gear warning, need an OBD scan before you pay.'],
      ['valves', 'Ask for proof the 4N15 valve clearances were checked at the scheduled interval.'],
      ['superselect', 'GT 4WD: shift through 2H, 4H, 4HLc and 4LLc on loose ground, then try the rear diff lock. The dash lights should stop flashing each time.'],
      ['tailgate', 'GT: the power tailgate opens and closes fully.'],
      CARPLAY, FLEET_WEAR, GRAB_MARKS,
    ],
  },
  'montero-2024': {
    intro: 'Nearly new and usually financed. Most of the risk is in the papers.',
    items: [
      NEW_WHY, NEW_LOAN, NEW_RUST, VIN_RECALL('Mitsubishi'),
      ['adas', 'Black Series: test adaptive cruise and the forward collision warning on the highway, and the blind spot lights in the mirrors.'],
      CAM360,
      ['superselect', 'Black Series 4WD: shift through 2H, 4H, 4HLc and 4LLc on loose ground, and try the rear diff lock.'],
      ['paddles', 'Automatic: try the paddle shifters. They should change gear quickly in manual mode.'],
      ['tailgate', 'Black Series: the power tailgate opens and closes fully.'],
      ACCESSORIES,
    ],
  },

  /* ───────── Toyota Vios ───────── */
  'vios-2013': {
    intro: 'Many white Vios of this era were taxis and Grab cars. Check how it was used first, then the transmission.',
    items: [
      ['taxi', 'Look for patched holes in the roof (taxi sign), meter wiring under the dash and “for hire” in the CR history.'],
      FLEET_WEAR, GRAB_MARKS,
      ['trans', 'Find out which gearbox it has: the 4-speed automatic (up to 2015) should shift cleanly; the CVT (2016 on) should pull away smoothly with no whine.'],
      ATF,
      ['trunk', 'Lift the trunk mat and the spare tyre: rust, silt or a water line there means flood water.'],
      AC_COLD, MOUNTS, KNOCKS,
      ['repaint', 'Check every panel for paint mismatch and uneven gaps. Taxis and Grab cars pick up many small accident repairs.'],
    ],
  },
  'vios-2018': {
    intro: 'A favourite Grab car. Prove the mileage, then check the CVT carefully.',
    items: [
      FLEET_WEAR, GRAB_MARKS,
      ['odometer', 'Compare the PMS booklet mileage with the odometer. A ride-hailing Vios can do 60,000 km a year, so a 2018 unit with 40,000 km is suspicious.'],
      CVT_DRIVE, CVT_FLUID,
      ['trunk', 'Lift the trunk mat and the spare tyre: rust, silt or a water line means flood water.'],
      AC_COLD, MOUNTS, KNOCKS,
      ['repaint', 'Check every panel for paint mismatch and uneven gaps from small accident repairs.'],
    ],
  },
  'vios-2020': {
    intro: 'Plenty of ex-Grab units, and late ones may have been flooded in Typhoon Tino. Check use, flood signs and the CVT.',
    items: [
      FLEET_WEAR, GRAB_MARKS, CVT_DRIVE, CVT_FLUID,
      ['trunk', 'Lift the trunk mat and the spare tyre: rust, silt or a water line means flood water.'],
      REVCAM, AC_COLD, KNOCKS,
      ['grs', 'GR-S: check the low body kit and 17-inch wheels for scrapes and curb rash, and try the paddle shifters.'],
      VIN_RECALL('Toyota'),
    ],
  },
  'vios-2025': {
    intro: 'Very few are on the used market. Find out why this one is, and have Toyota check the hybrid if it is an HEV.',
    items: [
      NEW_WHY, NEW_LOAN, NEW_RUST, VIN_RECALL('Toyota'),
      HYBRID_READY, HYBRID_DEALER, CVT_DRIVE, CARPLAY, ACCESSORIES,
    ],
  },

  /* ───────── Toyota Wigo ───────── */
  'wigo-2014': {
    intro: 'Cheap, simple and often abused as a rental or first car. Check for city scrapes, worn mounts and flood signs.',
    items: [
      ['shake', 'A three-cylinder shakes a little at idle, and that is normal. Strong vibration through the whole cabin means worn engine mounts.'],
      ['at', 'Automatic: shifts should be clean without slipping. Manual: the clutch should bite near the middle of the pedal.'],
      ATF, RENTAL,
      ['floor', 'The Wigo sits very low. Lift the floor mats and check for silt, and look for rust on the seat rails.'],
      UNDERSIDE, KNOCKS, AC_COLD, TIMING_CHAIN,
      ['trds', 'TRD S: check the body kit for cracks and the reverse camera for a clear picture.'],
    ],
  },
  'wigo-2023': {
    intro: 'Young, but many are already rentals or ride-hailing cars. Check the CVT and the warranty.',
    items: [
      CVT_DRIVE, CVT_FLUID, VIN_RECALL('Toyota'), RENTAL,
      ['floor', 'It sits low: lift the floor mats and check for silt and rust on the seat rails.'],
      REVCAM, CARPLAY, UNDERSIDE, AC_COLD,
    ],
  },

  /* ───────── Toyota HiAce ───────── */
  'hiace-2005': {
    intro: 'Most old HiAces worked for a living. Check the use, the injectors and the timing belt before anything else.',
    items: [
      ['forhire', 'Check the CR for “for hire”, a franchise or a yellow-plate history (UV Express, school service, tours). Be very sceptical of low mileage.'],
      ['seats', 'Count the seats. The number must match what the CR says, or the LTO may not register the transfer.'],
      ['injectors', '3.0 (1KD): ask for an injector test before buying. Leaking or worn injectors cause rough running and smoke, and a set is very expensive.'],
      ['timingbelt', 'Ask for the receipt of the last timing belt replacement. A snapped belt wrecks the engine.'],
      ['underseat', 'The engine sits under the front seats. Lift the engine cover and look for silt, rust and water marks around the battery and fuse box.'],
      TURBO_DIESEL_SMOKE,
      ['overheat', 'Let it idle for 15 minutes with the A/C on. The temperature gauge must stay in the middle.'],
      ['clutch', 'Manual: the clutch should bite near the middle of the pedal and not slip when you pull away on an uphill.'],
      ['slidingdoor', 'Open and close the sliding door many times. Check its rails and the floor and sills under the door for rust.'],
      REARAC,
    ],
  },
  'hiace-2019': {
    intro: 'Many new-shape HiAces are company shuttles or tour vans. Check the use, the doors and the captain seats.',
    items: [
      ['forhire', 'Ask for the company or fleet service record, and check the CR for “for hire” or a franchise history.'],
      ['seats', 'Count the seats. The number must match what the CR says.'],
      FLEET_WEAR, TURBO_DIESEL_SMOKE, TIMING_CHAIN,
      ['at6', 'Automatic: shifts should be smooth and quick with a full load of passengers.'],
      ['slidingdoor', 'Open and close the sliding door many times. On the Super Grandia Elite, the power sliding door must open and close fully from every button.'],
      ['captain', 'Grandia captain seats: try every recline, slide and swivel. Flood water ruins the motors and wiring under them.'],
      REARAC,
      ['tyres', 'Check the tyre load rating on the sidewall. Vans need the right tyres when carrying passengers.'],
    ],
  },

  /* ───────── Toyota Avanza ───────── */
  'avanza-2012': {
    intro: 'A rear-wheel-drive workhorse often used for fleets and Grab. Check the rear axle, the 4-speed automatic and the mileage.',
    items: [
      FLEET_WEAR, GRAB_MARKS,
      ['axle', 'On the test drive, listen for a whine from the rear axle at a steady 60 km/h, and a clunk from under the car when you shift into Drive.'],
      AT4, ATF, KNOCKS, THIRD_ROW, REARAC,
      ['rust', 'Check the rear floor, the spare-tyre area under the car and the bottom of the tailgate for rust.'],
      TIMING_CHAIN,
    ],
  },
  'avanza-2022': {
    intro: 'Now front-wheel drive with a CVT. Many are already ex-Grab units.',
    items: [
      FLEET_WEAR, GRAB_MARKS, CVT_DRIVE, CVT_FLUID,
      ['gsafety', '1.5 G: the blind spot lights in the mirrors come on when a car passes, and no airbag or safety warning stays on.'],
      REVCAM, THIRD_ROW, REARAC, KNOCKS, VIN_RECALL('Toyota'),
    ],
  },

  /* ───────── Toyota Veloz ───────── */
  'veloz-2022': {
    intro: 'A dressed-up Avanza with a CVT. Check the CVT, the electronics on the V and any signs of fleet use.',
    items: [
      CVT_DRIVE, CVT_FLUID, FLEET_WEAR, GRAB_MARKS,
      ['vsafety', '1.5 V: test the blind spot lights, the lane departure alert and the 360° camera. No safety-system warning should stay on.'],
      ['autoac', 'The automatic climate control holds the temperature you set, front and rear.'],
      LED_LAMPS, THIRD_ROW, VIN_RECALL('Toyota'),
    ],
  },

  /* ───────── Hyundai Stargazer ───────── */
  'stargazer-2022': {
    intro: 'Hyundai’s long warranty is worth a lot here. Confirm it transfers, then check the IVT and the Premium electronics.',
    items: [
      ['warranty', 'Ask a Hyundai dealer to check the VIN: remaining warranty, on-time PMS and open recalls. Missed PMS can void the warranty.'],
      ['ivt', 'IVT (Hyundai’s CVT): pull away gently and drive slowly in traffic. Jerks, whining or slipping need a Hyundai check. Ask when the IVT fluid was last changed.'],
      FLEET_WEAR, GRAB_MARKS,
      ['captain', 'GLS Premium and Stargazer X: try every second-row captain seat adjustment and armrest.'],
      ['adas', 'GLS Premium and Stargazer X: test the blind spot lights, the lane keeping assist and the forward collision warning. No warning should stay on.'],
      CARPLAY, THIRD_ROW, REARAC,
      ['x', 'Stargazer X: check the skid plates and roof rails for damage.'],
    ],
  },
  'stargazer-2026': {
    intro: 'A near-new car. Check the papers, the warranty and the flood history.',
    items: [
      NEW_WHY, NEW_LOAN, NEW_RUST,
      ['warranty', 'Ask a Hyundai dealer to check the VIN: remaining warranty, PMS and open recalls.'],
      ['adas', 'Stargazer X Premium: test the blind spot lights and the driver-assist warnings.'],
      ['ivt', 'IVT (Hyundai’s CVT): pull away gently and drive slowly in traffic. It should be smooth, with no jerks or whining.'],
      CARPLAY, THIRD_ROW, ACCESSORIES,
    ],
  },

  /* ───────── Toyota Yaris Cross ───────── */
  'yariscross-2023': {
    intro: 'The hybrid battery and high-voltage wiring sit low, so a flooded hybrid is costly and unsafe. Have Toyota check it first.',
    items: [
      NEW_RUST, HYBRID_READY, HYBRID_DEALER,
      ['vent', 'Hybrid: find the hybrid battery air vent in the cabin and make sure it is not blocked or full of dust.'],
      ['ev', 'Hybrid: at low speed, press the EV mode button. It should drive on electric power alone for a short distance.'],
      CVT_DRIVE,
      ['tss', 'V and hybrids: test adaptive cruise, the lane trace assist and the blind spot lights. No safety-system warning should stay on.'],
      CAM360,
      ['tailgate', 'V and hybrids: the power tailgate opens and closes, including with the kick sensor under the rear bumper.'],
      ['sunroof', 'Hybrids: open and close the sunroof, and look for water stains on the headliner around it.'],
      VIN_RECALL('Toyota'),
    ],
  },

  /* ───────── Honda City ───────── */
  'city-2014': {
    intro: 'A popular Grab sedan with a Honda CVT. Prove the mileage and check the CVT.',
    items: [
      FLEET_WEAR, GRAB_MARKS, CVT_DRIVE, CVT_FLUID,
      ['trunk', 'Lift the trunk mat and the spare tyre: rust, silt or a water line means flood water.'],
      ['vx', 'VX and VX+ Navi: try the paddle shifters, cruise control and the touchscreen navigation.'],
      AC_COLD, MOUNTS, KNOCKS, TIMING_CHAIN,
    ],
  },
  'city-2020': {
    intro: 'Often a Grab car in the S and V trims. Check the CVT and how it was used.',
    items: [
      FLEET_WEAR, GRAB_MARKS, CVT_DRIVE, CVT_FLUID,
      ['trunk', 'Lift the trunk mat and the spare tyre: rust, silt or a water line means flood water.'],
      REVCAM, CARPLAY,
      ['rs', 'RS and Hatchback RS: check the body kit and 16-inch wheels for scrapes, and try the paddle shifters.'],
      AC_COLD, VIN_RECALL('Honda'),
    ],
  },
  'city-2023': {
    intro: 'A young car. Check the warranty, the CVT and the flood history.',
    items: [
      VIN_RECALL('Honda'),
      ['pms', 'The PMS booklet should have Honda dealer stamps at every interval.'],
      CVT_DRIVE, NEW_RUST, REVCAM, CARPLAY,
      ['rs', 'RS: check the body kit and wheels for scrapes, and try the paddle shifters.'],
      FLEET_WEAR,
    ],
  },

  /* ───────── Honda Civic ───────── */
  'civic-2016': {
    intro: 'Loved by enthusiasts, so many were modified or driven hard. Look for tuning and accident repairs.',
    items: [
      ['mods', 'RS Turbo: look for an aftermarket intake, exhaust, blow-off valve or lowered springs, and ask directly about an ECU remap. A tuned turbo and CVT wear out faster.'],
      OIL_DILUTION,
      ['boost', 'RS Turbo: accelerate hard from 40 km/h. It should pull strongly and smoothly, without hesitation, whistling or a check-engine light.'],
      CVT_DRIVE, CVT_FLUID,
      ['ac', 'Run the A/C for ten minutes. The 2016–2018 Civic is known abroad for leaking A/C condensers, so it should stay cold.'],
      ['accident', 'Check panel gaps, paint mismatch and overspray on rubber seals, and the low front lip for cracks.'],
      ['sunroof', 'RS: open and close the sunroof, and look for water stains on the headliner.'],
      UNDERSIDE,
    ],
  },
  'civic-2022': {
    intro: 'Every variant is a turbo, and many are still financed. Check the papers, the oil and the driver-assist systems.',
    items: [
      NEW_LOAN, VIN_RECALL('Honda'), OIL_DILUTION,
      ['mods', 'Ask about any tune or aftermarket parts. They can void the remaining warranty.'],
      ['sensing', 'Test the Honda Sensing adaptive cruise and lane keeping on the highway. No warning should stay on.'],
      ['windshield', 'Ask if the windshield was ever replaced. The Honda Sensing camera behind it must be recalibrated afterwards.'],
      NEW_RUST,
      ['wheels', 'Check the 17- and 18-inch wheels for curb rash and the tyres for uneven wear.'],
      HYBRID_READY,
    ],
  },

  /* ───────── Honda BR-V ───────── */
  'brv-2017': {
    intro: 'A family crossover often used as a Grab car. Check the CVT, the third row and the mileage.',
    items: [
      CVT_DRIVE, CVT_FLUID, FLEET_WEAR, GRAB_MARKS, THIRD_ROW, AC_COLD, KNOCKS,
      ['floor', 'Lift the floor mats in every row and the cargo floor. Look for silt or rust.'],
      TIMING_CHAIN,
    ],
  },
  'brv-2022': {
    intro: 'Young and often still under warranty. Check the CVT, the Honda Sensing on the VX and the flood history.',
    items: [
      VIN_RECALL('Honda'),
      ['pms', 'The PMS booklet should have Honda dealer stamps at every interval.'],
      CVT_DRIVE, NEW_RUST,
      ['sensing', 'VX: test adaptive cruise, lane keeping and the collision warning. No warning should stay on.'],
      REVCAM, CARPLAY, THIRD_ROW, FLEET_WEAR,
    ],
  },

  /* ───────── Honda CR-V ───────── */
  'crv-2018': {
    intro: 'The 1.6 diesel is frugal but fussy when driven only in the city. Check the DPF, the oil level and the 9-speed automatic.',
    items: [
      ['dpf', 'Ask how it was driven. Short city trips clog the diesel particulate filter. An OBD scan should show no DPF warnings.'],
      ['oillevel', 'Pull the dipstick. A level above the full mark means diesel is getting into the oil from DPF regeneration.'],
      ['at9', '9-speed automatic: some low-speed jerkiness is normal; harsh clunks or a gear warning are not.'],
      ['quote', 'Diesel CR-V parts cost more than Toyota diesels. Get a Honda service quote before you buy.'],
      AIRBOX,
      ['awd', 'SX AWD: on a wet or loose surface, pull away firmly. It should not spin a front wheel or make a clunk.'],
      ['tailgate', 'SX: the power tailgate opens and closes fully.'],
      ['sunroof', 'SX: open and close the sunroof and look for water stains on the headliner.'],
      THIRD_ROW, CARPLAY,
    ],
  },
  'crv-2024': {
    intro: 'Expensive and usually financed. Clear the papers first, then check the turbo or the hybrid.',
    items: [
      NEW_LOAN, VIN_RECALL('Honda'), NEW_RUST, OIL_DILUTION, HYBRID_READY,
      ['hybridcheck', 'RS e:HEV: book a hybrid system health check at Honda and confirm the hybrid battery warranty moves to you.'],
      ['sensing', 'Test the Honda Sensing adaptive cruise, lane keeping and collision warning. No warning should stay on.'],
      ['tailgate', 'The power tailgate opens and closes fully.'],
      ['thirdrow', 'V and VX (7 seats): fold and unfold the third row, and check every seat belt clicks in.'],
      ['awd', 'VX AWD: pull away firmly on a wet or loose surface. No wheel spin or clunks.'],
    ],
  },

  /* ───────── Honda Brio ───────── */
  'brio-2019': {
    intro: 'A small city car, often a first car or a rental. Check for scrapes, the CVT and flood signs.',
    items: [
      CVT_DRIVE, CVT_FLUID, RENTAL,
      ['floor', 'It sits low: lift the floor mats and check for silt and rust on the seat rails.'],
      UNDERSIDE, KNOCKS, AC_COLD, MOUNTS,
      ['rs', 'RS: check the body kit for cracks. Refreshed RS units (2023 on) should have LED headlights and Apple CarPlay/Android Auto.'],
    ],
  },
};
