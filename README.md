<h1 align="center">🏆 Pro Quiz Master</h1>

<p align="center">
  <strong>An Advanced, Secure, & Real-Time Interactive Quiz System</strong><br>
  <br>
  <a href="https://ahm3dramad3n.github.io/ProQuizMaster/"><strong>« Live Demo »</strong></a>
</p>

---

## 📖 About The Project

**Pro Quiz Master** is a sophisticated, real-time web application designed to host competitive quizzes. It empowers organizers to create and seamlessly manage quiz rooms, while allowing participants to compete instantly. Powered by a Firebase Real-Time Database and engineered with strict security measures, it ensures zero-latency interactions, fair play, and a highly engaging multiplayer experience.

## ✨ Key Features

* ⚡️ **Lightning-Fast Responses:** Real-time updates and synchronization powered by Firebase.
* 📱 **Progressive Web App (PWA):** Installable on devices with Service Worker integration for a native-like experience.
* 🎨 **Glassmorphism UI:** A sleek, modern, and visually appealing interface built with Tailwind CSS, featuring smooth animations.
* 🔒 **Smart Access Control:** Automatically secures the room by blocking new joins once the maximum capacity is reached, the first question is triggered, or if a duplicate name is detected.
* 🎮 **Full Admin Control:** A dedicated dashboard for the quiz master to push questions, adjust scores (+/- points), and reset player buzzers.
* 🥇 **Live Leaderboard:** A dynamic scoreboard that updates instantly to broadcast the current standings of all competitors (Admin hidden from players list).
* 🎉 **Victory Screen:** A celebratory culmination screen highlighting the ultimate champion at the end of the match, locking the game state securely.

## 🛡️ Security & Advanced Architecture

Unlike standard quiz apps, this system is hardened against client-side manipulation and competitive cheating:
* **Firebase Security Rules:** Strict server-side validation ensuring participants can only mutate specific allowed fields (like triggering the buzzer) while locking critical data like scores and game state strictly to the Room Admin.
* **Race Condition Prevention:** Utilizes atomic database transactions (`runTransaction`) to guarantee absolute fairness when multiple players press the buzzer in the exact same millisecond.
* **UID-Based Identity & Anonymous Auth:** Players and Admins are tracked via securely generated UIDs rather than mutable display names, preventing score hijacking and identity spoofing.
* **Anti-XSS Protection:** Safe DOM rendering using `createElement` and `textContent` to neutralize any Cross-Site Scripting (XSS) payload attempts via user input.
* **API Key Hardening:** Cloud console restrictions applied to ensure database connections are only accepted from the authorized production domain.

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
