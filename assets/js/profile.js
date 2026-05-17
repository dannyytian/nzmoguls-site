// profile.js
// 依赖：supabase-init.js + auth.js 已经加载

// 保护页面：监听登录状态
supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
        window.location.href = "../membership.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isAddMode = urlParams.get('mode') === 'add';

    if (isAddMode) {
        console.log("Creating new family member...");
        populateBirthDateDropdowns();
        document.getElementById("email").disabled = false; // 新建时允许填写 Email
        document.getElementById("useMyEmailContainer").style.display = "block"; // 显示快捷按钮
        document.getElementById("memberType").disabled = true; // 初始禁用，等待选择 DOB
        document.querySelector(".primary.btn").value = "Add Member";

        // 监听成员类型和日期变化以控制监护人区块显示
        const fields = ['memberType', 'birthYear', 'birthMonth', 'birthDay'];
        fields.forEach(id => {
            document.getElementById(id).addEventListener('change', updateAddMemberUI);
        });
        
        // 显示法律协议和通知
        document.getElementById("addMemberAgreements").style.display = "block";
        document.getElementById("minorNotice").style.display = "block";
        document.getElementById("registerSignature").setAttribute('required', '');
        document.getElementById("registerAgreeGeneral").setAttribute('required', '');
        document.getElementById("registerAgreeWaiver").setAttribute('required', '');

        return;
    }

    const targetUid = urlParams.get('id') || session.user.id;
    console.log("Loading profile for:", targetUid);
    loadUserProfile(targetUid);
});

/**
 * 处理添加成员时的 UI 交互逻辑
 */
function updateAddMemberUI() {
    const year = document.getElementById("birthYear").value;
    const month = document.getElementById("birthMonth").value;
    const day = document.getElementById("birthDay").value;
    const memberTypeSelect = document.getElementById("memberType");
    const signatureLabel = document.getElementById("signatureLabel");
    const consentSection = document.getElementById("minorGuardianConsentSection");

    const age = calculateAge(year, month, day);
    
    // 1. 处理 Membership Type 下拉框的逻辑
    if (age === null) {
        // 未填写完整 DOB 时，禁用下拉框
        memberTypeSelect.disabled = true;
        memberTypeSelect.value = "";
    } else {
        memberTypeSelect.disabled = false;
        const options = memberTypeSelect.options;

        if (age < 18) {
            // 未成年：自动定为未成年运动员
            memberTypeSelect.value = "minor_athlete";
            // 隐藏成人选项
            for (let i = 0; i < options.length; i++) {
                const val = options[i].value;
                options[i].hidden = (val === 'adult_athlete' || val === 'guardian');
            }
        } else {
            // 成年：允许选择成年运动员或监护人
            if (memberTypeSelect.value === "minor_athlete") {
                memberTypeSelect.value = "";
            }
            // 隐藏未成年选项
            for (let i = 0; i < options.length; i++) {
                options[i].hidden = (options[i].value === 'minor_athlete');
            }
        }
    }

    // 2. 根据最终选择的类型处理签名文字和监护人区块
    const selectedType = memberTypeSelect.value;
    const isMinorMode = (selectedType === 'minor_athlete' && age !== null && age < 18);

    if (isMinorMode) {
        consentSection.style.display = "block";
        document.getElementById("minorAgreeCheckbox").setAttribute('required', '');
        document.getElementById("minorGuardianSignature").setAttribute('required', '');
        if (signatureLabel) signatureLabel.innerText = "Guardian Electronic Signature (Type your Full Name)";
    } else {
        consentSection.style.display = "none";
        document.getElementById("minorAgreeCheckbox").removeAttribute('required');
        document.getElementById("minorGuardianSignature").removeAttribute('required');
        if (signatureLabel) signatureLabel.innerText = "New Member Electronic Signature (Type your Full Name)";
    }
}

function calculateAge(year, month, day) {
    if (!year || !month || !day) return null;
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

// 自动填充年月下拉框（与 signup.html 逻辑一致）
function populateBirthDateDropdowns() {
    const yearSelect = document.getElementById("birthYear");
    const monthSelect = document.getElementById("birthMonth");
    const daySelect = document.getElementById("birthDay");
    if (!yearSelect || !monthSelect || !daySelect) return;

    // 清空现有选项以免重复
    monthSelect.innerHTML = '<option value="">- Month -</option>';
    yearSelect.innerHTML = '<option value="">- Year -</option>';
    daySelect.innerHTML = '<option value="">- Day -</option>';

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m, i) => {
        let opt = document.createElement("option");
        opt.value = i + 1;
        opt.textContent = m;
        monthSelect.appendChild(opt);
    });

    const currentYear = new Date().getFullYear();
    for (let y = 2000; y >= 1940; y--) {
        let opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }
    for (let y = 2001; y <= currentYear; y++) {
        let opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.insertBefore(opt, yearSelect.children[1]);
    }

    for (let d = 1; d <= 31; d++) {
        let opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        daySelect.appendChild(opt);
    }
}

// 加载用户资料
async function loadUserProfile(uid) {
    populateBirthDateDropdowns();
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .is('deleted_at', null)
            .single();

        if (error) throw error;

        document.getElementById("firstName").value = data.first_name || "";
        document.getElementById("lastName").value = data.last_name || "";
        document.getElementById("email").value = data.email || "";
        
        if (data.date_of_birth) {
            const dobParts = data.date_of_birth.split('-');
            document.getElementById("birthYear").value = parseInt(dobParts[0]);
            document.getElementById("birthMonth").value = parseInt(dobParts[1]);
            document.getElementById("birthDay").value = parseInt(dobParts[2]);
        }
        
        document.getElementById("memberType").value = data.user_type || "";
        document.getElementById("memberType").disabled = true; // 编辑模式下禁止更改角色
        document.getElementById("phone").value = data.phone || "";
        document.getElementById("school_name").value = data.school_name || "";
        document.getElementById("medical_conditions").value = data.medical_conditions || "";

        // 权限检查：确保成年运动员（非监护人/非管理员）查看他人资料时为只读
        const { data: { session } } = await supabase.auth.getSession();
        const isOwnProfile = (uid === session?.user?.id);
        const isGuardian = session?.user?.user_metadata?.user_type === 'guardian';

        if (!isOwnProfile && !isGuardian) {
            console.log("Viewing family profile in read-only mode...");
            
            // 1. 禁用所有输入框、下拉框和文本域
            const form = document.querySelector('form');
            const elements = form.querySelectorAll('input, select, textarea');
            elements.forEach(el => el.disabled = true);

            // 2. 隐藏保存按钮
            const saveBtn = document.querySelector(".primary.btn");
            if (saveBtn) saveBtn.style.display = "none";

            // 3. 修改标题文案以示区分
            const header = document.querySelector('section > h3');
            if (header) header.innerText = "View Profile";
        }

    } catch (error) {
        console.error("Error loading profile:", error);
        showNotification("Failed to load profile.", "error");
    }
}

// 保存资料
async function saveProfile() {
    const saveBtn = document.querySelector(".primary.btn");
    const form = saveBtn ? saveBtn.closest('form') : null;

    // 1. 触发浏览器原生验证并应用 'was-validated' 样式（标红文本框）
    if (form && !form.checkValidity()) {
        form.classList.add('was-validated');
        form.reportValidity(); // 显示气泡提示
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const urlParams = new URLSearchParams(window.location.search);
    const isAddMode = urlParams.get('mode') === 'add';
    const targetUid = urlParams.get('id') || session.user.id;

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const birthYear = document.getElementById("birthYear").value;
    const birthMonth = document.getElementById("birthMonth").value;
    const birthDay = document.getElementById("birthDay").value;
    const dob = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    // 法律协议数据（仅在添加模式下校验）
    let signatureName = "";
    let agreements = [];
    if (isAddMode) {
        const memberType = document.getElementById("memberType").value;
        const age = calculateAge(birthYear, birthMonth, birthDay);
        const isMinor = (memberType === 'minor_athlete' && age !== null && age < 18);
        const guardianName = `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`.trim();
        const memberName = `${firstName} ${lastName}`.trim();

        signatureName = document.getElementById("registerSignature").value.trim();
        if (!signatureName) {
            showNotification("Please provide an electronic signature.", "error");
            return;
        }

        if (isMinor) {
            // 校验主签名（监护人签署）
            if (signatureName !== guardianName) {
                showNotification(`Signature must match "${guardianName}".`, "error");
                return;
            }

            // 额外验证未成年人监护人同意区块
            const minorSignature = document.getElementById("minorGuardianSignature").value.trim();
            if (!document.getElementById("minorAgreeCheckbox").checked || minorSignature !== guardianName) {
                showNotification("Please complete the Guardian Consent section.", "error");
                return;
            }
        } else {
            // 成年人校验：签名必须匹配被添加人的姓名
            if (signatureName !== memberName) {
                showNotification(`Signature must match "${memberName}".`, "error");
                return;
            }
        }

        if (document.getElementById("registerAgreeGeneral").checked) agreements.push("general_agreement");
        if (document.getElementById("registerAgreeWaiver").checked) agreements.push("liability_waiver");
        agreements.push("guardian_consent"); // 监护人代加默认为已签署监护人同意
    }

    const spinner = document.getElementById("saveSpinner");

    // 开始加载状态
    if (saveBtn) saveBtn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    const originalBtnValue = saveBtn ? saveBtn.value : "";
    if (saveBtn) saveBtn.value = isAddMode ? "Adding..." : "Saving...";

    try {
        let profileData = {
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dob,
                phone: document.getElementById("phone").value,
                school_name: document.getElementById("school_name").value,
                medical_conditions: document.getElementById("medical_conditions").value
        };

        let result;
        if (isAddMode) {
            // --- 新增模式：允许设置 email 和 user_type ---
            profileData.email = document.getElementById("email").value;
            
            const selectedType = document.getElementById("memberType").value;
            profileData.user_type = selectedType || 'participant';
            
            // 检查邮箱是否已经属于一个独立注册的会员
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id, family_id')
                .eq('email', profileData.email)
                .maybeSingle();

            if (existingUser && existingUser.id.length > 30) { // 简单判断是否是真正的 UUID (Auth User)
                // 发起邀请而不是直接创建
                await supabase.from('family_invitations').insert([{
                    inviter_id: session.user.id,
                    invitee_email: profileData.email,
                    family_id: familyId
                }]);
                showNotification("This email already has an account. Invitation sent to join your family.", "info");
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 2000);
                return;
            }

            // 原有的创建逻辑...
            let familyId = urlParams.get('family_id');
            if (!familyId || familyId === 'null') {
                familyId = session.user.id;
            }

            profileData.id = crypto.randomUUID();
            profileData.family_id = familyId;
            profileData.added_by_id = session.user.id; // 记录是由谁添加的
            
            result = await supabase.from('profiles').insert([profileData]);

            // 自愈逻辑：如果监护人使用的是自己的 ID 作为家组标识，确保监护人自己的 profile.family_id 也被同步更新
            if (!result.error && familyId === session.user.id) {
                await supabase.from('profiles')
                    .update({ family_id: session.user.id })
                    .eq('id', session.user.id)
                    .is('family_id', null);
            }

            // --- 核心：保存法律协议证据 ---
            if (!result.error) {
                const userAgent = navigator.userAgent;
                // 获取 IP 并保存协议记录
                const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({json: () => ({ip: "Unknown"})}));
                const ipData = await ipRes.json();

                const agreementRecords = agreements.map(type => ({
                    profile_id: profileData.id,
                    signer_id: session.user.id, // 签署人是当前登录的监护人
                    agreement_type: type,
                    is_accepted: true,
                    signature_name: signatureName,
                    ip_address: ipData.ip,
                    user_agent: userAgent
                }));

                await supabase.from('legal_agreements').insert(agreementRecords);
            }
        } else {
            // --- 更新模式：绝对不包含 family_id 字段，防止意外覆盖 ---
            result = await supabase.from('profiles').update(profileData).eq('id', targetUid);
        }

        if (result.error) throw result.error;

        if (isAddMode) {
            const memberType = document.getElementById("memberType").value;
            const msg = (memberType !== 'minor_athlete') 
                ? "Member profile created! Please ask them to Sign Up on the website using this same email to activate their login."
                : "Minor athlete added successfully to your family.";
            showNotification(msg, "success");
        } else {
            showNotification("Profile updated successfully!", "success");
        }
        
        // 增加 2 秒延迟再跳转，确保用户能看到 Toast 提醒内容
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 2000);

    } catch (error) {
        console.error("Error saving profile:", error);
        showNotification(error.message || "Failed to save profile.", "error");
        // 失败时恢复按钮状态
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.value = originalBtnValue;
        }
        if (spinner) spinner.classList.add("hidden");
    }
}

// 绑定按钮事件
window.addEventListener("load", () => {
    const saveBtn = document.querySelector(".primary.btn"); // 使用更具体的 primary 类
    const cancelBtn = document.getElementById("cancelBtn");

    if (saveBtn) {
        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();
            saveProfile();
        });
    }

    // 复制姓名到主签名框（Agreements Section）
    document.getElementById("profileCopyNameBtn")?.addEventListener("click", async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const memberType = document.getElementById("memberType").value;
            const year = document.getElementById("birthYear").value;
            const month = document.getElementById("birthMonth").value;
            const day = document.getElementById("birthDay").value;
            const age = calculateAge(year, month, day);
            
            const isMinor = (memberType === 'minor_athlete' && age !== null && age < 18);
            
            if (isMinor) {
                // 未成年：复制监护人姓名
                const name = `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`;
                document.getElementById("registerSignature").value = name.trim();
            } else {
                // 成年：复制表单中填写的成员姓名
                const first = document.getElementById("firstName").value;
                const last = document.getElementById("lastName").value;
                document.getElementById("registerSignature").value = `${first} ${last}`.trim();
            }
        }
    });

    // 复制监护人姓名到未成年人授权签名框
    document.getElementById("copyCurrentGuardianNameBtn")?.addEventListener("click", async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const name = `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`;
            document.getElementById("minorGuardianSignature").value = name.trim();
        }
    });

    // “使用我的邮箱”按钮逻辑
    document.getElementById("useMyEmailBtn")?.addEventListener("click", async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            document.getElementById("email").value = session.user.email;
        }
    });

    if (cancelBtn) {
        cancelBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const confirmed = await showConfirm("Discard Changes", "Are you sure you want to cancel? Any unsaved changes will be lost.");
            if (confirmed) {
                window.location.href = "dashboard.html";
            }
        });
    }

});
