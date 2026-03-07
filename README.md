# Psychology Flashcards PWA

Mobile-first flashcard study app implemented in plain HTML, CSS and JavaScript with offline support via a service worker.

## Features

- Upload flashcards from raw JSON and assign them to named books that you define.
- Study view with filters for book name and language (`cs` / `en`).
- Weighted random selection based on each card's `weight` field.
- Support for `multiple_choice`, `fill_in_blank` and `open_ended` cards.
- Confidence rating after each question adjusts `weight`, updates `timesCorrect` / `timesWrong`, and sets `lastSeen`.
- Wrong answers log showing cards with `timesWrong > 0`, sorted by most wrong answers first.
- All data is stored in `localStorage` and persisted after every interaction.
- Installable PWA with offline caching of the core assets.

## Card schema

Each flashcard object should follow this schema:

```json
{
  "id": "1",
  "type": "multiple_choice | fill_in_blank | open_ended",
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ...", "E. ..."],
  "correct": "...",
  "topic": "...",
  "book": "My custom book name",
  "language": "cs | en",
  "weight": 1.0,
  "timesCorrect": 0,
  "timesWrong": 0,
  "lastSeen": null
}
```

For `multiple_choice` cards, `options` must be an array of answer strings and `correct` should match one of them. For other card types, `options` is not used and `correct` contains the answer.

Note: when uploading, you can either select an existing book or type a new book name; whichever you choose overwrites the `book` field on each card.

## Running locally

Serve the folder with any static file server so that the PWA and service worker work correctly. For example, with Node.js installed:

```bash
npx serve .
```

Then open the local URL (e.g. `http://localhost:3000`) in your browser, upload your JSON, and start studying.

