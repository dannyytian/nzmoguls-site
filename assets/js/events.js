// events.js
// 依赖：supabase-init.js + auth.js 已经加载

// 监听登录状态并加载数据
supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
        window.location.href = "membership.html";
        return;
    }

    console.log("User logged in:", session.user.id);
    loadEventsFromSupabase(session.user.id);
});

// 加载赛事列表（Supabase版）
async function loadEventsFromSupabase(uid) {
    const upcomingContainer = document.getElementById("upcoming-events-list");
    const scheduleBody = document.getElementById("training-schedule-body");

    if (!upcomingContainer || !scheduleBody) return;

    try {
        // 仅获取已发布的赛事
        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_published', true)
            .order('event_date', { ascending: true });

        if (error) throw error;

        if (events.length === 0) {
            upcomingContainer.innerHTML = "<p>No events available.</p>";
            return;
        }

        upcomingContainer.innerHTML = "";
        scheduleBody.innerHTML = "";

        events.forEach((event) => {
            if (event.event_type === "competition") {
                const col = document.createElement("div");
                col.className = "col-4 col-12-medium";
                col.innerHTML = `
                    <section class="box">
                        <h4>${event.title}</h4>
                        <p><strong>${new Date(event.event_date).toLocaleDateString()}</strong><br />${event.location}</p>
                        <p>${event.description || ''}</p>
                        <ul class="actions stacked">
                            <li><button class="button small register-btn" data-id="${event.id}">Register</button></li>
                        </ul>
                    </section>`;
                upcomingContainer.appendChild(col);
            } else if (event.event_type === "training") {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${event.event_date || ''}</td>
                    <td>${event.location}</td>
                    <td>${event.price > 0 ? '$' + event.price : 'Free'}</td>
                    <td>${event.capacity || 'Open'}</td>
                    <td><button class="button small register-btn" data-id="${event.id}">Join</button></td>`;
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

// 报名赛事（Supabase版，含业务逻辑）
async function registerForEvent(uid, eventId) {
    try {
        // 获取赛事基本信息用于确认弹窗文案
        const { data: eventInfo } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();
        
        const eventTitle = eventInfo?.title || "this event";

        // 1. 获取当前用户 profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();
            
        if (profileError) throw profileError;

        // 2. 检查是否重复报名
        const { data: existing, error: checkError } = await supabase
            .from('registrations')
            .select('id')
            .eq('event_id', eventId)
            .eq('profile_id', uid)
            .maybeSingle();

        if (existing) {
            showNotification("You have already registered for this event.", "info");
            return;
        }

        let targetProfileId = uid;
        let guardianId = null;

        // 3. 监护人业务逻辑：获取关联的孩子列表
        if (profile.user_type === 'guardian' && profile.family_id) {
            const { data: children, error: childrenError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .eq('family_id', profile.family_id)
                .eq('user_type', 'participant');

            if (childrenError) throw childrenError;

            // 如果有孩子，弹出选择框
            if (children && children.length > 0) {
                const selectedId = await showParticipantSelector(children);
                if (!selectedId) return; // 用户取消了选择

                if (selectedId !== 'self') {
                    targetProfileId = selectedId;
                    guardianId = uid; // 当前登录的监护人 ID
                }
                // 注意：showParticipantSelector 内部已有确认按钮，无需再次 confirm
            } else {
                // 监护人身份但尚未添加任何家庭成员，为其自己报名时增加确认
                const confirmed = await showConfirm("Confirm Registration", `Register yourself for "${eventTitle}"?`);
                if (!confirmed) return;
            }
        } else {
            // 普通独立成员，直接进行二次确认
            const confirmed = await showConfirm("Confirm Registration", `Are you sure you want to register for "${eventTitle}"?`);
            if (!confirmed) return;
        }

        // 如果是为孩子报名，再次检查孩子是否已报名该赛事
        if (targetProfileId !== uid) {
            const { data: childExisting } = await supabase
                .from('registrations')
                .select('id')
                .eq('event_id', eventId)
                .eq('profile_id', targetProfileId)
                .maybeSingle();

            if (childExisting) {
                showNotification("This participant is already registered for this event.", "info");
                return;
            }
        }

        const registrationData = {
            event_id: eventId,
            profile_id: targetProfileId,
            guardian_id: guardianId,
            status: 'pending'
        };

        const { data: newReg, error: regError } = await supabase
            .from('registrations')
            .insert([registrationData])
            .select()
            .single();

        if (regError) throw regError;

        // 4. 签署免责声明 (如果是监护人代报，signer_id 为监护人，profile_id 为孩子)
        const { error: agreeError } = await supabase
            .from('legal_agreements')
            .insert([{
                registration_id: newReg.id,
                profile_id: targetProfileId,
                signer_id: uid,
                agreement_type: 'waiver',
                is_accepted: true
            }]);

        if (agreeError) throw agreeError;

        showNotification("Registration successful!", "success");

    } catch (error) {
        console.error("Error registering:", error);
        showNotification(error.message || "Failed to register.", "error");
    }
}

// 辅助函数：显示参与者选择下拉框
async function showParticipantSelector(participants) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(30,37,43,0.95); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px);";
        
        const content = document.createElement('div');
        content.className = 'box';
        content.style = "background:#2e3842; padding:3em; max-width:500px; width:90%; text-align:center; border: solid 2px #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5);";
        
        let optionsHtml = participants.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`).join('');
        
        content.innerHTML = `
            <header class="major" style="margin-bottom: 2em;">
                <h3 style="border-bottom: solid 2px #fff; display: inline-block; padding-bottom: 0.5em; margin-bottom: 0.5em;">Registration</h3>
                <p style="font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.7);">Select Participant</p>
            </header>
            <form style="margin-bottom: 2.5em;">
                <div class="col-12">
                    <select id="childSelector" style="background-color: rgba(144, 144, 144, 0.25); color: #fff;">
                        <option value="self">Myself (Account Holder)</option>
                        ${optionsHtml}
                    </select>
                </div>
            </form>
            <ul class="actions fit">
                <li><button id="confirmSelect" class="button primary small fit">Confirm & Register</button></li>
                <li><button id="cancelSelect" class="button small fit">Cancel</button></li>
            </ul>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        document.getElementById('confirmSelect').onclick = () => {
            const val = document.getElementById('childSelector').value;
            document.body.removeChild(overlay);
            resolve(val);
        };
        
        document.getElementById('cancelSelect').onclick = () => {
            document.body.removeChild(overlay);
            resolve(null);
        };
    });
}
