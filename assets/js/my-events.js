/**
 * my-events.js
 * 加载并显示当前登录会员的活动报名信息
 */

async function loadMyEvents() {
    const user = auth.currentUser;
    if (!user) return;

    const trainingContainer = document.getElementById("my-training-list");
    const competitionContainer = document.getElementById("my-competition-list");

    if (!trainingContainer || !competitionContainer) return;

    try {
        // 从 Firestore 获取当前用户的报名记录
        // 假设有一个 'registrations' 集合，且文档包含 userId 字段
        const snapshot = await db.collection("registrations")
            .where("userId", "==", user.uid)
            .get();

        trainingContainer.innerHTML = "";
        competitionContainer.innerHTML = "";

        let trainingCount = 0;
        let competitionCount = 0;

        snapshot.forEach(doc => {
            const reg = doc.data();
            
            // 如果报名已被取消，则不显示在列表中
            if (reg.status === 'Cancelled') return;

            const statusColor = getStatusColor(reg.status);
            
            const cardHtml = `
                <div class="col-6 col-12-medium">
                    <section class="box">
                        <h4>${reg.eventTitle}</h4>
                        <p><strong>Date:</strong> ${reg.eventDate}<br />
                        <strong>Location:</strong> ${reg.eventLocation}<br />
                        <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${reg.status}</span></p>
                        ${reg.status !== 'Cancelled' ? `
                        <ul class="actions stacked">
                            <li><a href="#" class="button small" onclick="handleCancelRegistration('${doc.id}')">Cancel Registration</a></li>
                        </ul>` : ''}
                    </section>
                </div>`;

            if (reg.eventType === 'training') {
                trainingContainer.innerHTML += cardHtml;
                trainingCount++;
            } else {
                competitionContainer.innerHTML += cardHtml;
                competitionCount++;
            }
        });

        // 如果过滤掉已取消的活动后列表为空，显示提示信息
        if (trainingCount === 0) trainingContainer.innerHTML = "<p>No training sessions registered.</p>";
        if (competitionCount === 0) competitionContainer.innerHTML = "<p>No competitions registered.</p>";

    } catch (error) {
        console.error("Error loading my events:", error);
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'Confirmed': return 'green';
        case 'Pending': return '#e6b800';
        case 'Cancelled': return '#b30000';
        default: return 'inherit';
    }
}

// 取消报名逻辑（示例）
window.handleCancelRegistration = async function(regId) {
    if (confirm("Are you sure you want to cancel this registration?")) {
        await db.collection("registrations").doc(regId).update({ status: 'Cancelled' });
        loadMyEvents(); // 重新加载
    }
};

// 监听登录状态
auth.onAuthStateChanged(user => {
    if (user) loadMyEvents();
});