
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
        import { getDatabase, ref, set, onValue, update, push, runTransaction, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "AIzaSyC7ovcq2UUgk9iY5r_kOdN1k38sIwmLJz4",
            authDomain: "competitionapp-14dd2.firebaseapp.com",
            databaseURL: "https://competitionapp-14dd2-default-rtdb.firebaseio.com/",
            projectId: "competitionapp-14dd2",
            storageBucket: "competitionapp-14dd2.firebasestorage.app",
            messagingSenderId: "111940102162",
            appId: "1:111940102162:web:a74ee801c6fa371b0c10cb"
        };

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const auth = getAuth(app);
        let myUid = null;

        onAuthStateChanged(auth, (user) => {
            if (user) {
                myUid = user.uid; 
                console.log("Logged in securely with ID:", myUid);
            } else {
                signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
            }
        });

        let myName, currentRoom, isOwner = false, timerInterval;

        function safeText(value) {
            return value == null ? "" : String(value);
        }

        async function requireAuth() {
            if (myUid) {
                return myUid;
            }

            if (auth.currentUser) {
                myUid = auth.currentUser.uid;
                return myUid;
            }

            await new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    if (user) {
                        myUid = user.uid;
                        unsubscribe();
                        resolve();
                    }
                });
            });

            if (!myUid) {
                throw new Error("Authentication not ready");
            }

            return myUid;
        }

        async function getRoomSnapshot() {
            if (!currentRoom) {
                throw new Error("No active room");
            }

            return get(ref(db, 'rooms/' + currentRoom));
        }

        async function requireAdminRoom() {
            await requireAuth();
            const snap = await getRoomSnapshot();
            const room = snap.val();

            if (!room) {
                throw new Error("Room not found");
            }

            if (room.adminToken !== myUid) {
                throw new Error("Unauthorized");
            }

            return room;
        }

        function renderPlayerRow(name, score) {
            const row = document.createElement('div');
            row.className = 'flex justify-between bg-slate-800 p-2 rounded-lg border-l-4 border-blue-500';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = safeText(name);

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'font-bold text-emerald-400';
            scoreSpan.textContent = String(score ?? 0);

            row.append(nameSpan, scoreSpan);
            return row;
        }

        window.createRoom = async function() {
            try {
                await requireAuth();
                myName = document.getElementById('username').value.trim();
                const max = parseInt(document.getElementById('maxPlayers').value, 10) || 5;
                const qTime = parseInt(document.getElementById('questionTime').value, 10) || 15;
                if(!myName) return alert("الاسم مطلوب");

                currentRoom = Math.random().toString(36).substring(2, 7).toUpperCase();
                isOwner = true;

                await set(ref(db, 'rooms/' + currentRoom), {
                    owner: myName,
                    adminToken: myUid,
                    maxPlayers: max,
                    timeLimit: qTime,
                    gameStarted: false,
                    currentQuestion: "في انتظار السؤال الأول...",
                    buzzerLocked: true,
                    pressedByUid: "",
                    pressedByName: "",
                    timer: 0,
                    showWinner: false
                });

                await set(ref(db, `rooms/${currentRoom}/players/${myUid}`), {
                    displayName: myName,
                    score: 0
                });

                enterRoom();
            } catch (error) {
                console.error("Failed to create room:", error);
                alert("تعذر إنشاء الغرفة. تحقق من الاتصال ثم أعد المحاولة.");
            }
        };

        window.joinRoom = async function() {
            try {
                await requireAuth();
                myName = document.getElementById('username').value.trim();
                currentRoom = document.getElementById('roomInput').value.trim().toUpperCase();
                if(!myName || !currentRoom) return alert("بيانات ناقصة");

                const roomRef = ref(db, 'rooms/' + currentRoom);
                const snap = await get(roomRef);
                const data = snap.val();
                if(!data) return alert("الغرفة غير موجودة");

                const isAlreadyIn = Boolean(data.players?.[myUid]);
                const playersCount = data.players ? Object.keys(data.players).length : 0;

                if (data.gameStarted && !isAlreadyIn) {
                    console.log("Access Denied: Game Started");
                    alert("المسابقة بدأت بالفعل، لا يمكن الدخول!");
                    return;
                }

                if(playersCount >= data.maxPlayers && !isAlreadyIn) {
                    console.log("Access Denied: Room Full");
                    alert("الغرفة ممتلئة!");
                    return;
                }

                if(!isAlreadyIn) {
                    await set(ref(db, `rooms/${currentRoom}/players/${myUid}`), {
                        displayName: myName,
                        score: 0
                    });
                } else {
                    await update(ref(db, `rooms/${currentRoom}/players/${myUid}`), {
                        displayName: myName
                    });
                }

                enterRoom();
            } catch (error) {
                console.error("Failed to join room:", error);
                alert("تعذر الانضمام إلى الغرفة. تحقق من الاتصال ثم أعد المحاولة.");
            }
        };

        function enterRoom() {
            document.getElementById('setup-area').classList.add('hidden');
            document.getElementById('room-area').classList.remove('hidden');
            document.getElementById('displayCode').textContent = "ROOM: " + currentRoom;

            if(isOwner) {
                document.getElementById('admin-panel').classList.remove('hidden');
                document.getElementById('participant-view').classList.add('hidden');
            }

            onValue(ref(db, 'rooms/' + currentRoom), (snap) => {
                const data = snap.val();
                if(!data) return;

                if(data.showWinner) return renderWinner(data.players);

                const imgContainer = document.getElementById('imageContainer');
                const displayImg = document.getElementById('displayImg');

                if(data.questionImage) {
                    displayImg.src = data.questionImage;
                    imgContainer.classList.remove('hidden');
                } else {
                    displayImg.src = "";
                    imgContainer.classList.add('hidden');
                }

                const qDisplay = document.getElementById('questionDisplay');
                qDisplay.textContent = data.currentQuestion;

                if (data.currentQuestion.includes("✅")) {
                    qDisplay.style.color = "#22c55e"; // أخضر نجاح
                } else if (data.currentQuestion.includes("❌")) {
                    qDisplay.style.color = "#ef4444"; // أحمر فشل
                } else {
                    qDisplay.style.color = "white";    // أبيض للسؤال العادي
                }

                document.getElementById('timerDisplay').textContent = data.timer > 0 ? data.timer + "s" : "⌛";
                
                const totalPlayers = data.players ? Object.keys(data.players).length : 0;
                const totalAttempts = data.attempts ? Object.keys(data.attempts).length : 0;

                if (totalAttempts >= totalPlayers && totalPlayers > 0 && !data.buzzerLocked && !data.currentQuestion.includes("✅")) {
                    if (!data.currentQuestion.includes("❌")) { 
                        update(ref(db, 'rooms/' + currentRoom), {
                            currentQuestion: "❌ لم يستطع أحد الإجابة بشكل صحيح! استعد للسؤال القادم..",
                            buzzerLocked: true
                        });
                    }
                }

                // --- تحديث حالة الزر والرسائل التوضيحية ---
                const btn = document.getElementById('buzzBtn');
                if (btn) {
                    btn.disabled = data.buzzerLocked;
                }

                if(data.buzzerLocked && data.pressedByName) {
                    document.getElementById('statusMsg').textContent = "🚨 ضغط: " + data.pressedByName;
                    if(isOwner) {
                        document.getElementById('judge-actions').classList.remove('hidden');
                        document.getElementById('whoPressed').textContent = "المجيب: " + data.pressedByName;
                    }
                } else {
                    document.getElementById('statusMsg').textContent = "أسرع بالضغط!";
                    document.getElementById('judge-actions').classList.add('hidden');
                }

                renderLeaderboard(data.players);
            });
        }

        window.handleFileUpload = function(input) {
            const file = input.files[0];
            const sendBtn = document.getElementById('sendBtn'); 
            if (file) {
                sendBtn.disabled = true;
                sendBtn.innerText = "جاري تجهيز الصورة... ⏳";
                sendBtn.classList.add('opacity-50', 'cursor-not-allowed');

                if (file.size > 2 * 1024 * 1024) { // تنبيه لو الصورة أكبر من 2 ميجا
                    alert("الصورة كبيرة جداً! اختر صورة أقل من 2 ميجابايت.");
                    sendBtn.disabled = false;
                    sendBtn.innerText = "إرسال السؤال 🚀";
                    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    // نضع النتيجة (الرابط الطويل) في خانة الـ URL
                    document.getElementById('questionImage').value = e.target.result;
                    sendBtn.disabled = false;
                    sendBtn.innerText = "إرسال السؤال 🚀";
                    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                };
                reader.readAsDataURL(file);
            }
        };

        window.sendQuestion = async function() {
            document.getElementById('questionDisplay').style.color = "white";

            try {
                const room = await requireAdminRoom();
                if (room.showWinner) {
                    alert("المسابقة انتهت بالفعل. لا يمكن إرسال سؤال جديد بعد إعلان الفائز.");
                    return;
                }

                const q = document.getElementById('newQuestion').value.trim();
                const imgUrl = document.getElementById('questionImage').value.trim();
                const roomRef = ref(db, 'rooms/' + currentRoom);
                const timeLimit = parseInt(document.getElementById('questionTime').value, 10) || 15;

                clearInterval(timerInterval);
                await update(roomRef, {
                    currentQuestion: q,
                    buzzerLocked: false,
                    questionImage: imgUrl || "",
                    pressedByUid: "",
                    pressedByName: "",
                    attempts: {},
                    gameStarted: true,
                    timer: timeLimit
                });

                let timeLeft = timeLimit;
                timerInterval = setInterval(async () => {
                    timeLeft--;
                    try {
                        await update(ref(db, 'rooms/' + currentRoom), { timer: timeLeft });
                        if(timeLeft <= 0) {
                            clearInterval(timerInterval);
                            await update(ref(db, 'rooms/' + currentRoom), { buzzerLocked: true, timer: 0 });
                        }
                    } catch (error) {
                        console.error("Timer update failed:", error);
                        clearInterval(timerInterval);
                    }
                }, 1000);
            } catch (error) {
                console.error("Failed to send question:", error);
                alert("تعذر إرسال السؤال أو لا تملك صلاحية المنظم.");
            }
        };

window.pressBuzzer = async function() {
    const btn = document.getElementById('buzzBtn');
    if(btn) btn.disabled = true;

    try {
        await requireAuth();
        const roomSnap = await getRoomSnapshot();
        const room = roomSnap.val();

        if (!room || room.showWinner || room.buzzerLocked) {
            if(btn) btn.disabled = false;
            return;
        }

        const attemptSnap = await get(ref(db, `rooms/${currentRoom}/attempts/${myUid}`));
        if(attemptSnap.val()) {
            alert("لقد استخدمت محاولتك في هذا السؤال بالفعل!");
            if(btn) btn.disabled = false;
            return;
        }

        const pressedByRef = ref(db, `rooms/${currentRoom}/pressedByUid`);
        const result = await runTransaction(pressedByRef, (currentValue) => {
            if (!currentValue || currentValue === "") {
                return myUid;
            }
            return;
        });

        if (result.committed && result.snapshot.val() === myUid) {
            await update(ref(db, `rooms/${currentRoom}`), {
                buzzerLocked: true,
                pressedByUid: myUid,
                pressedByName: myName,
                [`attempts/${myUid}`]: true,
                timer: 0
            });
        } else if(btn) {
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Failed to press buzzer:", error);
        if(btn) btn.disabled = false;
        alert("تعذر تسجيل الإجابة. تحقق من الاتصال ثم أعد المحاولة.");
    }
};

window.givePoints = async function(pts) {
    try {
        const room = await requireAdminRoom();
        if (room.showWinner) {
            alert("المسابقة انتهت بالفعل. لا يمكن تعديل النقاط بعد إعلان الفائز.");
            return;
        }

        const pressedSnap = await get(ref(db, 'rooms/' + currentRoom + '/pressedByUid'));
        const userId = pressedSnap.val();
        if(!userId) return;

        const scoreRef = ref(db, `rooms/${currentRoom}/players/${userId}/score`);
        await runTransaction(scoreRef, (current) => (current || 0) + pts);

        const roomRef = ref(db, 'rooms/' + currentRoom);
        if (pts > 0) {
            await update(roomRef, {
                currentQuestion: "✅ انتهى السؤال بإجابة صحيحة! جاري تجهيز السؤال القادم... 🏆",
                buzzerLocked: true,
                pressedByUid: "",
                pressedByName: ""
            });
        } else {
            await update(roomRef, { buzzerLocked: false, pressedByUid: "", pressedByName: "" });
        }
    } catch (error) {
        console.error("Failed to update points:", error);
        alert("تعذر تحديث النقاط أو لا تملك صلاحية المنظم.");
    }
};

        window.resetBuzzer = function() {
            return (async () => {
                try {
                    const room = await requireAdminRoom();
                    if (room.showWinner) {
                        alert("المسابقة انتهت بالفعل. لا يمكن تصفير الجرس بعد إعلان الفائز.");
                        return;
                    }

                    await update(ref(db, 'rooms/' + currentRoom), { buzzerLocked: false, pressedByUid: "", pressedByName: "", timer: 0 });
                    clearInterval(timerInterval);
                } catch (error) {
                    console.error("Failed to reset buzzer:", error);
                    alert("تعذر تصفير الجرس أو لا تملك صلاحية المنظم.");
                }
            })();
        };

        function renderLeaderboard(players) {
            const board = document.getElementById('leaderboard');
            if(!board) return;
            board.replaceChildren();
            if(!players) return;
            Object.entries(players)
                .sort(([, a], [, b]) => (b?.score ?? 0) - (a?.score ?? 0))
                .forEach(([, data]) => {
                    board.appendChild(renderPlayerRow(data?.displayName || "مشارك", data?.score ?? 0));
                });
        }

        window.showWinner = async function() {
            try {
                const room = await requireAdminRoom();
                if (room.showWinner) {
                    alert("المسابقة انتهت بالفعل. لا يمكن إعلان الفائز مرة أخرى.");
                    return;
                }

                await update(ref(db, 'rooms/' + currentRoom), { showWinner: true });
            } catch (error) {
                console.error("Failed to show winner:", error);
                alert("تعذر إعلان الفائز أو لا تملك صلاحية المنظم.");
            }
        };

        function renderWinner(players) {
            document.getElementById('room-area').classList.add('hidden');
            document.getElementById('winner-screen').classList.remove('hidden');
            const rankedPlayers = Object.entries(players || {}).sort((a,b) => b[1].score - a[1].score);
            const topScore = rankedPlayers[0]?.[1]?.score ?? 0;
            const winners = rankedPlayers.filter(([, data]) => data.score === topScore).map(([, data]) => data.displayName || "مشارك");
            const winnerName = document.getElementById('winnerName');
            if (winnerName) {
                winnerName.replaceChildren();
                winners.forEach((name) => {
                    const row = document.createElement('div');
                    row.textContent = `${name} 🎉`;
                    winnerName.appendChild(row);
                });
            }
            document.body.style.background = "linear-gradient(to bottom, #1e1b4b, #4338ca)";
        }
    