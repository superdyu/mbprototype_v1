// GENERATED from onboarding-script.json — do not hand-edit.
// Regenerate: bash scripts/wrap-data.sh
//
// The app runs on file://, where fetch() is blocked and there is no dev
// server, so spec data ships as a script-loadable assignment (L13).
// The .json beside this file is the byte-identical spec copy.
const ONBOARDING_SCRIPT =
{
  "_note": "Narration for the onboarding intro video. Same shape as daily-scripts.json so scripts/gen-audio.sh can read both with one extractor. NOT a spec copy — the onboarding intro is a v3 addition, so there is no byte-parity requirement here (unlike daily-scripts.json).",
  "method": {
    "estimatedWpm": 165,
    "_note": "Fallback pace when no .wav has been generated. Matches DU_WPM."
  },
  "scripts": [
    {
      "id": "onboarding_intro",
      "segments": [
        {
          "id": "s1",
          "text": "Here's the short version of how this works — no pressure, no jargon."
        },
        {
          "id": "s2",
          "text": "Each day I'll ask you a few quick questions about your money. That's your Money Journal."
        },
        {
          "id": "s3",
          "text": "Every answer fills in a little more of your picture — what you spend on, what matters to you, where things feel tight."
        },
        {
          "id": "s4",
          "text": "The more you tell me, the more your lessons and check-ins shape around your life, not some generic average."
        },
        {
          "id": "s5",
          "text": "So the read you get, and the peers I hold you up against, actually fit you."
        },
        {
          "id": "s6",
          "text": "That's it. Answer a little each day and I'll handle the rest. Let's get you set up."
        }
      ]
    }
  ]
}
;
