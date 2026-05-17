// dashboard.js
// 负责加载并显示会员仪表盘的数据
// 依赖：supabase-init.js + auth.js 已经加载

window.supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
        const user = session.user;
        const memberNameEl = document.getElementById("memberName");
        const familySection = document.getElementById("familySection");
        const familyList = document.getElementById("familyList");
        const addBtn = document.getElementById("addMemberBtn");

        if (!memberNameEl) return;

        // 1. 立即响应：Metadata 优先渲染姓名并开启加载状态
        const metaFirstName = user.user_metadata?.first_name || "";
        const metaLastName = user.user_metadata?.last_name || "";
        memberNameEl.innerText = `${metaFirstName} ${metaLastName}`.trim() || "Member";

        try {
            // 2. 初步权限 UI 响应
            const metaType = user.user_metadata?.user_type;
            if (['guardian', 'adult_athlete'].includes(metaType)) {
                if (familySection) familySection.style.display = "block";
            }

            // 3. 核心任务：获取 Profile 资料
            const { data: profile, error: pError } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (pError) console.warn("Profile fetch error:", pError.message);

            if (profile) {
                // 同步数据库中的最新姓名
                const dbFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                if (dbFullName) memberNameEl.innerText = dbFullName;

                // 4. 设置添加按钮权限
                if (addBtn && profile.user_type === 'guardian') {
                    addBtn.style.display = "inline-block";
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        window.location.href = `profile.html?add=true&familyId=${profile.family_id || profile.id}`;
                    };
                }

                // 6. 后台静默加载：家庭成员和邀请 (非阻塞)
                const canManageFamily = ['guardian', 'adult_athlete'].includes(profile.user_type);
                if (canManageFamily) {
                    // 清空列表并显示正在加载的文案
                    if (familyList) familyList.innerHTML = "<p>Updating family information...</p>";

                    // 执行后台异步查询，不再 await 它们以免阻塞主流程的 finally 块
                    try {
                        // 即使没有 family_id，也要检查是否有收到的邀请
                        loadReceivedInvitations(profile.email, familySection, familyList);

                        if (profile.family_id) {
                            loadSentInvitations(user.id, familyList);
                            loadFamilyMembers(profile.family_id, user.id, familyList);
                        } else {
                            if (familyList) familyList.innerHTML = '<p style="padding-left: 1.5em;">No other family members added yet.</p>';
                        }
                    } catch (inviteError) {
                        console.warn("Background load error:", inviteError.message);
                    }
                }
            }
        } catch (error) {
            console.error("加载仪表盘数据出错:", error);
            memberNameEl.innerText = "Member";
        }
    }
});

/**
 * 加载家庭成员列表 (重构为独立函数)
 */
async function loadFamilyMembers(familyId, currentUserId, container) {
    const { data: members, error } = await window.supabase
        .from('profiles')
        .select('id, first_name, last_name, user_type, guardian_consent_at')
        .eq('family_id', familyId)
        .neq('id', currentUserId);

    if (error || !container) return;

    // 清空正在加载的文案
    container.innerHTML = "";
    if (members && members.length > 0) {
        members.forEach(member => {
            const col = document.createElement("div");
            col.className = "col-6 col-12-xsmall";
            const typeLabel = member.user_type === 'minor_athlete' ? 'Minor Athlete' : 'Member';
            const needsConsent = member.user_type === 'minor_athlete' && !member.guardian_consent_at;
            const actionTag = needsConsent ? '<span style="color: #ed4933; font-weight: bold; font-size: 0.8em; display: block; margin-bottom: 0.5em;"><i class="fas fa-exclamation-triangle"></i> Action Required: Consent Needed</span>' : '';

            col.innerHTML = `
                <div class="box" style="padding: 1.5em; margin-bottom: 1em;">
                    <h4>${member.first_name} ${member.last_name}</h4>
                    ${actionTag}
                    <p style="margin-bottom: 1.5em; font-size: 0.9em; opacity: 0.8;">Role: ${typeLabel}</p>
                    <ul class="actions">
                        <li><a href="profile.html?uid=${member.id}" class="button primary small">Edit Profile</a></li>
                    </ul>
                </div>`;
            container.appendChild(col);
        });
    } else {
        container.innerHTML = '<p style="padding-left: 1.5em;">No other family members added yet.</p>';
    }
}
/**
 * 加载监护人发出的待处理邀请
 */
async function loadSentInvitations(inviterId, container) {
    const { data: invites, error } = await window.supabase
        .from('family_invitations')
        .select('*')
        .eq('inviter_id', inviterId)
        .eq('status', 'pending');

    if (error || !invites) return;

    invites.forEach(invite => {
        const col = document.createElement("div");
        col.className = "col-6 col-12-xsmall";
        col.innerHTML = `
            <div class="box" style="padding: 1.5em; margin-bottom: 1em; border-style: dashed; opacity: 0.7;">
                <h4>${invite.invitee_email}</h4>
                <p style="margin-bottom: 1.5em; font-size: 0.9em;">Status: <strong>Pending Invitation</strong></p>
                <ul class="actions">
                    <li><button class="button small" onclick="cancelInvitation('${invite.id}')">Cancel</button></li>
                </ul>
            </div>
        `;
        container.appendChild(col);
    });
}

/**
 * 加载用户收到的邀请（来自其他监护人）
 */
async function loadReceivedInvitations(email, section, container) {
    const { data: invites, error } = await window.supabase
        .from('family_invitations')
        .select('*, inviter:profiles(first_name, last_name)')
        .eq('invitee_email', email)
        .eq('status', 'pending');

    if (error || !invites || invites.length === 0) return;

    // 如果有收到邀请，确保 section 可见
    if (section) section.style.display = "block";

    invites.forEach(invite => {
        const inviterName = invite.inviter ? `${invite.inviter.first_name} ${invite.inviter.last_name}` : "A Guardian";
        const col = document.createElement("div");
        col.className = "col-12";
        col.innerHTML = `
            <div class="box" style="padding: 1.5em; margin-bottom: 1em; background: rgba(33, 178, 166, 0.1); border: 2px solid #21b2a6;">
                <h4>Family Invitation</h4>
                <p><strong>${inviterName}</strong> has invited you to join their family group.</p>
                <ul class="actions">
                    <li><button class="button primary small" onclick="acceptInvitation('${invite.id}', '${invite.family_id}')">Accept</button></li>
                    <li><button class="button small" onclick="cancelInvitation('${invite.id}')">Decline</button></li>
                </ul>
            </div>
        `;
        // 将收到的邀请放在列表最前面
        if (container) container.insertBefore(col, container.firstChild);
    });
}

/**
 * 接受邀请逻辑
 */
window.acceptInvitation = async function(inviteId, familyId) {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) return;

    const confirmed = await showConfirm("Join Family", "Are you sure you want to join this family group?");
    if (!confirmed) return;

    try {
        // 1. 更新自己的 profile，关联 family_id
        const { error: pError } = await window.supabase
            .from('profiles')
            .update({ family_id: familyId })
            .eq('id', session.user.id);

        if (pError) throw pError;

        // 2. 删除已接受的邀请
        await window.supabase
            .from('family_invitations')
            .delete()
            .eq('id', inviteId);

        showNotification("Success! You have joined the family.");
        location.reload(); 
    } catch (err) {
        showNotification(err.message, "error");
    }
};

/**
 * 取消或拒绝邀请
 */
window.cancelInvitation = async function(inviteId) {
    const { error } = await window.supabase
        .from('family_invitations')
        .delete()
        .eq('id', inviteId);

    if (!error) {
        showNotification("Invitation removed.");
        location.reload();
    }
};

/**
 * 监护人发送邀请逻辑
 */
window.handleInviteMember = async function(familyId) {
    const email = prompt("Enter the email address of the member you want to invite:");
    if (!email) return;

    const { data: { user } } = await window.supabase.auth.getUser();
    
    const { error } = await window.supabase
        .from('family_invitations')
        .insert([{
            family_id: familyId,
            inviter_id: user.id,
            invitee_email: email.trim().toLowerCase(),
            status: 'pending'
        }]);

    if (error) {
        showNotification("Failed to send invite: " + error.message, "error");
    } else {
        showNotification("Invitation sent to " + email);
        location.reload();
    }
};