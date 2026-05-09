// events.js
// 依赖：firebase-init.js + auth.js 已经加载

// 保护页面：未登录自动跳回 membership.html
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "membership.html";
        return;
    }

    console.log("User logged in:", user.uid);
    loadEventsFromFirestore(user.uid);
});

// 加载赛事列表
async function loadEventsFromFirestore(uid) {
    const upcomingContainer = document.getElementById("upcoming-events-list");
    const scheduleBody = document.getElementById("training-schedule-body");

    if (!upcomingContainer || !scheduleBody) return;

    try {
        const snapshot = await db.collection("events").get();

        if (snapshot.empty) {
            upcomingContainer.innerHTML = "<p>No events available.</p>";
            return;
        }

        upcomingContainer.innerHTML = "";
        scheduleBody.innerHTML = "";

        snapshot.forEach((doc) => {
            const event = doc.data();
            const eventId = doc.id;

            if (event.type === "featured") {
                const col = document.createElement("div");
                col.className = "col-4 col-12-medium";
                col.innerHTML = `
                    <section class="box">
                        <h4>${event.title}</h4>
                        <p><strong>${event.dateDisplay}</strong><br />${event.location}</p>
                        <p>${event.description || ''}</p>
                        <ul class="actions stacked">
                            <li><button class="button small register-btn" data-id="${eventId}">Register</button></li>
                        </ul>
                    </section>`;
                upcomingContainer.appendChild(col);
            } else if (event.type === "schedule") {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${event.date || ''}</td>
                    <td>${event.location}</td>
                    <td>${event.level}</td>
                    <td>${event.time}</td>
                    <td><button class="button small register-btn" data-id="${eventId}">Join</button></td>`;
                scheduleBody.appendChild(row);
            }
        });

        bindRegisterButtons(uid);

    } catch (error) {
        console.error("Error loading events:", error);
        upcomingContainer.innerHTML = "<p>Failed to load events.</p>";
    }
}

// 绑定报名按钮
function bindRegisterButtons(uid) {
    const buttons = document.querySelectorAll(".register-btn");

    buttons.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const eventId = btn.getAttribute("data-id");
            await registerForEvent(uid, eventId);
        });
    });
}

// 报名赛事
async function registerForEvent(uid, eventId) {
    const regId = `${eventId}_${uid}`;

    try {
        // 检查是否已报名
        const existing = await db.collection("registrations").doc(regId).get();
        if (existing.exists) {
            alert("You have already registered for this event.");
            return;
        }

        // 获取活动详情以存入报名记录
        const eventDoc = await db.collection("events").doc(eventId).get();
        if (!eventDoc.exists) {
            alert("Event not found.");
            return;
        }
        const eventData = eventDoc.data();

        await db.collection("registrations").doc(regId).set({
            userId: uid,
            eventId,
            eventTitle: eventData.title || "Unknown Event",
            eventDate: eventData.dateDisplay || eventData.date || "TBA",
            eventLocation: eventData.location || "TBA",
            eventType: eventData.type === "schedule" ? "training" : "competition",
            status: "Confirmed",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Registration successful!");
        console.log("Registered:", regId);

    } catch (error) {
        console.error("Error registering:", error);
        alert("Failed to register.");
    }
}
