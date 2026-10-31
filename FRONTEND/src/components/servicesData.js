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
    features: ['Everything in Basic Website', 'AI chatbot', 'Automated lead capture', 'Automated follow-ups'],
  },
  {
    id: 'website-full',
    tier: '03',
    name: 'Full System',
    tagline: 'A complete web system without AI or automations.',
    usd: 700,
    php: '43k',
    features: ['Everything in Basic Website', 'User logins', 'Database', 'Admin dashboard'],
  },
  {
    id: 'website-full-ai',
    tier: '04',
    name: 'Full System + AI',
    tagline: 'A complete web system that does the busywork for you.',
    usd: 750,
    php: '46k',
    premium: true,
    features: ['Everything in Full System', 'AI features', 'Workflow automations'],
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
    features: ['Up to 4 funnels', 'Tool integrations', 'Testing and handover'],
  },
  {
    id: 'automation-advanced',
    tier: '02',
    name: 'Advanced Automation',
    tagline: 'Complex workflows built around how your business runs.',
    usd: 600,
    php: '37k',
    premium: true,
    features: ['Multi-step workflows', 'Branching logic', 'AI steps', 'Custom integrations'],
  },
];
