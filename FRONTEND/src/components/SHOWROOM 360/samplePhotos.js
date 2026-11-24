/* Photos bundled with the site for the sample cars, in FRONTEND/public/images/showroom.
   All are from Wikimedia Commons under free licences, so their credits must stay with
   them: the car page shows the credit under each photo, and the footer lists them all.
   A sample photo's id is 'sample:<file name>'; a dealer's own photos keep their saved ids.
   Some cars mix photos of different cars of the same model to get all four angles
   (Clark's call, 2026-11-24). */

export const SAMPLE_PREFIX = 'sample:';
export const SAMPLE_ANGLES = ['front', 'back', 'left', 'right'];

/* file name (without .webp) → { author, license, licenseUrl, source } */
export const SAMPLE_CREDITS = {
  'avanza-2019-back': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2016_Toyota_Avanza_1.3_G_Automatic_(rear),_Central_Surabaya.jpg" },
  'avanza-2019-front': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2019_Toyota_Avanza_1.3_G_(front),_East_Surabaya.jpg" },
  'avanza-2019-left': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2019_Toyota_Avanza_1.3_G_(front_left),_East_Surabaya.jpg" },
  'avanza-2019-right': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2019_Toyota_Avanza_1.3_E_(front),_Batu_City.jpg" },
  'brv-2019-back': { author: "LuvsMG481", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2017_Honda_BR-V_i-VTEC_rear.jpg" },
  'brv-2019-front': { author: "LuvsMG481", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2017_Honda_BR-V_i-VTEC_front.jpg" },
  'brv-2019-left': { author: "RichardSummersault", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", source: "https://commons.wikimedia.org/wiki/File:Honda_BR-V_(Rear)_(2),_Jakarta,_Indonesia.jpg" },
  'brv-2019-right': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2017_Honda_BR-V_1.5_VX_in_Modern_Steel_Metallic,_front_right.jpg" },
  'city-2021-back': { author: "オーバードライブ83", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2022_Honda_City_1.5_GN2_(20220317)_02.jpg" },
  'city-2021-front': { author: "オーバードライブ83", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2022_Honda_City_1.5_GN2_(20220317)_01.jpg" },
  'city-2021-left': { author: "RL GNZLZ", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Honda_City_1.5_EX_2022.jpg" },
  'city-2021-right': { author: "RL GNZLZ from Chile", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", source: "https://commons.wikimedia.org/wiki/File:Honda_City_1.5_EX_2022_(rear).jpg" },
  'civic-2018-back': { author: "Elise240SX", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Honda_Civic_SE_Sedan_in_Lunar_Silver_Metallic,_rear_left,_2026-06-19.jpg" },
  'civic-2018-front': { author: "Elise240SX", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Honda_Civic_SE_Sedan_in_Lunar_Silver_Metallic,_front_left,_2026-06-19.jpg" },
  'civic-2018-left': { author: "Elise240SX", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2019_Honda_Civic_LX_Sedan_in_Modern_Steel_Metallic,_front_left,_2024-10-28.jpg" },
  'civic-2018-right': { author: "Ghostofakina", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Honda_Civic_(FC)_sedan,_12.1.18.jpg" },
  'fortuner-2018-back': { author: "Jirapat Chroenkeskij", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", source: "https://commons.wikimedia.org/wiki/File:2017-2018_Toyota_Fortuner_(AN160)_2.4_V_SUV_(22-03-2018)_06.jpg" },
  'fortuner-2018-front': { author: "Jirapat Chroenkeskij", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", source: "https://commons.wikimedia.org/wiki/File:2017-2018_Toyota_Fortuner_(AN160)_2.4_V_SUV_(22-03-2018)_05.jpg" },
  'fortuner-2018-left': { author: "M.rJirapat", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Toyota_Fortuner_(AN160)_rear.jpg" },
  'fortuner-2018-right': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2021_Toyota_Fortuner_2.4_VRZ_TRD_Sportivo_(rear),_Pakuwon_Mall,_West_Surabaya.jpg" },
  'hiace-2016-back': { author: "Judgefloro", license: "Public domain", licenseUrl: "", source: "https://commons.wikimedia.org/wiki/File:Toyota_HiAce_GL_Grandia_(rear).jpg" },
  'hiace-2016-front': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2016_Toyota_Hiace_3.0_GL_Grandia_in_Luxury_Pearl_Toning,_front_left.jpg" },
  'hiace-2016-left': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Toyota_Hiace_3.0_GL_Grandia_in_Luxury_Pearl_Toning,_front_left.jpg" },
  'hiace-2016-right': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2008_Toyota_Hiace_2.5_GL_Grandia_in_Luxury_Pearl_Toning,_front_right.jpg" },
  'montero-2017-back': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Mitsubishi_Montero_Sport_QF_2.4_GLS_2WD_Blade_Silver_Metallic_-_rear.jpg" },
  'montero-2017-front': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Mitsubishi_Montero_Sport_QF_2.4_GLS_2WD_Blade_Silver_Metallic_-_front.jpg" },
  'montero-2017-left': { author: "Alexander Migl", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Mitsubishi_Pajero_Sport_(3rd_generation)_1X7A0409.jpg" },
  'montero-2017-right': { author: "オーバードライブ83", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Mitsubishi_Pajero_Sport_Dakar_4x2_2.4_KR1W_(20190622).jpg" },
  'vios-2019-back': { author: "AIMHO'S REBELLION 8490s", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Toyota_Vios_1.5_5-speed_Manual_Facelift_rear_view.jpg" },
  'vios-2019-front': { author: "AIMHO'S REBELLION 8490s", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Toyota_Vios_1.5_5-speed_Manual_Facelift_front_view.jpg" },
  'vios-2019-left': { author: "Firzafp", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Toyota_Vios_(XP150)_(parked)_in_Palembang,_SS_(side,_left).jpg" },
  'vios-2019-right': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2023_Toyota_Vios_1.3_E_in_Alumina_Jade_Metallic,_front_right.jpg" },
  'vios-2021-back': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Toyota_Vios_NSP151_G_Prime_White_Pearl_-_rear.jpg" },
  'vios-2021-front': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Toyota_Vios_NSP151_G_Prime_White_Pearl_-_front.jpg" },
  'vios-2021-left': { author: "AIMHO'S REBELLION 8490s", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2021_Toyota_Vios_1.5J_MT_Super_White_rear_view_in_Brunei.jpg" },
  'vios-2021-right': { author: "AIMHO'S REBELLION 8490s", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2021_Toyota_Vios_1.5J_MT_Super_White_front_view_in_Brunei.jpg" },
  'wigo-2020-back': { author: "Judgefloro", license: "Public domain", licenseUrl: "", source: "https://commons.wikimedia.org/wiki/File:Toyota_Wigo_1.0_G_(rear).jpg" },
  'wigo-2020-front': { author: "Captainmorlypogi1959", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Toyota_Wigo_1.0_G_2019_with_2020_Front_Fascia_(4).jpg" },
  'wigo-2020-left': { author: "Captainmorlypogi1959", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Toyota_Wigo_1.0_G_2019_with_2020_Front_Fascia_(1).jpg" },
  'wigo-2020-right': { author: "Captainmorlypogi1959", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:Toyota_Wigo_1.0_G_2019_with_2020_Front_Fascia_(2).jpg" },
  'xpander-2020-back': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Mitsubishi_Xpander_Sport_(rear),_Citraland,_West_Surabaya.jpg" },
  'xpander-2020-front': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Mitsubishi_Xpander_Sport_(front),_Citraland,_West_Surabaya.jpg" },
  'xpander-2020-left': { author: "Alex Neman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2019_Mitsubishi_Xpander_GLS_(side),_Lenmarc_Mall,_West_Surabaya.jpg" },
  'xpander-2020-right': { author: "AIMHO'S REBELLION 8490s", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2020-21_Mitsubishi_Xpander_1.5_High_Spec_rear_view_in_Brunei.jpg" },
  'xpander-cross-2023-back': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2024_Mitsubishi_Xpander_Cross_1.5L_in_Green_Bronze_Metallic,_rear_right,_06-08-2024.jpg" },
  'xpander-cross-2023-front': { author: "Ethan Llamas", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2024_Mitsubishi_Xpander_Cross_1.5L_in_Green_Bronze_Metallic,_front_left,_06-08-2024.jpg" },
  'xpander-cross-2023-left': { author: "Andra Febrian", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2022_Mitsubishi_Xpander_Cross_(Indonesia)_rear_view.jpg" },
  'xpander-cross-2023-right': { author: "Andra Febrian", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:2022_Mitsubishi_Xpander_Cross_(Indonesia)_front_view.jpg" },
};

export const isSamplePhoto = (id) => typeof id === 'string' && id.startsWith(SAMPLE_PREFIX);
export const sampleCredit = (id) => (isSamplePhoto(id) && SAMPLE_CREDITS[id.slice(SAMPLE_PREFIX.length)]) || null;
export const samplePhotoUrl = (id) => (sampleCredit(id) ? `/images/showroom/${id.slice(SAMPLE_PREFIX.length)}.webp` : null);
/* the four photo ids of one sample car, cover first */
export const samplePhotoSet = (slug) => SAMPLE_ANGLES.map(a => `${SAMPLE_PREFIX}${slug}-${a}`);
