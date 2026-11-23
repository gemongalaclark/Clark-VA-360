/* Trusted secondhand car dealers in Cebu, shown on the Dealers page.

   Add one { ... } block per dealer inside the [ ] below, separated by commas.
   Only name, area and address are required; leave out any line you don't have.

   How to get a dealer's pin from Google Maps:
   1. Find the dealer on Google Maps.
   2. Right-click (on a phone: press and hold) exactly on the shop. The first line of the
      menu is two numbers like 10.33945, 123.93456. Click it to copy them.
   3. Paste the first number as lat and the second as lng.
   Or, instead of the pin, press "Share" on the dealer's Google Maps page, copy the link
   and paste it as mapsUrl. "Open in Google Maps" then opens their exact listing.

   Example (copy this, remove the // at the start of each line, then change the details):

   {
     name: 'Sample Auto Sales',
     area: 'Mandaue City',                  // used for the area filter
     address: 'A. S. Fortuna St., Mandaue City, Cebu',
     lat: 10.33945, lng: 123.93456,         // the pin (optional but best)
     mapsUrl: 'https://maps.app.goo.gl/…',  // optional: the dealer's Google Maps share link
     phone: '0917 123 4567',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/…',// optional
     hours: 'Mon–Sat, 8 AM – 6 PM',         // optional
     note: 'Mostly Fortuner, Montero Sport and Innova', // optional: why you trust them
   },
*/

export const DEALERS = [
   {
     name: 'Mr. Suave Auto Trading',
     area: 'Minglanilla City',                  // used for the area filter
     address: '6QRM+WHC, Abuno, Minglanilla, Cebu',
     mapsUrl: 'https://maps.app.goo.gl/XoXYAHp4FDkD4SYs6',  // optional: the dealer's Google Maps share link
     phone: '0997 433 1515',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/profile.php?id=100069823255429/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'RG Cartrade',
     area: 'Talisay City',                  // used for the area filter
     address: 'Catfish Street, Decahomes Dumlog Phase 1 Blk 19 Lot 40, Dumlog, Talisay, 6045 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/aYNMgd5ogWTyTuHn6',  // optional: the dealer's Google Maps share link
     phone: '0905 144 0197',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/rgcartrade1/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'GRA Auto Display',
     area: 'Talisay City',                  // used for the area filter
     address: '6045 dawis , Talisay, Cebu',
     mapsUrl: 'https://maps.app.goo.gl/V3ughDaMXjyHQyr28',  // optional: the dealer's Google Maps share link
     phone: '0968 708 3620',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/greatcartrading/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'Gold Aces Car Display - Talisay',
     area: 'Talisay City',                  // used for the area filter
     address: 'Properties (SRP, Cebu South Coastal Road, South Road, Brgy, Cansojong, Talisay, 6045 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/6xJ4A3TSQSgHiVrK7',  // optional: the dealer's Google Maps share link
     phone: '0945 684 1899',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/goldacescars/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'Boboy Car Trading - Mingla',
     area: 'Minglanilla City',                  // used for the area filter
     address: 'Villa Amores, Ward IV, Poblacion, Minglanilla, 6046 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/f8ugWyWXHruycw457',  // optional: the dealer's Google Maps share link
     phone: '0926 629 7291',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/boboycartrading/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: '0525 CAR CARE CENTRAL',
     area: 'Talisay City',                  // used for the area filter
     address: 'Tiago Street, Talisay, 6045 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/i1hNonggeY1qaF6r7',  // optional: the dealer's Google Maps share link
     phone: '0933 811 1018',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/MinglanillaCars/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'Cebu Ultimate Cars',
     area: 'Minglanilla City',                  // used for the area filter
     address: '3d Spring Village Rd, minglanilla, Minglanilla, 6048 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/8t2HVfyTishepDcp6',  // optional: the dealer's Google Maps share link
     phone: '0943 266 3518',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/CebUltimateCars/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'JJ Auto Display',
     area: 'Cebu City',                  // used for the area filter
     address: '7VMC+2WG, Basak San Nicolas, Cebu City, 6000 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/g1D3maAXgLEz2GMG6',  // optional: the dealer's Google Maps share link
     phone: '0939 905 5724',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/JJautosalecebu/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'KARR AutoFocus',
     area: 'Cebu City',                  // used for the area filter
     address: 'F. Vestil St, Cebu City, 6000 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/wpoh5GTcRrNP4C457',  // optional: the dealer's Google Maps share link
     phone: '0915 065 1784',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/BestCarBestPriceBestdeal/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'Altrex Auto Trading',
     area: 'Cebu City',                  // used for the area filter
     address: '2021 Spolarium St, Cebu City, 6000 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/S1jzK6saKdnvNxzV9',  // optional: the dealer's Google Maps share link
     phone: '0939 262 6449',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/altrexautoTrader/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'South Side Auto Trading',
     area: 'Talisay City',                  // used for the area filter
     address: 'Rafael Rabaya Rd, Talisay, Cebu',
     mapsUrl: 'https://maps.app.goo.gl/6jfQbx9c9V2FKPx39',  // optional: the dealer's Google Maps share link
     phone: '0917 677 3612',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/southsideautotrading/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'GCT Auto Trading',
     area: 'Cebu City',                  // used for the area filter
     address: 'Alumnos St, Cebu City, 6000 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/8wu3fVXgY6N57zGY9',  // optional: the dealer's Google Maps share link
     phone: '0933 320 2834',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/p/GCT-Autotrading-100083005947554/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'Big Luke Auto',
     area: 'Cebu City',                  // used for the area filter
     address: '71 Pope John Paul II Ave, Cebu City, 6000 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/ufJcYo9kSLwAvHD4A',  // optional: the dealer's Google Maps share link
     phone: '0917 620 7876',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/biglukeauto/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'FIVE ACES Cars',
     area: 'Mandaue City',                  // used for the area filter
     address: '71 Pope John Paul II Ave, Cebu City, 6000 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/X1Ko3xcDGqUMfRjb7',  // optional: the dealer's Google Maps share link
     phone: '0917 306 0501',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/fiveacescebu/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'TNJ Auto Display',
     area: 'Mandaue City',                  // used for the area filter
     address: '9X82+MMH, Cebu N Rd, Mandaue, Cebu',
     mapsUrl: 'https://maps.app.goo.gl/3PFfVpk4bpGSymm46',  // optional: the dealer's Google Maps share link
     phone: '0917 320 8946',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/tnjautocebu/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'Cartets Trading',
     area: 'Lapulapu City',                  // used for the area filter
     address: 'MV Patalinghug Hr. Ave, Lapu-Lapu, 6015 Cebu',
     mapsUrl: 'https://maps.app.goo.gl/PibaEYSfZiVAG1vCA',  // optional: the dealer's Google Maps share link
     phone: '(032) 272 4906',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/michaelflorescartets/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'BigJohn Trading',
     area: 'Lapulapu City',                  // used for the area filter
     address: '8X42+288, Sacred Heart Rd, Lapu-Lapu, Cebu',
     mapsUrl: 'https://maps.app.goo.gl/WkJxbLonDF1JVH9P8',  // optional: the dealer's Google Maps share link
     phone: '0943 333 1119',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/OfficialBigJohnTrading/',// optional
     hours: 'Mon–Sun, 8 AM – 5 PM',         // optional
   },
   {
     name: 'T-Sure Talisay Cebu',
     area: 'Talisay City',                  // used for the area filter
     address: '7R4F+CVX, Cebu South Coastal Rd, Talisay, Cebu',
     mapsUrl: 'https://maps.app.goo.gl/BpU5qf6ByAZT1RpZ9',  // optional: the dealer's Google Maps share link
     phone: '0917 314 6921',                // optional: shows a Call button
     facebook: 'https://www.facebook.com/TSURETRISHEAMAEEMPLEO/',// optional
     hours: 'Mon–Fri, 8 AM – 5 PM',         // optional
   },
];
