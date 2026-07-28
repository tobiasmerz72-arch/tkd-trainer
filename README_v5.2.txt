Tobi's Taekwon-Do Academy v5.2 — Animated Intro

Upload and replace:
- index.html
- app.js
- styles.css
- sw.js

The existing tkd-hero.png is used for George, so no new image is required.

How it works:
- The app opens on a full-screen title page.
- George enters with a dramatic side-piercing-kick motion, impact ring and speed lines.
- Swipe left or swipe up to enter the existing start screen.
- Touching the intro replays the kick and triggers the sound/haptic effect.

Important iPhone limitation:
iOS does not reliably allow sound to autoplay before the user touches the screen. The visual animation starts automatically; the kick sound plays on the first touch/swipe, which is the most reliable behaviour in an installed Home Screen app.
