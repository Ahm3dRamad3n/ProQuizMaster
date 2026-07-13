<h1 align="center">🏆 Genius Competitions</h1>

<p align="center">
  <strong>An Advanced, Secure, & Real-Time Interactive Quiz System</strong><br>
  <br>
  <a href="https://ahm3dramad3n.github.io/GeniusCompetitions/"><strong>« Live Demo »</strong></a>
</p>

---

## 📖 About The Project

**Genius Competitions** (formerly Pro Quiz Master) is a sophisticated, real-time web application designed to host high-stakes competitive quizzes. It empowers organizers to seamlessly manage quiz rooms, prepare question banks, and judge answers, while allowing participants to compete instantly. Powered by a Firebase Real-Time Database and engineered with strict security measures, it features a fair-play Queue System, smart timer management, zero-latency interactions, and a highly engaging multiplayer experience.

## ✨ Key Features

* ⚡️ **Real-Time Queue System (FIFO):** Replaced the basic lock-out buzzer. Players are queued based on the exact millisecond they press the buzzer. If the first player answers incorrectly, the turn instantly passes to the next player in the queue.
* ⏱️ **Smart Timer Management:** The game timer automatically pauses when a player is answering, resumes if they answer incorrectly, and auto-terminates the round instantly if all active players exhaust their attempts.
* 📚 **Built-in Question Bank & Dashboard:** Admins can prepare a queue of questions locally and push them sequentially with a single click, or send custom manual questions on the fly.
* 🖼️ **Multimedia Support:** Rich question formatting allowing Admins to attach image URLs or directly upload local image files to accompany the text.
* 👨‍⚖️ **Granular Judging Controls:** Admins can award points (+10 for correct), deduct points (-5 for wrong), or mark an answer incorrect without penalty (0), which dynamically updates the queue and player scores.
* 🎨 **Dynamic UI & Glassmorphism:** A sleek, modern interface built with Tailwind CSS that visually reacts to game states (e.g., Green for resolved correct, Red for all wrong, Yellow for time-up).
* 📱 **Progressive Web App (PWA):** Installable on mobile and desktop devices with Service Worker integration for a native-like experience.

## 🛡️ Security & Advanced Architecture

Unlike standard quiz apps, this system is deeply hardened against client-side manipulation and competitive cheating:
* **Strict Firebase Security Rules:** "Deny by Default" architecture. Participants can only mutate specific allowed fields (like adding themselves to the queue) while critical data like scores, timer state, and game status are strictly locked to the Room Admin.
* **Race Condition Prevention:** Utilizes atomic database transactions (`runTransaction`) and precise timestamps to maintain a strict First-In-First-Out (FIFO) queue when multiple players press the buzzer in the exact same millisecond.
* **UID-Based Identity & Anonymous Auth:** Players and Admins are tracked via securely generated Firebase UIDs rather than mutable display names, preventing score hijacking and identity spoofing.
* **State Machine Logic:** The game operates on strict server-synced states (`IDLE`, `ACTIVE`, `RESOLVED_CORRECT`, `ALL_WRONG`, `TIME_UP`), preventing actions out of turn.
* **Anti-XSS Protection:** Safe DOM rendering using `createElement` and `textContent` to neutralize any Cross-Site Scripting (XSS) payload attempts via user input.

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white" alt="Firebase" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=GitHub&logoColor=white" alt="GitHub Pages" />
</p>

## 👨‍💻 Developer

**Ahmed Ramadan** *Software Developer | CS Student*
* GitHub: [@Ahm3dRamad3n](https://github.com/Ahm3dRamad3n)

## 📄 License

This project is open-source and available under the **MIT License**.
