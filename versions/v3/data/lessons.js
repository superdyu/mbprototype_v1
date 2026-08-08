// GENERATED from lessons.json — do not hand-edit.
// Regenerate: bash scripts/wrap-data.sh
//
// The app runs on file://, where fetch() is blocked and there is no dev
// server, so spec data ships as a script-loadable assignment (L13).
// The .json beside this file is the byte-identical spec copy.
const LESSONS_V3 =
{
  "_note": "Fills the gap v2 does not cover: pre-lesson framing questions and answer-driven script selection (D38). v2's lesson player and audio pipeline are inherited unchanged.",

  "config": {
    "maxFramingQuestions": 5,
    "minFramingQuestions": 3,
    "dontKnowIsValid": true,
    "_note": "'I don't know' is a first-class answer and routes to its own script variant. It is never treated as a wrong answer or a skip."
  },

  "lessons": [
    {
      "id": "apr",
      "title": "What APR actually costs you",
      "courses": ["interest-rates", "credit-cards", "mortgages"],
      "linkedObservation": null,
      "framing": [
        {
          "id": "f1",
          "prompt": "Do you know the APR on your main credit card?",
          "options": [
            { "label": "Yes, roughly", "next": "f2_known" },
            { "label": "No", "next": "f2_unknown" },
            { "label": "I don't have a credit card", "next": "f2_nocard" }
          ]
        },
        {
          "id": "f2_known",
          "prompt": "Roughly what is it?",
          "type": "single_select",
          "options": [
            { "label": "Under 15%", "tag": "low_apr" },
            { "label": "15–25%", "tag": "mid_apr" },
            { "label": "Over 25%", "tag": "high_apr" },
            { "label": "Not sure enough to say", "tag": "unsure_apr" }
          ],
          "next": "f3"
        },
        {
          "id": "f2_unknown",
          "prompt": "Do you carry a balance from month to month?",
          "options": [
            { "label": "Usually", "tag": "carries_balance", "next": "f3" },
            { "label": "Sometimes", "tag": "sometimes_balance", "next": "f3" },
            { "label": "Never, I pay it off", "tag": "pays_full", "next": "f3" },
            { "label": "I don't know", "tag": "unknown_balance", "next": "f3" }
          ]
        },
        {
          "id": "f2_nocard",
          "prompt": "Any other borrowing — car loan, student loan, buy now pay later?",
          "options": [
            { "label": "Yes", "tag": "other_debt", "next": "f3" },
            { "label": "No", "tag": "no_debt", "next": "f3" },
            { "label": "I don't know", "tag": "unknown_debt", "next": "f3" }
          ]
        },
        {
          "id": "f3",
          "prompt": "Has anyone explained how interest gets charged?",
          "options": [
            { "label": "Yes, I get it", "tag": "confident" },
            { "label": "Sort of", "tag": "partial" },
            { "label": "Not really", "tag": "new" }
          ]
        }
      ],
      "scriptVariants": [
        { "id": "apr_v1", "matchTags": ["high_apr"], "audioId": "apr_v1", "emphasis": "cost_of_carrying" },
        { "id": "apr_v2", "matchTags": ["mid_apr", "low_apr"], "audioId": "apr_v2", "emphasis": "mechanics" },
        { "id": "apr_v3", "matchTags": ["carries_balance", "sometimes_balance"], "audioId": "apr_v3", "emphasis": "compounding" },
        { "id": "apr_v4", "matchTags": ["pays_full"], "audioId": "apr_v4", "emphasis": "why_it_still_matters" },
        { "id": "apr_v5", "matchTags": ["no_debt", "nocard"], "audioId": "apr_v5", "emphasis": "before_you_borrow" },
        { "id": "apr_default", "matchTags": [], "isFallback": true, "audioId": "apr_v2", "emphasis": "mechanics", "_note": "Also serves every 'I don't know' path." }
      ],
      "quiz": [
        {
          "prompt": "You owe $1,000 at 24% APR and pay only the minimum. Roughly what does that cost you over a year?",
          "options": ["About $24", "About $120", "About $240", "Nothing if I make minimums"],
          "correct": 2
        }
      ],
      "simulation": {
        "type": "balance_calculator",
        "_note": "Bias toward simulation over quiz. Sandbox only — never uses the user's real figures.",
        "inputs": ["balance", "apr", "monthlyPayment"],
        "outputs": ["monthsToPayoff", "totalInterest"],
        "defaults": { "balance": 1000, "apr": 24, "monthlyPayment": 40 }
      }
    },
    {
      "id": "emergency-fund",
      "title": "How much is enough",
      "courses": ["savings", "getting-started"],
      "linkedObservation": "obs_emergency_behind",
      "framing": [
        {
          "id": "f1",
          "prompt": "Do you have money set aside for something unexpected?",
          "options": [
            { "label": "Yes", "tag": "has_fund", "next": "f2_amount" },
            { "label": "A little", "tag": "partial_fund", "next": "f2_amount" },
            { "label": "No", "tag": "no_fund", "next": "f3" },
            { "label": "I don't know", "tag": "unknown_fund", "next": "f3" }
          ]
        },
        {
          "id": "f2_amount",
          "prompt": "Roughly how long would it cover you?",
          "options": [
            { "label": "Under a month", "tag": "under_1m" },
            { "label": "One to three months", "tag": "1_3m" },
            { "label": "More than three months", "tag": "over_3m" },
            { "label": "I don't know", "tag": "unknown_duration" }
          ],
          "next": "f3"
        },
        {
          "id": "f3",
          "prompt": "If your car broke down tomorrow, what would happen?",
          "options": [
            { "label": "I'd pay from savings", "tag": "resilient" },
            { "label": "I'd put it on a card", "tag": "card_reliant" },
            { "label": "I'd have to borrow or delay it", "tag": "stretched" }
          ]
        }
      ],
      "scriptVariants": [
        { "id": "ef_v1", "matchTags": ["no_fund", "stretched"], "audioId": "ef_v1", "emphasis": "first_hundred" },
        { "id": "ef_v2", "matchTags": ["under_1m", "card_reliant"], "audioId": "ef_v2", "emphasis": "building_from_partial" },
        { "id": "ef_v3", "matchTags": ["1_3m"], "audioId": "ef_v3", "emphasis": "where_to_keep_it" },
        { "id": "ef_v4", "matchTags": ["over_3m", "resilient"], "audioId": "ef_v4", "emphasis": "what_next" },
        { "id": "ef_default", "matchTags": [], "isFallback": true, "audioId": "ef_v2", "emphasis": "building_from_partial" }
      ],
      "quiz": [
        {
          "prompt": "What's the most common first target people are given for an emergency fund?",
          "options": ["One month of income", "$1,000", "Six months of expenses", "Whatever's left over"],
          "correct": 1
        }
      ],
      "simulation": {
        "type": "savings_pace_calculator",
        "inputs": ["target", "current", "monthlyContribution"],
        "outputs": ["monthsToTarget", "targetDate"],
        "defaults": { "target": 3000, "current": 620, "monthlyContribution": 120 }
      }
    },
    {
      "id": "subscription-audit",
      "title": "What you're actually using",
      "courses": ["spending", "getting-started"],
      "linkedObservation": "obs_hulu_unused",
      "framing": [
        {
          "id": "f1",
          "prompt": "How many subscriptions do you think you're paying for?",
          "options": [
            { "label": "Under three", "tag": "few_subs", "next": "f2" },
            { "label": "Three to six", "tag": "some_subs", "next": "f2" },
            { "label": "More than six", "tag": "many_subs", "next": "f2" },
            { "label": "No idea", "tag": "unknown_subs", "next": "f2" }
          ]
        },
        {
          "id": "f2",
          "prompt": "When did you last check what's billing you?",
          "options": [
            { "label": "This month", "tag": "recent_check" },
            { "label": "Sometime this year", "tag": "stale_check" },
            { "label": "Never", "tag": "no_check" }
          ],
          "next": "f3"
        },
        {
          "id": "f3",
          "prompt": "Ever found something you forgot you were paying for?",
          "options": [
            { "label": "Yes", "tag": "has_found" },
            { "label": "No", "tag": "not_found" },
            { "label": "Probably, if I looked", "tag": "suspects" }
          ]
        }
      ],
      "scriptVariants": [
        { "id": "sa_v1", "matchTags": ["many_subs", "no_check"], "audioId": "sa_v1", "emphasis": "the_pile_up" },
        { "id": "sa_v2", "matchTags": ["some_subs", "stale_check", "suspects"], "audioId": "sa_v2", "emphasis": "how_to_audit" },
        { "id": "sa_v3", "matchTags": ["few_subs", "recent_check"], "audioId": "sa_v3", "emphasis": "staying_on_top" },
        { "id": "sa_default", "matchTags": [], "isFallback": true, "audioId": "sa_v2", "emphasis": "how_to_audit" }
      ],
      "quiz": [
        {
          "prompt": "What's the usual reason a subscription goes unnoticed?",
          "options": ["The price goes up", "It's small enough not to stand out", "The company hides it", "It bills annually"],
          "correct": 1
        }
      ],
      "simulation": {
        "type": "subscription_tally",
        "_note": "User toggles subscriptions on and off, sees monthly and annual totals move.",
        "inputs": ["subscriptionList"],
        "outputs": ["monthlyTotal", "annualTotal", "savingsIfCancelled"],
        "seedFrom": "persona.subscriptions.known"
      }
    }
  ],

  "matching": {
    "_note": "Script selection: collect tags from all framing answers, score each variant by tag overlap, play the highest. Ties break by variant order. Zero matches plays the fallback.",
    "strategy": "highest_tag_overlap",
    "tieBreak": "first_listed"
  },

  "badges": {
    "_note": "Metal tier plus level number, Overwatch-style. Vanity only — unlocks nothing.",
    "tiers": ["bronze", "silver", "gold", "platinum", "diamond"],
    "xpPerTier": 500,
    "xpCorrectAnswer": 50,
    "xpLessonComplete": 100,
    "xpBonusFromDailyTask": 50,
    "_note_shared": "A lesson belongs to several courses. Progress is on the lesson, so cross-cutting lessons level faster."
  }
}
;
