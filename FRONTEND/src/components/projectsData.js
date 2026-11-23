/* Every project shown on the homepage and the /projects page. Add a project here and give it a group. */

export const GROUPS = [
  { id: 'productivity', label: 'Productivity & Automation' },
  { id: 'career', label: 'Career Tools' },
  { id: 'finance', label: 'Finance' },
  { id: 'marketplaces', label: 'Marketplaces' },
  { id: 'cars', label: 'Cars' },
];

/* Shown on the homepage carousel, in this order */
export const HOME_FEATURED_IDS = [2, 8, 6, 5];

/* Projects data */
export const projects = [
  {
    id: 1,
    group: 'productivity',
    category: 'AI Automation',
    title: "Google Calendar AUTO Scheduler",
    description: "Gemini AI-powered schedule scanner that automatically extracts shift rotas, PDF timetables, and spreadsheets to sync directly into Google Calendar.",
    tags: ['Gemini AI', 'Google Calendar API', 'Multimodal OCR', 'React'],
    image: null,
    liveUrl: '/auto-scheduler',
    githubUrl: null,
    placeholder: false,
    spotlight: true,
  },
  {
    id: 2,
    group: 'productivity',
    category: 'Team Collaboration',
    title: 'TeamSync Workspace',
    description: 'Real-time team collaboration platform with room-based workspaces, role-separated dashboards for owners and employees, task assignment and review, and instant notifications.',
    tags: ['React', 'Supabase', 'Realtime', 'Role-based Auth'],
    image: null,
    liveUrl: '/teamsync-workspace',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
    inDevelopment: false,
    badge: 'Full-System Project',
  },
  {
    id: 3,
    group: 'productivity',
    category: 'Client Operations',
    title: 'OnboardBase',
    description: 'Secure client onboarding portal with magic-link login, a progress tracker, a save-and-resume intake form, brand-asset uploads, and an admin pipeline that flags stalled clients.',
    tags: ['React', 'Supabase', 'Row Level Security', 'Edge Functions'],
    image: null,
    liveUrl: '/onboardbase',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 4,
    group: 'career',
    category: 'AI Career Tools',
    title: 'BuhayVA Copilot',
    description: '1-click job analyzer for Upwork and OnlineJobs.ph: Gemini scores your fit, catches hidden attention checks and red flags, drafts a tailored pitch, and tracks every application.',
    tags: ['Gemini AI', 'Make.com', 'Supabase', 'React'],
    image: null,
    liveUrl: '/buhayva-copilot',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 5,
    group: 'finance',
    category: 'Personal Finance',
    title: 'BALANSE',
    description: 'Personal finance dashboard with a money overview, a debt tracker that shows each loan getting paid down, savings goals that work out how much to set aside every month, and subscription renewal tracking.',
    tags: ['React', 'Supabase', 'PostgreSQL RPC', 'Custom Auth'],
    image: null,
    liveUrl: '/balanse',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 6,
    group: 'marketplaces',
    category: 'Marketplace',
    title: 'KalakalGG',
    description: 'Buy-and-sell marketplace for game accounts (MLBB, CODM, Valorant, Genshin and more) in pesos, with ID-verified sellers, live trade chat, official middlemen, badges earned from completed deals and a public Scammer Wall.',
    tags: ['React', 'Supabase', 'Realtime', 'Row Level Security'],
    image: null,
    liveUrl: 'https://kalakalgg.clarkva360.site',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 7,
    group: 'career',
    category: 'Career Tools',
    title: 'Clark VA 360 Job Tracker',
    description: 'Job hunt tracker that logs every application with its link, date applied and source, bookmarks jobs to apply to later with their requirements, and shows weekly activity and where your best leads come from.',
    tags: ['React', 'Supabase', 'PostgreSQL RPC', 'Custom Auth'],
    image: null,
    liveUrl: '/job-tracker',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 8,
    group: 'productivity',
    category: 'AI Email Triage',
    title: 'ClarkFlow 360',
    description: 'AI inbox assistant for VA work: pulls in unread Gmail, matches each email to a client, and has Gemini rank it high, medium or low, summarize it, and draft a reply in that client’s tone, ready to review and send in the same Gmail thread.',
    tags: ['Gemini AI', 'Gmail API', 'Supabase', 'React'],
    image: null,
    liveUrl: '/clarkflow',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
    badge: 'Private VA Tool',
  },
  {
    id: 10,
    group: 'cars',
    category: 'Used-Car Guide',
    title: 'CarMark 360',
    description: 'Mobile guide for secondhand-car buyers in Cebu: compare any two variants side by side, see each generation’s rough used price and the problems to check (flood damage first), find trusted dealers on Google Maps, and tick through a before-you-buy checklist.',
    tags: ['React', 'Mobile-first', 'Google Maps', 'Researched data'],
    image: null,
    liveUrl: '/carmark',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 11,
    group: 'cars',
    category: 'Dealer Website',
    title: 'Showroom 360',
    description: 'A ready-made website for a Cebu used-car dealer: featured cars that rotate on the home page, a searchable inventory, a monthly-payment estimate on every car, a flood-free and papers check, one-tap Messenger and Viber inquiries, test-drive bookings, English or Bisaya, and sale events with countdowns.',
    tags: ['React', 'Mobile-first', 'IndexedDB', 'Bisaya / English'],
    image: null,
    liveUrl: '/showroom',
    githubUrl: null,
    placeholder: false,
    spotlight: false,
  },
  {
    id: 9,
    group: null,
    category: 'In the pipeline',
    title: 'Coming Soon',
    description: 'Building out my portfolio one project at a time.',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
];

/* Plain-language guides for the "How it works" popup, written so anyone (even a 12-year-old) can follow. */
export const docs = {
  1: {
    what: 'The Auto Scheduler is a helper that reads your work schedule and puts it on your Google Calendar for you. Your schedule might be a photo, a PDF, or a spreadsheet. Instead of typing every shift in by hand, the app reads it and does the typing.',
    use: [
      'Open the app and sign in with your Google account.',
      'Upload your schedule: a photo, a PDF, or a spreadsheet.',
      'The AI (Google Gemini) reads it and finds your shifts, dates and times.',
      'Look at the preview. If something looks wrong, fix it before saving.',
      'Press the button to send everything to Google Calendar. Done!',
    ],
    purpose: 'Work rotas (the lists that say who works when) are often messy. People copy them into their calendar one line at a time, and mistakes happen. This app makes that boring job fast and accurate.',
    help: [
      'Saves time: dozens of shifts added in seconds, not an afternoon.',
      'Fewer mistakes: you check a preview before anything is saved.',
      'Never miss a shift: it all shows up on your phone calendar.',
      'Works with the files you already have, so there is nothing new to learn.',
    ],
  },
  2: {
    what: 'TeamSync is a shared online office for a small team. The boss (the “owner”) creates a room. The team members (the “employees”) join it. Inside, the owner hands out tasks, and employees send their finished work back to be checked.',
    use: [
      'Sign up and log in. A code is sent to your email to prove it is really you.',
      'The owner creates a room and shares its room code with the team.',
      'Employees enter the code and wait for the owner to let them in.',
      'The owner assigns a task and can set a deadline.',
      'The employee finishes the work and submits it.',
      'The owner reviews it and either approves it or asks for changes. Everyone is notified right away.',
    ],
    purpose: 'Teams often lose track of who is doing what, because tasks get buried in chats and emails. TeamSync keeps every task, deadline and answer in one tidy place and updates live, without refreshing the page.',
    help: [
      'Everyone knows what to do next, and by when.',
      'Owners can see what is waiting for review at a glance.',
      'Owners and employees each see only the screens they need.',
      'Less chasing people with “did you finish that yet?” messages.',
    ],
  },
  3: {
    what: 'OnboardBase is a private website where a new customer gets set up with a business. “Onboarding” just means the getting-started stage: signing the agreement, sharing files and answering questions. OnboardBase puts all of it in one place with a progress bar, like a checklist in a video game.',
    use: [
      'The business owner clicks “New Client” and types the customer’s email and company name.',
      'The customer gets an email with a magic link. One click and they are in, with no password.',
      'They follow 5 steps: sign the contract, upload logos, fill in the form, book a kickoff call, then wait for the final review.',
      'The form saves as they go, so they can stop and come back later.',
      'When every step is done, the page turns into a “your project is live” page with contacts, a meeting link and finished work.',
    ],
    purpose: 'Starting with a new customer usually means weeks of emails, lost links and forgotten files. OnboardBase replaces that mess with one organized page, and shows the owner who is stuck and on which step.',
    help: [
      'Customers can finish setup in about 20 minutes instead of weeks.',
      'No more “where is that link?”, because everything lives on one page.',
      'Private and safe: each customer can only ever see their own stuff.',
      'The owner sees a board of all customers and spots anyone who has gone quiet.',
      'You can try it with the demo buttons. No account needed.',
    ],
  },
  4: {
    what: 'BuhayVA Copilot is a helper for freelancers who apply to jobs on Upwork and OnlineJobs.ph. You give it a job post, and it tells you how well you match, warns you about anything fishy, and writes a proposal for you based on your own resume.',
    use: [
      'Save your resume, your skills and your minimum rate once in “Master profile”.',
      'Paste a job post, or click the “Send to Copilot” bookmark while you are looking at the job.',
      'The AI (Google Gemini) gives the job a fit score from 0 to 100 and lists the skills you share.',
      'It points out secret code words the client asked for, like “put BANANA in the subject”, plus red flags like very low pay.',
      'Copy the ready-made proposal, send it, then move the job along: Applied, Interviewing, Offer.',
    ],
    purpose: 'Applying for online jobs takes a long time: reading every post, deciding if it is worth it, and writing a fresh proposal each time. Clients also hide little tests in their posts to see who actually read them. Copilot does the reading and the first draft, so you can apply faster and smarter.',
    help: [
      'Spend your time on jobs you can actually win.',
      'Never miss a hidden code word again.',
      'Proposals that mention your real projects, not generic filler.',
      'One board shows every job you applied to and where it stands.',
      'Try it with the demo button. No account needed.',
    ],
  },
  5: {
    what: 'BALANSE is a money notebook that does the math for you. It shows how much you still owe, how much you have saved, and how close you are to the things you want to buy, like a new car.',
    use: [
      'Sign up with just a username and password. No email needed.',
      'Open the Debt tracker and add each debt: what it is, the total, and how much you have already paid.',
      'Each time you pay, press “Record payment” and watch the bar fill up.',
      'Open Goals and add what you are saving for, like a Montero Sport for ₱600,000, plus a target date if you have one.',
      'Open Subscriptions and add what you pay for monthly or yearly. A bar fills up as each renewal gets closer.',
      'Check the Overview to see everything at once: what you owe, what you saved, and what is due next.',
    ],
    purpose: 'It is easy to lose track of money when debts and savings live in different apps, notebooks and chats. BALANSE puts them side by side, so you always know where you stand.',
    help: [
      'See every debt shrink as you pay it down.',
      'Know exactly how much to save each month to hit a goal on time.',
      'Never miss a payment: upcoming due dates show on the Overview.',
      'See what your subscriptions really cost, and which one renews next.',
      'Private: each account only ever sees its own numbers.',
    ],
  },
  6: {
    what: 'KalakalGG is an online shop where gamers in the Philippines buy and sell game accounts, like Call of Duty: Mobile and Mobile Legends accounts. Every price is in pesos, and the site has rules and helpers to stop scammers.',
    use: [
      'Sign up with just a username and password.',
      'To sell, verify your real name with a valid ID first. An admin checks it, and then you can post your account with its level, skins and bind details.',
      'To buy, browse the marketplace, open an account you like and tap “Buy / Chat with Seller”.',
      'Chat live with the seller and pick how to trade: pay first, account first, or with an official middleman who holds the money until both sides are happy.',
      'When the deal is done, both of you confirm and your badges level up, from Bronze Seller up to Mythic Seller.',
      'If someone scams you, press “Report Scammer”. Admins can ban them and post them on the public Scammer Wall.',
    ],
    purpose: 'Buying game accounts on Facebook groups is risky: sellers disappear, take the account back, or fake their screenshots. KalakalGG makes every seller prove who they are and keeps the whole deal in one chat that admins can check.',
    help: [
      'Buyers see verified sellers and their trade history before paying.',
      'Middlemen protect big trades by holding the payment until the account is handed over.',
      'Badges come from real completed deals, so they cannot be faked.',
      'Scammers get banned and shown publicly, so others stay safe.',
      'Try it with Demo Mode on the site. No account needed.',
    ],
  },
  7: {
    what: 'The Job Tracker is a notebook for your job hunt. It remembers every job you applied to, when you applied, and where you found it, like LinkedIn, OnlineJobs.ph or Upwork. It also keeps a list of jobs you want to apply to later.',
    use: [
      'Sign in with your username and password. Accounts are invite-only, so there is no public sign-up.',
      'Open Job Tracker and press “Log application”. Paste the job link, type the job title, pick the date you applied and where you found it.',
      'Found a job on another site? Pick “Other” and type the site’s name, like Indeed or a Facebook group.',
      'Not ready to apply yet? Open Bookmarks and save the job with the things it asks for, like a resume, a Loom video or a portfolio link, one per line.',
      'Check the Overview to see how many jobs you applied to this week and this month, and which site gives you the most leads.',
    ],
    purpose: 'When you apply to many jobs, it is easy to forget which ones you already sent, when you sent them, or what a job asked for. The Job Tracker keeps all of that in one place, so nothing slips.',
    help: [
      'Never apply to the same job twice by accident.',
      'See your weekly progress and keep your momentum going.',
      'Know which job sites actually work for you.',
      'Prepare the right files before applying, because each bookmark lists its requirements.',
      'Private: each account only ever sees its own jobs.',
    ],
  },
  8: {
    what: 'ClarkFlow 360 is the email helper I built for my own virtual assistant work. It reads new emails from my clients, tells me which ones are urgent, sums each one up in a sentence, and writes a first draft of the reply in the way each client likes to be spoken to. It is a private tool, so only approved accounts can sign in.',
    use: [
      'Sign in with a code sent to your email. Only approved accounts get past this step.',
      'Connect Gmail once. Google asks permission to read and send email, and the keys are locked (encrypted) on the server, never in the browser.',
      'Add your clients: their email or company website, plus notes on how to talk to them, like “friendly, first names” or “never confirm prices”.',
      'Press “Sync & triage”. New unread emails come in, and Google Gemini marks each one high, medium or low, writes a one-line summary, and drafts a reply.',
      'Open an email, fix the draft (fill in anything in [square brackets]), and press “Send reply”. It goes out from Gmail, in the same conversation.',
    ],
    purpose: 'A virtual assistant can get dozens of emails a day from different clients. Working out which ones are urgent, and writing every reply in the right tone, takes hours. ClarkFlow does the sorting and the first draft, and a person still checks every reply before it is sent.',
    help: [
      'Urgent emails, like a deadline today or a payment problem, go straight to the top.',
      'Every reply starts as a draft in that client’s own tone.',
      'Nothing is sent until a person reads it and presses Send.',
      'Replies stay in the same Gmail thread, so clients see a normal conversation.',
      'Safe: Google access is encrypted, and Gmail can be disconnected at any time.',
    ],
  },
  10: {
    what: 'CarMark 360 is a free helper for people buying a secondhand car in Cebu. It explains how one variant differs from another, like an Xpander GLS and an Xpander Cross, what usually goes wrong with each model year, and roughly how much it sells for. No account needed.',
    use: [
      'Open Compare and pick Car A and Car B: the model, the generation (the years it was sold) and the variant.',
      'See what each car has that the other doesn’t, then the specs side by side with the differences highlighted.',
      'Read “Before you buy”: the problems to check on that generation, like flood damage on a Fortuner or a worn CVT on a Vios.',
      'Open Models to read every generation of a car, with its rough used price and what changed.',
      'Open Dealers to find trusted dealers on the map and get directions in Google Maps.',
      'Open the Checklist, pick the car and generation you are going to see, and tick through the checks made for it, then flood signs, papers and the test drive. Your ticks are saved on your phone.',
    ],
    purpose: 'Most people buy used cars from Facebook posts and dealer lots without knowing what the variant names mean, what breaks on that model year, or what a fair price is. After Typhoon Tino flooded half of Cebu City in 2025, flooded cars are a real risk too.',
    help: [
      'Know exactly what extra you pay for in a higher variant.',
      'Spot the common problems of a model year before you pay, not after.',
      'Bargain with a rough price range in hand.',
      'Avoid flooded cars and paper scams with a step-by-step checklist.',
      'Share a comparison link with family before deciding.',
    ],
  },
  11: {
    what: 'Showroom 360 is a sample website for a secondhand car dealer in Cebu, made to show dealers who sell only through Facebook what their own site could look like. The shop and its cars are samples.',
    use: [
      'Watch the featured cars rotate on the home page, including the ones on sale for the current event.',
      'Tap “See all cars” to search by make, model or year, and filter by body type, price, fuel or cars on sale.',
      'Open a car to see its photos, specs, and a clear Yes / No / Not stated card for flood damage, accidents, casa service and papers.',
      'Slide the downpayment and pick a term to see the monthly payment and the rough all-in downpayment.',
      'Message the shop on Messenger or Viber with the car already in the message, or book a test drive.',
      'Switch between English and Bisaya at the top.',
      'Anything you change is saved only in your own browser. Safari may clear it after about a week without a visit.',
    ],
    purpose: 'Many Cebu dealers post their units on Facebook, where listings get buried and buyers keep asking the same questions. Buyers here shop by downpayment and monthly, message on Messenger, and worry about flooded cars after Typhoon Tino. This site answers all three on every car.',
    help: [
      'Every car shows a monthly payment estimate up front, not on a separate calculator page.',
      'Flood-free, accident and papers details are shown honestly, and unchecked items say “Not stated”.',
      'Buyers can reach the shop in one tap, with the car already named in the message.',
      'Sale events with countdowns put the right cars at the top of the home page.',
      'Works on any phone, in English or Bisaya.',
    ],
  },
};

/* The /projects view (with its ?group= tab) an app was opened from, so the app's
   "Back to portfolio" can return there. null = opened from anywhere else. */
let returnUrl = null;
let returnScroll = 0;
export const projectsReturnUrl = () => returnUrl;
export const projectsReturnScroll = () => returnScroll;
/* Switching tabs updates it too, so browser back/forward around an app returns to the latest tab */
export const rememberProjectsView = () => {
  returnUrl = window.location.pathname + window.location.search;
  returnScroll = window.scrollY;
};

export const openProject = (url) => {
  /* Projects hosted on their own domain (e.g. KalakalGG) open in a new tab */
  if (!url.startsWith('/')) return window.open(url, '_blank', 'noopener,noreferrer');
  const here = window.location.pathname;
  returnUrl = here.startsWith('/projects') ? here + window.location.search : null;
  returnScroll = returnUrl ? window.scrollY : 0;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
