/* Single source for bundle prices and contents, shared by the homepage section and /services.
   `premium` gives a pass the dark treatment; `popular` adds the "Most popular" tag. */

export const websitePlans = [
  {
    id: 'website-basic',
    tier: '01',
    name: 'Basic Website',
    tagline: 'A clean, professional site without AI or automations.',
    usd: 600,
    php: '37k',
    features: ['Custom responsive design', 'Up to 5 pages', 'Contact form', 'Basic SEO', 'Deployment'],
  },
  {
    id: 'website-advanced',
    tier: '02',
    name: 'Advanced Website',
    tagline: 'A website that talks to visitors and follows up for you.',
    usd: 650,
    php: '40k',
    premium: true,
    popular: true,
    features: ['Everything in Basic Website', 'AI assistant trained on your business', 'Lead capture', 'Automated email follow-ups', 'Slack or Discord alerts'],
  },
  {
    id: 'website-full',
    tier: '03',
    name: 'Full System',
    tagline: 'A complete web system without AI or automations.',
    usd: 700,
    php: '43k',
    features: ['Everything in Basic Website', 'User logins and roles', 'Database', 'Admin dashboard', 'File uploads', 'Live updates'],
  },
  {
    id: 'website-full-ai',
    tier: '04',
    name: 'Full System + AI',
    tagline: 'A complete web system that does the busywork for you.',
    usd: 750,
    php: '46k',
    premium: true,
    features: ['Everything in Full System', 'Everything in Advanced Website', 'AI document reading', 'AI writing and scoring tools', 'Automated reminders'],
  },
];

export const automationPlans = [
  {
    id: 'automation-basic',
    tier: '01',
    name: 'Basic Automation',
    tagline: 'Hands-off funnels for your everyday workflows.',
    usd: 500,
    php: '30k',
    features: ['Up to 4 funnels', 'Email notifications', 'Google Calendar sync', 'Slack or Discord alerts', 'Testing and handover'],
  },
  {
    id: 'automation-advanced',
    tier: '02',
    name: 'Advanced Automation',
    tagline: 'Complex workflows built around how your business runs.',
    usd: 600,
    php: '37k',
    premium: true,
    features: ['Everything in Basic Automation', 'Multi-step Make.com workflows', 'Branching logic', 'AI review and scoring', 'Custom integrations'],
  },
];

/* Comparison table rows. Each label must match a feature string above: the ticks are
   worked out from the plans, so the table can't disagree with the pass cards. */
export const comparisonGroups = [
  {
    label: 'Website foundation',
    features: ['Custom responsive design', 'Up to 5 pages', 'Contact form', 'Basic SEO', 'Deployment'],
  },
  {
    label: 'Full system',
    features: ['User logins and roles', 'Database', 'Admin dashboard', 'File uploads', 'Live updates'],
  },
  {
    label: 'AI on your website',
    features: ['AI assistant trained on your business', 'Lead capture', 'Automated email follow-ups', 'AI document reading', 'AI writing and scoring tools', 'Automated reminders'],
  },
  {
    label: 'Automation',
    features: ['Up to 4 funnels', 'Email notifications', 'Google Calendar sync', 'Slack or Discord alerts', 'Testing and handover', 'Multi-step Make.com workflows', 'Branching logic', 'AI review and scoring', 'Custom integrations'],
  },
];

/* Expands "Everything in <plan>" so inherited features count for the higher tiers */
export function planFeatures(plan) {
  return plan.features.flatMap((feature) => {
    const base = [...websitePlans, ...automationPlans].find(p => feature === `Everything in ${p.name}`);
    return base ? planFeatures(base) : [feature];
  });
}
