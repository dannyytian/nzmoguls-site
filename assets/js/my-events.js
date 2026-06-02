/**
 * my-events.js
 * 加载并显示当前登录会员及其家庭成员的活动报名记录
 */
(function() {
    const fetchMyEvents = async () => {
        const trainingContainer = document.getElementById('my-training-list');
        const competitionContainer = document.getElementById('my-competition-list');
        const showExpiredToggle = document.getElementById('showExpiredToggle');
        
        if (!trainingContainer || !competitionContainer) return;

        const showExpired = showExpiredToggle ? showExpiredToggle.checked : false;
        const today = new Date().toISOString().split('T')[0];

        // 获取当前会话
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = "../membership.html";
            return;
        }

        // 1. 获取账号关联的所有 Profile IDs (主账号 + 手动添加的家属)
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .or(`id.eq.${session.user.id},added_by_id.eq.${session.user.id}`);

        if (pError || !profiles) {
            console.error('Error fetching profiles:', pError);
            return;
        }

        const profileMap = Object.fromEntries(profiles.map(p => [p.id, `${p.first_name} ${p.last_name}`]));
        
        // 判定目标 ID：如果 URL 指定了 ID 且在我们的家属列表中，则只查那一个
        const urlParams = new URLSearchParams(window.location.search);
        const targetUid = urlParams.get('id');
        const profileIds = (targetUid && profileMap[targetUid]) ? [targetUid] : profiles.map(p => p.id);

        // 2. 查询 registrations 表并关联 events 详情
        const { data: registrations, error: rError } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                profile_id,
                events (*)
            `)
            .in('profile_id', profileIds)
            .neq('status', 'cancelled'); // 默认不显示已取消的

        if (rError) {
            console.error('Error fetching registrations:', rError);
            trainingContainer.innerHTML = '<div class="col-12"><p>Error loading your events.</p></div>';
            return;
        }

        // 3. 格式化、排序与分类
        const eventsList = registrations.map(reg => ({
            regId: reg.id,
            regStatus: reg.status,
            participantName: profileMap[reg.profile_id] || "Unknown",
            ...reg.events,
        }));

        eventsList.sort((a, b) => a.event_date.localeCompare(b.event_date));

        const filtered = showExpired ? eventsList : eventsList.filter(e => e.event_date >= today);
        const trainings = filtered.filter(e => e.event_type === 'training');
        const competitions = filtered.filter(e => e.event_type === 'competition');

        // 4. 渲染
        renderCards(trainings, trainingContainer, 'No upcoming training sessions found.');
        renderCards(competitions, competitionContainer, 'No upcoming competitions found.');
    };

    function renderCards(events, container, emptyMsg) {
        if (events.length === 0) {
            container.innerHTML = `<div class="col-12"><p>${emptyMsg}</p></div>`;
            return;
        }

        container.innerHTML = events.map(event => {
            const dateStr = new Date(event.event_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
            const isExpired = event.event_date < new Date().toISOString().split('T')[0];
            
            return `
                <div class="col-4 col-12-medium" style="display: flex;">
                    <section class="box" style="display: flex; flex-direction: column; width: 100%;">
                        <h4>${event.title}</h4>
                        <p style="margin-bottom: 1em;">
                            <strong>Participant:</strong> <span style="color: #ed4933;">${event.participantName}</span><br />
                            <strong>Date:</strong> ${dateStr}<br />
                            <strong>Location:</strong> ${event.location}<br />
                            <strong>Status:</strong> <span style="color: ${getStatusColor(event.regStatus)}; font-weight: bold; text-transform: capitalize;">${event.regStatus}</span>
                        </p>
                        <p style="flex-grow: 1; font-size: 0.9em; opacity: 0.8;">${event.description || ''}</p>
                        <ul class="actions stacked" style="margin-bottom: 0;">
                        ${!isExpired ? `
                            <li><button class="button small fit" onclick="handleCancelRegistration('${event.regId}')">Cancel Registration</button></li>
                        ` : ''}
                            <li><a href="../events.html" class="button alt small fit">View Event Page</a></li>
                        </ul>
                    </section>
                </div>
            `;
        }).join('');
    }

    function getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'paid': return '#2ecc71';
            case 'confirmed': return '#3498db';
            case 'pending': return '#f1c40f';
            default: return 'inherit';
        }
    }

    window.handleCancelRegistration = async function(regId) {
        const confirmed = await showConfirm(
            "Cancel Registration",
            "Are you sure you want to cancel this registration? This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('registrations')
                .update({ status: 'cancelled' })
                .eq('id', regId);
                
            if (error) throw error;
            
            showNotification("Registration cancelled successfully.", "success");
            fetchMyEvents();
        } catch (err) {
            showNotification("Failed to cancel: " + err.message, "error");
        }
    };

    document.addEventListener('DOMContentLoaded', fetchMyEvents);
    document.getElementById('showExpiredToggle')?.addEventListener('change', fetchMyEvents);
})();