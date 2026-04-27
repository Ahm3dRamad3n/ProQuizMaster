
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
        import { getDatabase, ref, set, onValue, update, push, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

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

        let myName, currentRoom, isOwner = false, timerInterval;

        window.createRoom = function() {
            myName = document.getElementById('username').value;
            const max = parseInt(document.getElementById('maxPlayers').value) || 5;
            const qTime = parseInt(document.getElementById('questionTime').value) || 15;
            if(!myName) return alert("الاسم مطلوب");

            currentRoom = Math.random().toString(36).substring(2, 7).toUpperCase();
            isOwner = true;

            set(ref(db, 'rooms/' + currentRoom), {
                owner: myName,
                maxPlayers: max,
                timeLimit: qTime,
                gameStarted: false,
                currentQuestion: "في انتظار السؤال الأول...",
                buzzerLocked: true,
                pressedBy: "",
                timer: 0,
                showWinner: false
            });
            
            enterRoom();
        };

        window.joinRoom = function() {
            myName = document.getElementById('username').value;
            currentRoom = document.getElementById('roomInput').value.toUpperCase();
            if(!myName || !currentRoom) return alert("بيانات ناقصة");

            const roomRef = ref(db, 'rooms/' + currentRoom);
            onValue(roomRef, (snap) => {
                const data = snap.val();
                if(!data) return alert("الغرفة غير موجودة");
                
                const isAlreadyIn = data.players?.[myName]; 
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
                    update(ref(db, `rooms/${currentRoom}/players/${myName}`), { score: 0 });
                }
                
                enterRoom();
            }, { onlyOnce: true });
        };

        function enterRoom() {
            document.getElementById('setup-area').classList.add('hidden');
            document.getElementById('room-area').classList.remove('hidden');
            document.getElementById('displayCode').innerText = "ROOM: " + currentRoom;

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
                qDisplay.innerText = data.currentQuestion;

                if (data.currentQuestion.includes("✅")) {
                    qDisplay.style.color = "#22c55e"; // أخضر نجاح
                } else if (data.currentQuestion.includes("❌")) {
                    qDisplay.style.color = "#ef4444"; // أحمر فشل
                } else {
                    qDisplay.style.color = "white";    // أبيض للسؤال العادي
                }

                document.getElementById('timerDisplay').innerText = data.timer > 0 ? data.timer + "s" : "⌛";
                
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
                btn.disabled = data.buzzerLocked;

                if(data.buzzerLocked && data.pressedBy) {
                    document.getElementById('statusMsg').innerText = "🚨 ضغط: " + data.pressedBy;
                    if(isOwner) {
                        document.getElementById('judge-actions').classList.remove('hidden');
                        document.getElementById('whoPressed').innerText = "المجيب: " + data.pressedBy;
                    }
                } else {
                    document.getElementById('statusMsg').innerText = "أسرع بالضغط!";
                    document.getElementById('judge-actions').classList.add('hidden');
                }

                renderLeaderboard(data.players);
            });
        }

        window.handleFileUpload = function(input) {
            const file = input.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) { // تنبيه لو الصورة أكبر من 2 ميجا
                    alert("الصورة كبيرة جداً! اختر صورة أقل من 2 ميجابايت.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    // نضع النتيجة (الرابط الطويل) في خانة الـ URL
                    document.getElementById('questionImage').value = e.target.result;
                    alert("✅ تم تجهيز الصورة للرفع!");
                };
                reader.readAsDataURL(file);
            }
        };

        window.sendQuestion = function() {

        document.getElementById('questionDisplay').style.color = "white";
        const q = document.getElementById('newQuestion').value;
        const imgUrl = document.getElementById('questionImage').value;
        const roomRef = ref(db, 'rooms/' + currentRoom);
    
        update(roomRef, {
            currentQuestion: q,
            buzzerLocked: false,
            questionImage: imgUrl || "",
            pressedBy: "",
            attempts: {}, 
            gameStarted: true,
            timer: parseInt(document.getElementById('questionTime').value) || 15
        });
            onValue(ref(db, 'rooms/' + currentRoom + '/timeLimit'), (s) => {
                let timeLeft = s.val();
                clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    timeLeft--;
                    update(ref(db, 'rooms/' + currentRoom), { timer: timeLeft });
                    if(timeLeft <= 0) {
                        clearInterval(timerInterval);
                        update(ref(db, 'rooms/' + currentRoom), { buzzerLocked: true, timer: 0 });
                    }
                }, 1000);
            }, {onlyOnce: true});
        };

window.pressBuzzer = function() {
    const roomRef = ref(db, 'rooms/' + currentRoom);
    
    onValue(ref(db, `rooms/${currentRoom}/attempts/${myName}`), (snap) => {
        if(snap.val()) {
            alert("لقد استخدمت محاولتك في هذا السؤال بالفعل!");
            return;
        }

        runTransaction(roomRef, (currentData) => {
            if (currentData && currentData.buzzerLocked === false) {
                currentData.buzzerLocked = true;
                currentData.pressedBy = myName;
                
                if(!currentData.attempts) currentData.attempts = {};
                currentData.attempts[myName] = true; 
                
                currentData.timer = 0;
            }
            return currentData;
        });
    }, { onlyOnce: true });
};

window.givePoints = function(pts) {
    onValue(ref(db, 'rooms/' + currentRoom + '/pressedBy'), (s) => {
        const user = s.val();
        if(!user) return;

        const scoreRef = ref(db, `rooms/${currentRoom}/players/${user}/score`);
        runTransaction(scoreRef, (current) => (current || 0) + pts);

        const roomRef = ref(db, 'rooms/' + currentRoom);
        if (pts > 0) {
            update(roomRef, { 
        currentQuestion: "✅ انتهى السؤال بإجابة صحيحة! جاري تجهيز السؤال القادم... 🏆",
        buzzerLocked: true ,
pressedBy: ""
    });
        } else {
            update(roomRef, { buzzerLocked: false, pressedBy: "" });
        }
    }, {onlyOnce: true});
};

        window.resetBuzzer = function() {
            update(ref(db, 'rooms/' + currentRoom), { buzzerLocked: false, pressedBy: "", timer: 0 });
            clearInterval(timerInterval);
        };

        function renderLeaderboard(players) {
            const board = document.getElementById('leaderboard');
            board.innerHTML = "";
            if(!players) return;
            Object.entries(players).sort((a,b) => b[1].score - a[1].score).forEach(([name, data]) => {
                board.innerHTML += `<div class="flex justify-between bg-slate-800 p-2 rounded-lg border-l-4 border-blue-500">
                    <span>${name}</span><span class="font-bold text-emerald-400">${data.score}</span>
                </div>`;
            });
        }

        window.showWinner = function() {
            update(ref(db, 'rooms/' + currentRoom), { showWinner: true });
        };

        function renderWinner(players) {
            document.getElementById('room-area').classList.add('hidden');
            document.getElementById('winner-screen').classList.remove('hidden');
            const winner = Object.entries(players).sort((a,b) => b[1].score - a[1].score)[0];
            document.getElementById('winnerName').innerText = winner[0] + " 🎉";
            document.body.style.background = "linear-gradient(to bottom, #1e1b4b, #4338ca)";
        }
    