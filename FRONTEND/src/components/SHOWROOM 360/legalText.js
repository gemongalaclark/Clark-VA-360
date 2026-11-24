/* Sample Privacy Policy and Terms and Conditions, linked from the footer. Plain
   English, written for a Cebu used-car shop. They speak for whichever shop is in
   Settings (name, address, phone), so a pitched dealer sees their own name. A
   starting point only: the page says a real shop should have its own checked by
   a lawyer. Fee amounts and time limits here are samples. */

export const LEGAL_KINDS = ['privacy', 'terms'];
export const LEGAL_UPDATED = '2026-11-24';

/* "Call or text us at 0900 000 0000, or visit us at Mandaue City, Cebu." */
function contact(s) {
  const ways = [
    s.phone?.trim() && `call or text us at ${s.phone.trim()}`,
    s.address?.trim() && `visit us at ${s.address.trim()}`,
  ].filter(Boolean);
  if (!ways.length) return 'Reach us through the contact details on our home page.';
  const text = ways.join(', or ');
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

function privacy(shop, s) {
  return {
    intro: `This policy explains what personal information ${shop} (“we” or “us”) collects through this website, why we collect it, and your rights under the Data Privacy Act of 2012 (Republic Act No. 10173).`,
    sections: [
      { heading: 'What we collect', paras: ['We only collect what you choose to give us:'], list: [
        'When you book a test drive or reserve a car: your name, mobile number, preferred date and time, the car you asked about, and your message.',
        'When you ask us to tell you when a car arrives: your name, mobile number, the search you saved, and your message.',
        'When you claim a prize from our promo wheel: your name, email address, the prize you won and your voucher code.',
        'When you message us on Messenger or Viber, or call us: what you send us there. Those apps also handle your data under their own policies.',
        'If you buy a car: the details needed for the deed of sale, the transfer of registration and, if you apply for a loan, the bank’s application form. We collect these in person, not on this website.',
      ] },
      { heading: 'What stays on your phone', paras: [
        'This website remembers your language (English or Bisaya) and light or dark mode on your own device, so it looks the same next time. We don’t use advertising or tracking cookies.',
      ] },
      { heading: 'Why we use it', paras: ['We use your information only to:'], list: [
        'Answer your questions and confirm test drives and reservations.',
        'Check and honour promo vouchers, and contact you about a prize you won.',
        'Prepare the papers when you buy a car, and send your loan application to the bank or financing company you choose.',
        'Keep the sales records the law requires.',
        'Tell you about new units or sales, but only if you ask us to.',
      ] },
      { heading: 'Who we share it with', paras: ['We never sell your personal information. We share it only when your purchase needs it or the law requires it:'], list: [
        'The bank or financing company you apply with.',
        'The insurance company that covers your car.',
        'The Land Transportation Office (LTO) and the PNP Highway Patrol Group, to transfer the registration to your name.',
        'Government offices, when a law or court order requires it.',
      ] },
      { heading: 'How long we keep it', paras: [
        'Requests that don’t lead to a sale are deleted after one year. Sales records are kept for as long as tax and LTO rules require, then deleted.',
      ] },
      { heading: 'How we protect it', paras: [
        'Only the staff who handle your inquiry or purchase can see your information. Paper records are kept in a locked office.',
      ] },
      { heading: 'Your rights', paras: ['Under the Data Privacy Act, you have the right to:'], list: [
        'Be told how your information is used, as this page does.',
        'See the information we hold about you, and get a copy you can take elsewhere.',
        'Have wrong or outdated details corrected.',
        'Object to how we use it, or ask us to delete or block it.',
        'Be paid damages if your information is misused.',
        'Complain to the National Privacy Commission (privacy.gov.ph).',
      ] },
      { heading: 'Contact us', paras: [
        `For questions about your information, or to use any of these rights, contact our Data Protection Officer. ${contact(s)}`,
      ] },
      { heading: 'Changes to this policy', paras: [
        'If we change this policy, we’ll post the new version on this page with a new date.',
      ] },
    ],
  };
}

function terms(shop, s) {
  return {
    intro: `These terms apply when you use the ${shop} website, and when you ask about, test drive or reserve a car through it. By using the site, you agree to them.`,
    sections: [
      { heading: 'Cars and prices', paras: [], list: [
        'Prices are in Philippine pesos and can change without notice. A sale price applies only until the sale ends.',
        'A car may be sold or reserved before the website is updated. We’ll tell you right away if the car you asked about is gone.',
        'We check every listing, but mistakes happen. If a price or detail is wrong, we’ll tell you before you pay anything, and the correct one applies.',
        'Photos are for reference, and colours can look different on screens. Please see the car in person.',
      ] },
      { heading: 'Condition and inspection', paras: [
        'Flood-free, accident-free and service details come from our own inspection and the records we have. “Not stated” means we don’t know.',
        'Pre-owned cars are sold in their current condition unless we give you a written warranty. Please inspect and test drive the car first, and feel free to bring your own mechanic. Nothing in these terms takes away your rights under the Consumer Act of the Philippines (Republic Act No. 7394).',
      ] },
      { heading: 'Monthly payments and financing', paras: [
        'Monthly payments on this site are estimates only. The bank or financing company decides whether to approve a loan, and sets the actual downpayment, rate and term.',
      ] },
      { heading: 'Test drives', paras: [], list: [
        'Test drives are by appointment, and depend on the car being available.',
        'Bring a valid driver’s licence. One of our staff rides along.',
        'You’re responsible for any traffic violation during your test drive.',
      ] },
      { heading: 'Reservations', paras: [
        'A reservation request on this site doesn’t hold the car yet. The car is reserved once we confirm it and you pay the reservation fee.',
      ], list: [
        'The reservation fee is ₱10,000. It holds the car for 7 days and counts toward the price.',
        'We refund it if the bank turns down your loan. If you change your mind, it isn’t refunded.',
      ] },
      { heading: 'Papers and transfer', paras: [
        'We hand over the original OR/CR, a signed deed of sale and the other papers needed to transfer the registration to your name at the LTO, and we help you get the PNP Highway Patrol Group clearance the transfer needs. Unless we agree otherwise in writing, the buyer pays the transfer fees.',
      ] },
      { heading: 'Other websites', paras: [
        'The Messenger, Viber and Google Maps buttons open those services. Their own terms and privacy policies apply there.',
      ] },
      { heading: 'Photos and content', paras: [
        `The text, logo and photos on this site belong to ${shop} or to the owners named in the photo credits. Please don’t copy them for other listings.`,
      ] },
      { heading: 'Promos', paras: [
        'When a sale has a prize wheel, these rules apply on top of the promo’s own mechanics:',
      ], list: [
        'One spin per person. A second spin, or a claim with someone else’s details, isn’t valid.',
        'A prize is claimed with your name and email. Each email can claim each promo once.',
        'A voucher is good for 30 days from the day you win it, for one car bought from us. It can’t be exchanged for cash or combined with another voucher.',
        'Promos that involve chance run under a permit from the Department of Trade and Industry (DTI). The permit number is shown on the wheel.',
      ] },
      { heading: 'Our responsibility', paras: [
        'We work to keep this site accurate and running, but we can’t promise it will always be error-free or available. As far as the law allows, we aren’t responsible for losses from relying on a listing without checking the car and its papers yourself.',
      ] },
      { heading: 'Governing law', paras: [
        'These terms are governed by the laws of the Philippines. Any dispute goes to the proper courts in Cebu.',
      ] },
      { heading: 'Contact us', paras: [`Questions about these terms? ${contact(s)}`] },
      { heading: 'Changes to these terms', paras: [
        'If we change these terms, we’ll post the new version on this page with a new date.',
      ] },
    ],
  };
}

/* { intro, sections: [{ heading, paras, list? }] } for 'privacy' or 'terms', else null */
export function legalDoc(kind, settings) {
  const s = settings || {};
  const shop = s.shopName?.trim() || 'this shop';
  if (kind === 'privacy') return privacy(shop, s);
  if (kind === 'terms') return terms(shop, s);
  return null;
}
