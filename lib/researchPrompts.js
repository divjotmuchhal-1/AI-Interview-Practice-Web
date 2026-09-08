// The Phase 1 question set.
//
// Two rules shape every question here.
//
// First, tapping beats typing. A free-text box asked cold gets single-digit
// response rates; a row of buttons gets most people. So every moment leads with
// choices and keeps the text box optional and last.
//
// Second, three questions is the ceiling. The full research list is about
// fifteen questions long, which is the right list to want answered and the
// wrong list to put in front of someone mid-session. It is split across the
// four moments where each question is actually live, so no one is asked more
// than three at once and nobody is asked about pricing who never saw a price.

export const MOMENTS = {
  // Asked once, on the first session start, before the product has had a
  // chance to colour the answer. Intent and alternative are only truthful
  // before the person has an opinion of us.
  intake: {
    title: 'Two quick questions before you start',
    subtitle: 'This shapes what gets built next. Skip if you would rather just go.',
    questions: [
      {
        id: 'reason',
        label: 'What brings you here?',
        options: [
          ['interview_soon', 'I have an interview coming up'],
          ['job_hunting',    'Job hunting, nothing booked yet'],
          ['curious',        'Curious about AI-assisted interviews'],
          ['staying_sharp',  'Keeping my skills sharp'],
        ],
      },
      {
        id: 'timing',
        label: 'When is your next interview?',
        options: [
          ['this_week',  'This week'],
          ['two_weeks',  'Next 1 to 2 weeks'],
          ['this_month', 'Within a month'],
          ['none',       'Nothing booked'],
        ],
      },
      {
        id: 'alternative',
        label: 'Where do you practice today?',
        multi: true,
        options: [
          ['leetcode',  'LeetCode'],
          ['neetcode',  'NeetCode'],
          ['chatbot',   'ChatGPT or Claude'],
          ['youtube',   'YouTube'],
          ['mocks',     'Mock interviews with people'],
          ['nothing',   'Nothing yet'],
        ],
      },
    ],
    note: { label: 'Which company or role are you preparing for?', optional: true },
  },

  // Asked when someone leaves a session without finishing. This is the largest
  // hole in the funnel and the only moment that can explain it, since the
  // person is the one who just decided to go.
  abandon: {
    title: 'You are leaving this one unfinished',
    subtitle: 'One tap tells me what to fix. It closes either way.',
    questions: [
      {
        id: 'reason',
        label: 'What made you stop?',
        options: [
          ['too_hard',    'Too hard, I was stuck'],
          ['too_easy',    'Too easy to be worth finishing'],
          ['confusing',   'I could not tell what I was meant to do'],
          ['broken',      'Something looked broken'],
          ['out_of_time', 'Out of time, I will come back'],
          ['browsing',    'Just looking around'],
        ],
      },
    ],
    note: { label: 'What would have kept you going?', optional: true },
  },

  // Asked after the score is on screen. Whether the six axes land is only
  // answerable by someone who has just read theirs.
  review: {
    title: 'Was that score useful?',
    subtitle: 'Three taps. It decides whether the grader gets rebuilt.',
    questions: [
      {
        id: 'realism',
        label: 'Did this feel like a real interview?',
        options: [
          ['close',      'Close to one'],
          ['somewhat',   'Somewhat'],
          ['not_really', 'Not really'],
        ],
      },
      {
        id: 'score_value',
        label: 'After reading your score, do you know what to improve?',
        options: [
          ['clear',   'Yes, it was specific'],
          ['vague',   'Interesting but vague'],
          ['skipped', 'I did not really read it'],
        ],
      },
      {
        id: 'coach',
        label: 'How was the AI coach?',
        options: [
          ['helpful',    'Genuinely helpful'],
          ['restrictive','Too restrictive, it would not just tell me'],
          ['too_easy',   'Gave it away too easily'],
          ['slow',       'Too slow'],
          ['unused',     'I did not use it'],
        ],
      },
    ],
    note: { label: 'What was missing?', optional: true },
  },

  // Asked when someone who has run out of sessions leaves the pricing screen
  // without buying. Sixteen people have reached this wall and fifteen never
  // clicked the button, which is the single largest unexplained fact in the
  // funnel.
  paywall: {
    title: 'Before you go',
    subtitle: 'You are out of free sessions and did not buy. I would rather know why than guess.',
    questions: [
      {
        id: 'blocker',
        label: 'What stopped you?',
        options: [
          ['unproven',    'Not sure it is worth it yet'],
          ['too_pricey',  'Too expensive'],
          ['no_urgency',  'No interview coming up'],
          ['want_more_free', 'I want more free sessions first'],
          ['payment',     'Payment or card trouble'],
          ['will_buy',    'Nothing, I plan to buy'],
        ],
      },
      {
        id: 'price_read',
        label: 'For 25 sessions, $12 feels',
        options: [
          ['cheap',      'Cheap'],
          ['fair',       'About right'],
          ['expensive',  'Expensive'],
          ['irrelevant', 'Price is not the issue'],
        ],
      },
      {
        id: 'urgency_test',
        label: 'If you had an interview in two weeks, would you pay $12?',
        options: [
          ['yes',   'Yes'],
          ['maybe', 'Maybe'],
          ['no',    'No'],
        ],
      },
    ],
    note: { label: 'What would make $12 obviously worth it?', optional: true },
  },
};

export const MOMENT_IDS = Object.keys(MOMENTS);

// Moments that should only ever be asked once per person. Abandon and review
// recur because the answer can legitimately differ per session.
export const ONCE_ONLY = ['intake', 'paywall'];

const seenKey = (moment) => `air_asked_${moment}`;

// localStorage is deliberately the gate rather than a database lookup: it costs
// no request on a hot path, and the failure mode of a cleared browser is one
// extra prompt, which is cheaper than a query before every session start.
export function alreadyAsked(moment) {
  if (!ONCE_ONLY.includes(moment)) return false;
  try { return localStorage.getItem(seenKey(moment)) === '1'; } catch { return false; }
}

export function markAsked(moment) {
  try { localStorage.setItem(seenKey(moment), '1'); } catch { /* private mode */ }
}
