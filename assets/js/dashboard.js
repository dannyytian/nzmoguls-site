// dashboard.js
// 负责加载并显示会员仪表盘的数据

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("DEBUG: Auth event triggered:", event, "Has Session:", !!session);

    // 只要有会话且不是登出事件，就初始化/刷新 UI
    if (session?.user && event !== 'SIGNED_OUT') {
        try {
            const user = session.user;
            const memberNameEl = document.getElementById("memberName");
            
            // --- 阶段 A: 立即渲染 (使用 Auth 元数据) ---
            const meta = user.user_metadata || {};
            const fullName = `${meta.first_name || "Member"} ${meta.last_name || ""}`.trim();
            const userType = meta.user_type || 'participant';
            const familyId = meta.family_id || null;
            if (memberNameEl) memberNameEl.innerText = fullName;

            // 关键：立即根据元数据展示家庭管理区块，不等待数据库
            const familySection = document.getElementById("familySection");
            
            if (userType === 'guardian') {
                if (familySection) familySection.style.display = "block";
                // 立即启动家庭成员加载（异步，不阻塞主流程）
                loadFamilySection(user.id, { user_type: userType, family_id: familyId });
            }

            // --- 阶段 B: 异步校准 (后台静默执行) ---
            // 即使这里 hang 住，由于上面的代码已经执行，UI 已经是可见的了
            (async () => {
                console.log("DEBUG: Step 2 - Calibration started in background...");
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, user_type, family_id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile && profile.family_id !== familyId) {
                    console.log("DEBUG: Step 3 - Data updated, re-loading family...");
                    loadFamilySection(user.id, profile);
                }
            })();


            checkPendingInvitations(user.email, user.id);

        } catch (err) {
            console.error("Dashboard initialization failed:", err);
            // 即使核心逻辑报错，也尝试显示一个基础名称
            const nameEl = document.getElementById("memberName");
            if (nameEl) nameEl.innerText = "Member";
        }
    }
});

/**
 * 检查并显示家庭加入邀请
 */
async function checkPendingInvitations(email, uid) {
    const { data: invites, error } = await supabase
        .from('family_invitations')
        .select('*, profiles:inviter_id(first_name, last_name)')
        .eq('invitee_email', email)
        .eq('status', 'pending');

    if (error || !invites || invites.length === 0) return;

    // 在页面顶部显示邀请通知（这里可以根据你的 UI 调整）
    for (const invite of invites) {
        const msg = `You are invited to join the family of ${invite.profiles.first_name} ${invite.profiles.last_name}. Do you want to accept?`;
        const confirmed = await showConfirm("Family Invitation", msg);
        if (confirmed) {
            await handleAcceptInvitation(invite, uid);
        }
    }
}

async function handleAcceptInvitation(invite, uid) {
    try {
        // 1. 更新自己的 family_id
        const { error: uError } = await supabase
            .from('profiles')
            .update({ family_id: invite.family_id })
            .eq('id', uid);
        
        if (uError) throw uError;

        // 2. 将邀请标记为已接受
        await supabase
            .from('family_invitations')
            .update({ status: 'accepted' })
            .eq('id', invite.id);

        showNotification("Successfully joined the family!", "success");
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        showNotification("Failed to join family: " + err.message, "error");
    }
}
/**
 * 加载监护人名下的家庭成员
 */
async function loadFamilySection(uid, context) {
    const familySection = document.getElementById("familySection");
    const familyList = document.getElementById("familyList");
    const addBtn = document.getElementById("addMemberBtn");

    if (!familySection || !familyList) return;

    try {
        // 权限判断：严格遵循家长角色才能看到添加按钮
        const canEditFamily = context?.user_type === 'guardian';
        
        if (addBtn) {
            if (canEditFamily) {
                const fid = context?.family_id || uid; // 如果还没有 family_id，用自己的 UID 作为初始 ID
            addBtn.href = `profile.html?add=true&familyId=${fid}`;
            addBtn.style.display = "inline-block";
            } else {
            addBtn.style.display = "none";
            }
        }

        if (!context || !context.family_id) {
            familyList.innerHTML = "<div class='col-12'><p style='padding-left: 1.5em; opacity: 0.6; font-style: italic;'>No family members added yet.</p></div>";
            return;
        }

        familyList.innerHTML = "<div class='col-12'><p style='padding-left: 1.5em; opacity: 0.6; font-style: italic;'>Loading family members...</p></div>";

        // 获取同一家庭下的其他成员
        const { data: members, error: mError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, user_type, email')
            .eq('family_id', context.family_id)
            .neq('id', uid) // 排除自己
            .is('deleted_at', null); // 仅加载未标记删除的成员

        if (mError || !members || members.length === 0) {
            familyList.innerHTML = "<div class='col-12'><p style='padding-left: 1.5em; opacity: 0.6; font-style: italic;'>No family members added yet.</p></div>";
            return;
        }

        familyList.innerHTML = "";
        // 3. 渲染列表
        members.forEach(member => {
            const col = document.createElement("div");
            col.className = "col-12"; // 改为占满左侧列的宽度，排版更整齐
            col.innerHTML = `
                <section class="box">
                    <h3>${member.first_name} ${member.last_name}</h3>
                    <p style="margin-bottom: 0.5em; font-size: 0.9em; opacity: 0.8;">${member.email}</p>
                    <p>Role: <strong>${member.user_type}</strong></p>
                    <ul class="actions">
                        <li><a href="profile.html?id=${member.id}" class="button ${canEditFamily ? 'primary' : ''} small">View Profile</a></li>
                        <li><a href="my-events.html?id=${member.id}" class="button small">View Events</a></li>
                        ${canEditFamily ? `<li><button onclick="handleDeleteMember('${member.id}')" class="button small">Delete</button></li>` : ''}
                    </ul>
                </section>`;
            familyList.appendChild(col);
        });

    } catch (err) {
        console.error("Error loading family members:", err);
    }
}

/**
 * 删除家庭成员逻辑
 */
window.handleDeleteMember = async function(memberId) {
    const confirmed = await showConfirm(
        "Confirm Removal",
        "Are you sure you want to remove this family member? They will no longer appear in your dashboard, but their records will be preserved."
    );

    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', memberId);

        if (error) throw error;

        showNotification("Member removed successfully.", "success");
        // 重新加载列表
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
            // 修复：重新获取 profile 以便作为 context 传入，防止按钮消失
            const { data: profile } = await supabase.from('profiles')
                .select('user_type, family_id').eq('id', currentSession.user.id).maybeSingle();
            loadFamilySection(currentSession.user.id, profile || currentSession.user.user_metadata);
        }
        
    } catch (err) {
        console.error("Delete failed:", err);
        showNotification("Failed to remove member: " + err.message, "error");
    }
};