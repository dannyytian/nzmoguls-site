/**
 * Events Handler
 * 从 Supabase 加载活动数据并渲染
 */
(function() {
    const fetchEvents = async () => {
        const upcomingContainer = document.getElementById('upcoming-events-list');
        const trainingTable = document.getElementById('training-schedule-body');
        const competitionCalendar = document.getElementById('competition-calendar-list');

        // 1. 检查当前用户的登录状态
        const { data: { session } } = await supabase.auth.getSession();

        const today = new Date().toISOString().split('T')[0];

        // 获取当前用户已报名的 event_id 列表，避免重复渲染
        let myRegs = [];
        if (session) {
            const { data: regs } = await supabase
                .from('registrations')
                .select('event_id')
                .eq('profile_id', session.user.id)
                .neq('status', 'cancelled');
            myRegs = regs?.map(r => r.event_id) || [];
        }

        // 1. 加载“即将到来的活动” (针对首页 index.html 和活动页 events.html 的网格部分)
        if (upcomingContainer) {
            // 如果在首页，仅显示 3 个预览；如果在活动页，可以显示更多
            const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
            
            let query = supabase
                .from('events')
                .select('*')
                .eq('is_published', true)
                .gte('event_date', today)
                .order('event_date', { ascending: true });

            if (isHomePage) {
                query = query.limit(3);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching events:', error);
                upcomingContainer.innerHTML = '<p>Unable to load events at this time.</p>';
            } else if (data.length === 0) {
                upcomingContainer.innerHTML = '<p>No upcoming events at the moment. Check back soon!</p>';
            } else {
                upcomingContainer.innerHTML = data.map(event => {
                    const dateObj = new Date(event.event_date);
                    const dateStr = dateObj.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
                    
                    return `
                        <div class="col-4 col-12-medium" style="display: flex;">
                            <section class="box" style="display: flex; flex-direction: column; width: 100%;">
                                <h3>${event.title}</h3>
                                <p><strong>${dateStr}</strong><br />${event.location}</p>
                                <p style="flex-grow: 1;">${event.description || ''}</p>
                                <ul class="actions stacked" style="margin-bottom: 0;">
                                    <li><a href="events.html" class="button small">Details</a></li>
                                </ul>
                            </section>
                        </div>
                    `;
                }).join('');
            }
        }

        // 2. 加载“训练日程” (专门针对 events.html 里的表格)
        if (trainingTable) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('event_type', 'training')
                .eq('is_published', true)
                .gte('event_date', today)
                .order('event_date', { ascending: true });

            if (error) {
                console.error('Error fetching training schedule:', error);
                trainingTable.innerHTML = '<tr><td colspan="5">Unable to load schedule.</td></tr>';
            } else if (data.length === 0) {
                trainingTable.innerHTML = '<tr><td colspan="5">No scheduled training sessions at this time.</td></tr>';
            } else {
                trainingTable.innerHTML = data.map(event => {
                    const dateObj = new Date(event.event_date);
                    const dateStr = dateObj.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    // 格式化时间：从 '09:00:00' 转换为 '09:00'
                    const timeStr = event.start_time ? event.start_time.substring(0, 5) : 'TBA';

                    return `
                        <tr>
                            <td style="vertical-align: middle;">${dateStr}</td>
                            <td style="vertical-align: middle;">${event.location}</td>
                            <td style="vertical-align: middle;">${event.target_level || 'All Levels'}</td> 
                            <td style="vertical-align: middle;">${timeStr}</td>
                            <td style="vertical-align: middle;">
                                ${session ? 
                                    (myRegs.includes(event.id) ? 
                                        '<span class="button small disabled">Registered</span>' : 
                                        `<button class="button small" onclick="handleEventRegistration('${event.id}', this)">Register</button>`
                                    ) : ''
                                }
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // 3. 加载“比赛日历” (针对 events.html 里的 Competition Calendar，按月分组)
        if (competitionCalendar) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('event_type', 'competition')
                .eq('is_published', true)
                .gte('event_date', today)
                .order('event_date', { ascending: true });

            if (error) {
                console.error('Error fetching competition calendar:', error);
                competitionCalendar.innerHTML = '<p>Unable to load calendar.</p>';
            } else if (data.length === 0) {
                competitionCalendar.innerHTML = '<p>No scheduled competitions at this time.</p>';
            } else {
                // 按 "Month Year" 进行分组
                const groups = {};
                data.forEach(event => {
                    const date = new Date(event.event_date);
                    const monthYear = date.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });
                    if (!groups[monthYear]) groups[monthYear] = [];
                    groups[monthYear].push(event);
                });

                competitionCalendar.innerHTML = Object.entries(groups).map(([monthYear, events]) => `
                    <div class="col-6 col-12-medium">
                        <h4>${monthYear}</h4>
                        <ul>
                            ${events.map(e => {
                                const d = new Date(e.event_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
                                return `<li>${e.title} — ${d}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                `).join('');
            }
        }
    };

    /**
     * 处理直接报名逻辑
     * @param {string} eventId 
     * @param {HTMLElement} btn 
     */
    window.handleEventRegistration = async function(eventId, btn) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. 按钮特效：禁用并显示加载中
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Registering...";
        btn.classList.add('disabled'); // 增加视觉禁用感

        try {
            const { error } = await supabase
                .from('registrations')
                .insert([{
                    event_id: eventId,
                    profile_id: session.user.id,
                    status: 'pending' // 默认为 pending，直到管理员确认或完成支付
                }]);

            if (error) throw error;

            // 2. 成功后更新 UI
            btn.innerText = "Registered";
            showNotification("Successfully registered for the session!", "success");
        } catch (err) {
            console.error("Registration failed:", err);
            showNotification("Failed to register: " + err.message, "error");
            btn.disabled = false;
            btn.innerText = originalText;
            btn.classList.remove('disabled');
        }
    };

    document.addEventListener('DOMContentLoaded', fetchEvents);
})();