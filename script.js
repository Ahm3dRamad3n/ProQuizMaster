import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  update,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEnxivKgtiOKM1hlSlyqrUCpsE6czIDD0",
  authDomain: "genius-competitions.firebaseapp.com",
  databaseURL: "https://genius-competitions-default-rtdb.firebaseio.com",
  projectId: "genius-competitions",
  storageBucket: "genius-competitions.firebasestorage.app",
  messagingSenderId: "973361156681",
  appId: "1:973361156681:web:240961bded965bfea46598",
  measurementId: "G-D0N00M781J",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

let myUid = null;
let myName = "";
let currentRoom = "";
let isOwner = false;
let localRoomData = null;
let questionBank = [];

onAuthStateChanged(auth, (user) => {
  if (user) {
    myUid = user.uid;
    console.log("Logged in securely with ID:", myUid);
  } else {
    signInAnonymously(auth).catch((error) =>
      console.error("Auth Error:", error),
    );
  }
});

function safeText(value) {
  return value == null ? "" : String(value);
}

async function requireAuth() {
  if (myUid) return myUid;
  if (auth.currentUser) return (myUid = auth.currentUser.uid);
  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        myUid = user.uid;
        unsubscribe();
        resolve();
      }
    });
  });
  return myUid;
}

window.createRoom = async function () {
  try {
    await requireAuth();
    myName = document.getElementById("username").value.trim();
    const max =
      (parseInt(document.getElementById("maxPlayers").value, 10) || 4) + 1;
    const qTime =
      parseInt(document.getElementById("questionTime").value, 10) || 15;
    if (!myName) return alert("الاسم مطلوب");

    currentRoom = Math.random().toString(36).substring(2, 7).toUpperCase();
    isOwner = true;

    await set(ref(db, "rooms/" + currentRoom), {
      owner: myName,
      adminToken: myUid,
      maxPlayers: max,
      timeLimit: qTime,
      status: "IDLE",
      currentQuestion: "في انتظار بدء المسابقة...",
      timer: 0,
      timerState: "STOPPED",
      showWinner: false,
    });

    await set(ref(db, `rooms/${currentRoom}/players/${myUid}`), {
      displayName: myName,
      score: 0,
    });
    enterRoom();
    startAdminTimerLoop();
  } catch (error) {
    alert("تعذر إنشاء الغرفة.");
  }
};

window.joinRoom = async function () {
  try {
    await requireAuth();
    myName = document.getElementById("username").value.trim();
    currentRoom = document
      .getElementById("roomInput")
      .value.trim()
      .toUpperCase();
    if (!myName || !currentRoom) return alert("بيانات ناقصة");

    const roomRef = ref(db, "rooms/" + currentRoom);
    const snap = await get(roomRef);
    const data = snap.val();
    if (!data) return alert("الغرفة غير موجودة");

    const isAlreadyIn = Boolean(data.players?.[myUid]);
    const playersCount = data.players ? Object.keys(data.players).length : 0;

    if (data.status !== "IDLE" && !isAlreadyIn)
      return alert("المسابقة بدأت بالفعل!");
    if (playersCount >= data.maxPlayers && !isAlreadyIn)
      return alert("الغرفة ممتلئة!");

    if (!isAlreadyIn) {
      await set(ref(db, `rooms/${currentRoom}/players/${myUid}`), {
        displayName: myName,
        score: 0,
      });
    } else {
      await update(ref(db, `rooms/${currentRoom}/players/${myUid}`), {
        displayName: myName,
      });
    }
    enterRoom();
  } catch (error) {
    alert("تعذر الانضمام.");
  }
};

function enterRoom() {
  document.getElementById("setup-area").classList.add("hidden");
  document.getElementById("room-area").classList.remove("hidden");
  document.getElementById("displayCode").textContent = "ROOM: " + currentRoom;

  if (isOwner) {
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("participant-view").classList.add("hidden");
  }

  onValue(ref(db, "rooms/" + currentRoom), (snap) => {
    localRoomData = snap.val();
    if (!localRoomData) return;
    updateUI();
  });
}

// ================= إدارة بنك الأسئلة =================
window.addQuestionToBank = function () {
  const qInput = document.getElementById("newQuestion");
  const imgInput = document.getElementById("questionImage");
  const qText = qInput.value.trim();
  const imgUrl = imgInput.value.trim();

  if (qText) {
    questionBank.push({ text: qText, image: imgUrl });
    qInput.value = "";
    imgInput.value = "";
    renderBankList();
    updateUI();
  } else {
    alert("اكتب نص السؤال أولاً لإضافته للبنك!");
  }
};

function renderBankList() {
  const list = document.getElementById("bankQuestionsList");
  if (questionBank.length === 0) {
    list.innerHTML =
      '<p class="text-xs text-slate-500 text-center py-2">البنك فارغ. أضف أسئلة أعلاه للبدء.</p>';
    return;
  }
  list.innerHTML = questionBank
    .map(
      (q, index) =>
        `<div class="bg-slate-800 p-2 rounded text-sm text-slate-300 flex justify-between items-center gap-2">
            <span class="truncate flex-1">${index + 1}. ${q.text} ${q.image ? "🖼️" : ""}</span>
            <button onclick="removeQuestion(${index})" class="text-red-400 hover:text-red-300 text-xs shrink-0">🗑️</button>
        </div>`,
    )
    .join("");
}

window.removeQuestion = function (index) {
  questionBank.splice(index, 1);
  renderBankList();
  updateUI();
};

window.sendNextBankQuestion = function () {
  if (questionBank.length > 0) {
    const nextQ = questionBank.shift();
    renderBankList();
    sendQuestionLogic(nextQ.text, nextQ.image);
  }
};

window.sendQuestion = function () {
  const q = document.getElementById("newQuestion").value.trim();
  const imgUrl = document.getElementById("questionImage").value.trim();
  if (q) {
    sendQuestionLogic(q, imgUrl);
    document.getElementById("newQuestion").value = "";
    document.getElementById("questionImage").value = "";
  }
};

async function sendQuestionLogic(questionText, imgUrl) {
  if (localRoomData.showWinner) return alert("المسابقة انتهت.");
  const timeLimit =
    parseInt(document.getElementById("questionTime").value, 10) ||
    localRoomData.timeLimit ||
    15;

  await update(ref(db, "rooms/" + currentRoom), {
    currentQuestion: questionText,
    questionImage: imgUrl || "",
    status: "ACTIVE",
    timer: timeLimit,
    timerState: "RUNNING",
    queue: null,
    attempts: null,
  });
}

// ================= نظام الطابور (Buzzer & Queue) =================
window.pressBuzzer = async function () {
  if (
    !localRoomData ||
    localRoomData.status !== "ACTIVE" ||
    localRoomData.showWinner
  )
    return;

  const btn = document.getElementById("buzzBtn");
  if (btn) btn.disabled = true;

  const now = Date.now();
  try {
    await update(ref(db, `rooms/${currentRoom}`), {
      [`queue/${myUid}`]: now,
      [`attempts/${myUid}`]: true,
    });
  } catch (err) {
    if (btn) btn.disabled = false;
  }
};

window.givePoints = async function (pts) {
  if (!isOwner || !localRoomData.queue) return;

  const sortedQueue = Object.entries(localRoomData.queue).sort(
    (a, b) => a[1] - b[1],
  );
  const activeUid = sortedQueue[0][0];

  if (pts !== 0) {
    const scoreRef = ref(db, `rooms/${currentRoom}/players/${activeUid}/score`);
    const snap = await get(scoreRef);
    await set(scoreRef, (snap.val() || 0) + pts);
  }

  if (pts > 0) {
    await update(ref(db, "rooms/" + currentRoom), {
      status: "RESOLVED_CORRECT",
      queue: null,
      timerState: "STOPPED",
    });
  } else {
    await remove(ref(db, `rooms/${currentRoom}/queue/${activeUid}`));

    const updatedSnap = await get(ref(db, "rooms/" + currentRoom));
    const updatedRoom = updatedSnap.val();

    const hasMoreInQueue =
      updatedRoom.queue && Object.keys(updatedRoom.queue).length > 0;
    const totalPlayers = updatedRoom.players
      ? Object.keys(updatedRoom.players).length - 1
      : 0;
    const totalAttempts = updatedRoom.attempts
      ? Object.keys(updatedRoom.attempts).length
      : 0;

    if (!hasMoreInQueue) {
      // الإضافة الجديدة: فحص هل كل اللاعبين استنفذوا محاولاتهم
      if (totalAttempts >= totalPlayers && totalPlayers > 0) {
        await update(ref(db, "rooms/" + currentRoom), {
          status: "ALL_WRONG",
          timer: 0,
          timerState: "STOPPED",
        });
      } else if (updatedRoom.timer <= 0) {
        await update(ref(db, "rooms/" + currentRoom), { status: "TIME_UP" });
      }
    }
  }
};

window.reloadTimer = async function () {
  if (isOwner) {
    const timeLimit =
      parseInt(document.getElementById("questionTime").value, 10) ||
      localRoomData.timeLimit ||
      15;
    await update(ref(db, "rooms/" + currentRoom), {
      timer: timeLimit,
      timerState: "RUNNING",
      status: "ACTIVE",
      queue: null,
    });
  }
};

function startAdminTimerLoop() {
  setInterval(async () => {
    if (!isOwner || !localRoomData) return;

    const queueExists =
      localRoomData.queue && Object.keys(localRoomData.queue).length > 0;

    if (localRoomData.status === "ACTIVE") {
      if (queueExists && localRoomData.timerState === "RUNNING") {
        await update(ref(db, "rooms/" + currentRoom), { timerState: "PAUSED" });
      } else if (
        !queueExists &&
        localRoomData.timerState === "PAUSED" &&
        localRoomData.timer > 0
      ) {
        await update(ref(db, "rooms/" + currentRoom), {
          timerState: "RUNNING",
        });
      }
    }

    if (
      localRoomData.status === "ACTIVE" &&
      localRoomData.timerState === "RUNNING" &&
      localRoomData.timer > 0
    ) {
      let newTime = localRoomData.timer - 1;
      if (newTime <= 0) {
        await update(ref(db, "rooms/" + currentRoom), {
          timer: 0,
          timerState: "STOPPED",
          status: "TIME_UP",
        });
      } else {
        await update(ref(db, "rooms/" + currentRoom), { timer: newTime });
      }
    }
  }, 1000);
}

// ================= تحديث الواجهة الرسومية الديناميكية =================
function updateUI() {
  const data = localRoomData;
  if (data.showWinner) return renderWinner(data.players, data.adminToken);

  const imgContainer = document.getElementById("imageContainer");
  if (data.questionImage) {
    document.getElementById("displayImg").src = data.questionImage;
    imgContainer.classList.remove("hidden");
  } else {
    imgContainer.classList.add("hidden");
  }

  const qDisplay = document.getElementById("questionDisplay");
  qDisplay.className =
    "text-2xl text-center font-bold py-6 min-h-[100px] border-b border-slate-700 transition-colors duration-300";

  // معالجة حالة ALL_WRONG الجديدة لعرض لون أحمر فوري
  if (data.status === "ACTIVE") {
    qDisplay.textContent = data.currentQuestion;
    qDisplay.classList.add("status-active");
  } else if (data.status === "RESOLVED_CORRECT") {
    qDisplay.textContent =
      "✅ " + data.currentQuestion + " (تمت الإجابة بشكل صحيح)";
    qDisplay.classList.add("status-correct");
  } else if (data.status === "TIME_UP") {
    qDisplay.textContent = "⌛ انتهى الوقت دون إجابة صحيحة!";
    qDisplay.classList.add("status-timeup");
  } else if (data.status === "ALL_WRONG") {
    qDisplay.textContent =
      "❌ " + data.currentQuestion + " (لا أحد يمتلك الإجابة الصحيحة!)";
    qDisplay.classList.add("status-wrong");
  } else {
    qDisplay.textContent = data.currentQuestion;
    qDisplay.classList.add("status-active");
  }

  document.getElementById("timerDisplay").textContent =
    data.timer > 0 ? data.timer + "s" : "0s";

  if (isOwner) {
    // تحديث الحالات المسموح فيها بإرسال سؤال جديد
    const canSendNew =
      data.status === "IDLE" ||
      data.status === "RESOLVED_CORRECT" ||
      data.status === "TIME_UP" ||
      data.status === "ALL_WRONG";
    document.getElementById("nextQBtn").disabled =
      !canSendNew || questionBank.length === 0;

    const hasCustomText =
      document.getElementById("newQuestion").value.trim() !== "";
    document.getElementById("sendBtn").disabled = !canSendNew || !hasCustomText;

    const totalPlayers = data.players
      ? Object.keys(data.players).length - 1
      : 0;
    const totalAttempts = data.attempts ? Object.keys(data.attempts).length : 0;

    // زر الإعادة يظهر فقط لو الوقت انتهى ومفيش حالة (الجميع أخطأ) لأن لو كلهم أخطأوا مفيش حد متاح نعيدله الوقت
    const canReloadTimer =
      data.status === "TIME_UP" &&
      totalAttempts < totalPlayers &&
      totalPlayers > 0;
    document
      .getElementById("reloadTimerBtn")
      .classList.toggle("hidden", !canReloadTimer);
  }

  let activePlayerUid = null;
  let activePlayerName = "";
  let myQueuePosition = -1;

  if (data.queue) {
    const sortedQueue = Object.entries(data.queue).sort((a, b) => a[1] - b[1]);
    activePlayerUid = sortedQueue[0][0];
    activePlayerName = data.players?.[activePlayerUid]?.displayName || "مشارك";

    const myIndex = sortedQueue.findIndex((q) => q[0] === myUid);
    if (myIndex !== -1) myQueuePosition = myIndex + 1;
  }

  if (!isOwner) {
    const btn = document.getElementById("buzzBtn");
    const hasAttempted = data.attempts?.[myUid];

    btn.disabled = hasAttempted || data.status !== "ACTIVE";

    const statusMsg = document.getElementById("statusMsg");
    const queueStatus = document.getElementById("queueStatus");
    const queuePosition = document.getElementById("queuePosition");

    if (activePlayerUid) {
      if (activePlayerUid === myUid) {
        statusMsg.textContent = "🔥 دورك للإجابة الآن! تحدّث سريعاً!";
        statusMsg.className =
          "mt-4 text-emerald-400 font-bold text-lg animate-pulse";
        queueStatus.classList.add("hidden");
      } else {
        statusMsg.textContent = `🎤 يجاوب الآن: ${activePlayerName}`;
        statusMsg.className = "mt-4 text-yellow-400 font-bold";
        if (myQueuePosition > 1) {
          queueStatus.classList.remove("hidden");
          queuePosition.textContent = `ترتيبك الحالي في الطابور: ${myQueuePosition}`;
        } else {
          queueStatus.classList.add("hidden");
        }
      }
    } else {
      statusMsg.textContent =
        data.status === "ACTIVE"
          ? hasAttempted
            ? "🚨 استنفذت محاولتك لهذا السؤال!"
            : "أسرع بالضغط على البازر!"
          : "استعد.. في انتظار السؤال القادم";
      statusMsg.className = "mt-4 text-slate-400 font-bold";
      queueStatus.classList.add("hidden");
    }
  }

  if (isOwner) {
    const judgePanel = document.getElementById("judge-actions");
    if (activePlayerUid && data.status === "ACTIVE") {
      judgePanel.classList.remove("hidden");
      judgePanel.classList.add("flex");
      document.getElementById("whoPressed").textContent =
        `اللاعب الحالي: ${activePlayerName}`;
      document.getElementById("queueCount").textContent =
        `في الانتظار: ${Object.keys(data.queue).length}`;
    } else {
      judgePanel.classList.add("hidden");
      judgePanel.classList.remove("flex");
    }
  }

  renderLeaderboard(data.players, data.adminToken);
}

window.handleFileUpload = function (input) {
  const file = input.files[0];
  const sendBtn = document.getElementById("sendBtn");
  if (file) {
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerText = "جاري التجهيز... ⏳";
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("الصورة كبيرة جداً! الحد الأقصى 2MB.");
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerText = "إرسال السؤال المخصص 🚀";
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("questionImage").value = e.target.result;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerText = "إرسال السؤال المخصص 🚀";
      }
      updateUI();
    };
    reader.readAsDataURL(file);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const qInput = document.getElementById("newQuestion");
  if (qInput) {
    qInput.addEventListener("input", () => {
      if (localRoomData) updateUI();
    });
  }
});

function renderLeaderboard(players, adminUid) {
  const board = document.getElementById("leaderboard");
  if (!board) return;
  board.replaceChildren();
  if (!players) return;
  Object.entries(players)
    .filter(([uid]) => uid !== adminUid)
    .sort(([, a], [, b]) => (b?.score ?? 0) - (a?.score ?? 0))
    .forEach(([, pData]) => {
      const row = document.createElement("div");
      row.className =
        "flex justify-between bg-slate-800 p-2 rounded-lg border-l-4 border-blue-500";
      row.innerHTML = `<span>${safeText(pData?.displayName)}</span><span class="font-bold text-emerald-400">${pData?.score ?? 0}</span>`;
      board.appendChild(row);
    });
}

window.showWinner = async function () {
  if (isOwner)
    await update(ref(db, "rooms/" + currentRoom), { showWinner: true });
};

function renderWinner(players, adminUid) {
  document.getElementById("room-area").classList.add("hidden");
  document.getElementById("winner-screen").classList.remove("hidden");
  const rankedPlayers = Object.entries(players || {})
    .filter(([uid]) => uid !== adminUid)
    .sort((a, b) => b[1].score - a[1].score);
  const topScore = rankedPlayers[0]?.[1]?.score ?? 0;
  const winners = rankedPlayers
    .filter(([, p]) => (p.score ?? 0) === topScore)
    .map(([, p]) => p.displayName || "مشارك");

  const winnerName = document.getElementById("winnerName");
  winnerName.replaceChildren();
  winners.forEach((name) => {
    const row = document.createElement("div");
    row.textContent = `${name} 🎉`;
    winnerName.appendChild(row);
  });
}
