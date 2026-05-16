// dashboard.js
// 负责加载并显示会员仪表盘的数据

supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
        const user = session.user;
        const memberNameEl = document.getElementById("memberName");
        if (!memberNameEl) return;

        // Supabase Auth 元数据中获取姓名
        const firstName = user.user_metadata?.first_name || "";
        const lastName = user.user_metadata?.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();
        memberNameEl.innerText = fullName || "Member";

        // 优化：初次显示逻辑基于元数据，防止 UI 闪烁
        const userType = user.user_metadata?.user_type;
        const familySection = document.getElementById("familySection");
        
        // 业务逻辑优化：
        // 1. 监护人、成年运动员和管理员可以【查看】家庭区块
        // 2. 但只有监护人和管理员可以【添加/删除】成员
        const canManageFamily = ['guardian', 'adult_athlete'].includes(userType);

        if (canManageFamily) {
            if (familySection) familySection.style.display = "block";
            loadFamilySection(user.id);
        } else {
            if (familySection) familySection.style.display = "none";
        }

        // 检查是否有待处理的邀请
        checkPendingInvitations(user.email, user.id);
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
async function loadFamilySection(uid) {
    const familySection = document.getElementById("familySection");
    const familyList = document.getElementById("familyList");

    if (!familySection || !familyList) return;

    try {
        // 1. 获取当前用户的 family_id 和类型
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('id, family_id, user_type')
            .eq('id', uid)
            .single();

        // 获取当前 Session 用于二次验证管理员身份
        const { data: { session } } = await supabase.auth.getSession();
        const isAllowedType = ['guardian', 'adult_athlete', 'participant'].includes(profile?.user_type);

        if (pError || !profile || !isAllowedType) {
            familySection.style.display = "none";
            return;
        }

        // 权限判断：只有监护人和管理员能看到“Add Participant”按钮
        const addBtn = document.getElementById("addMemberBtn");
        const canEditFamily = profile.user_type === 'guardian';
        
        if (addBtn) {
            if (canEditFamily) {
                const fid = profile.family_id || profile.id;
                addBtn.href = `profile.html?mode=add&family_id=${fid}`;
                addBtn.style.display = "inline-block";
            } else {
                // 成年运动员虽然能看到区块，但不能添加成员
                addBtn.style.display = "none";
            }
        }

        if (!profile.family_id) {
            familyList.innerHTML = "<div class='col-12'><p style='padding-left: 1.5em; opacity: 0.6; font-style: italic;'>No family members added yet.</p></div>";
            return;
        }

        familyList.innerHTML = "<div class='col-12'><p style='padding-left: 1.5em; opacity: 0.6; font-style: italic;'>Loading family members...</p></div>";

        // 2. 获取同一家庭下的其他成员
        const { data: members, error: mError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, user_type, email')
            .eq('family_id', profile.family_id)
            .neq('id', uid) // 排除自己
            .is('deleted_at', null); // 仅加载未标记删除的成员

        if (mError) throw mError;

        familyList.innerHTML = "";

        if (!members || members.length === 0) {
            familyList.innerHTML = "<div class='col-12'><p style='padding-left: 1.5em; opacity: 0.6; font-style: italic;'>No family members added yet.</p></div>";
            return;
        }

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
        const { data: { session } } = await supabase.auth.getSession();
        if (session) loadFamilySection(session.user.id);
        
    } catch (err) {
        console.error("Delete failed:", err);
        showNotification("Failed to remove member: " + err.message, "error");
    }
};