/**
 * my-events.js
 * 加载并显示当前登录会员及其家庭成员的活动报名信息（Supabase版）
 */

async function loadMyEvents(uid) {
    const trainingContainer = document.getElementById("my-training-list");
    const competitionContainer = document.getElementById("my-competition-list");

    if (!trainingContainer || !competitionContainer) return;

    try {
        // 获取当前时间
        const now = new Date();
        const showExpired = document.getElementById("showExpiredToggle")?.checked || false;

        // 1. 获取所有相关的报名记录
        // 逻辑：如果是监护人，可以看到 guardian_id 是自己的，或者 profile_id 是自己的记录
        const { data: regs, error } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                events (id, title, event_date, location, event_type),
                profiles (first_name, last_name)
            `)
            .or(`profile_id.eq.${uid},guardian_id.eq.${uid}`);

        if (error) throw error;

        trainingContainer.innerHTML = "";
        competitionContainer.innerHTML = "";

        let trainingCount = 0;
        let competitionCount = 0;

        regs.forEach(reg => {
            if (reg.status === 'Cancelled') return;

            const event = reg.events;
            const participant = reg.profiles;
            const statusColor = getStatusColor(reg.status);

            // 日期对比逻辑
            const eventDate = new Date(event.event_date);
            const isExpired = eventDate < now;

            // 根据开关状态过滤：如果开关关闭且活动已过期，则跳过；反之亦然
            if (showExpired !== isExpired) return;
            
            const cardHtml = `
                <div class="col-6 col-12-medium">
                    <section class="box">
                        <h4>${event.title}</h4>
                        <p><strong>Participant:</strong> ${participant.first_name} ${participant.last_name}<br />
                        <strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString()}<br />
                        <strong>Location:</strong> ${event.location}<br />
                        <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${reg.status}</span></p>
                        ${!isExpired ? `
                            <ul class="actions stacked">
                                <li><button class="button small" onclick="handleCancelRegistration('${reg.id}')">Cancel Registration</button></li>
                            </ul>
                        ` : '<p><em>This event has ended.</em></p>'}
                    </section>
                </div>`;

            if (event.event_type === 'training') {
                trainingContainer.innerHTML += cardHtml;
                trainingCount++;
            } else {
                competitionContainer.innerHTML += cardHtml;
                competitionCount++;
            }
        });

        const emptyMsg = showExpired ? "No past events found." : "No upcoming events registered.";

        if (trainingCount === 0) trainingContainer.innerHTML = `<p>${emptyMsg}</p>`;
        if (competitionCount === 0) competitionContainer.innerHTML = `<p>${emptyMsg}</p>`;

    } catch (error) {
        console.error("Error loading my events:", error);
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'paid': return 'green';
        case 'pending': return '#e6b800';
        case 'Cancelled': return '#b30000';
        default: return 'inherit';
    }
}

// 取消报名逻辑
window.handleCancelRegistration = async function(regId) {
    const confirmed = await showConfirm(
        "Cancel Registration",
        "Are you sure you want to cancel this registration? This action cannot be undone."
    );

    if (confirmed) {
        const { error } = await supabase
            .from('registrations')
            .update({ status: 'Cancelled' })
            .eq('id', regId);
            
        if (error) {
            showNotification("Failed to cancel: " + error.message, "error");
        } else {
            showNotification("Registration cancelled successfully.", "success");
            // 重新获取当前 UID 并加载
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) loadMyEvents(session.user.id);
        }
    }
};

// 监听登录状态
supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        loadMyEvents(session.user.id);

        // 绑定切换开关事件，一旦变化就重新加载列表
        const toggle = document.getElementById("showExpiredToggle");
        if (toggle && !toggle.dataset.listenerAttached) {
            toggle.addEventListener("change", () => loadMyEvents(session.user.id));
            toggle.dataset.listenerAttached = "true";
        }
    }
});