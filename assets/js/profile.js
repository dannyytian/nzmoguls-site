// profile.js
// 依赖：supabase-init.js + auth.js 已经加载

let currentProfileUid = null;
let isAddMode = false;
let familyIdToAdd = null;
let guardianEmail = null; // 存储当前监护人的邮箱
let guardianName = null;  // 存储当前监护人的姓名

// 保护页面：未登录自动跳回 membership.html
window.supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
        window.location.href = "../membership.html";
        return;
    }
    guardianEmail = session.user.email;
    guardianName = `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`.trim();

    // 1. 模式判定与资料定位
    const urlParams = new URLSearchParams(window.location.search);
    isAddMode = urlParams.get('add') === 'true';
    familyIdToAdd = urlParams.get('familyId');
    currentProfileUid = urlParams.get('uid') || session.user.id;

    if (isAddMode) {
        // 添加成员模式：初始化 UI
        populateBirthDateDropdowns();

        // 监听生日变化以实时切换邮箱逻辑
        ['birthYear', 'birthMonth', 'birthDay'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updateEmailAndTypeBasedOnAge);
        });

        // 初始状态下允许编辑，直到输入生日触发判定
        document.getElementById("email").disabled = false;
        document.getElementById("memberType").disabled = false;

        document.getElementById("addMemberAgreements").style.display = "block";
        document.getElementById("minorNotice").style.display = "block";
        
        const saveBtn = document.querySelector(".primary.btn");
        if (saveBtn) saveBtn.value = "Add Member";
        
        console.log("Mode: Add Family Member");
    } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // 编辑模式：加载已有数据
        console.log("Mode: Edit Profile, Target UID:", currentProfileUid);
        loadUserProfile(currentProfileUid);
    }
});

// 根据年龄动态更新邮箱和会员类型（仅限添加成员模式）
function updateEmailAndTypeBasedOnAge() {
    if (!isAddMode) return;

    const year = document.getElementById("birthYear").value;
    const month = document.getElementById("birthMonth").value;
    const day = document.getElementById("birthDay").value;

    const age = calculateAge(year, month, day);
    const emailInput = document.getElementById("email");
    const typeSelect = document.getElementById("memberType");
    const consentSection = document.getElementById("minorGuardianConsentSection");
    const sigLabel = document.getElementById("signatureLabel");

    if (age !== null && age < 18) {
        // 未成年人：强制使用监护人邮箱且锁定不可更改
        emailInput.value = guardianEmail || "";
        emailInput.disabled = true;
        typeSelect.value = "minor_athlete";
        if (consentSection) consentSection.style.display = "block";
        // 针对未成年人开启必填校验
        document.getElementById("minorAgreeCheckbox")?.setAttribute('required', '');
        document.getElementById("minorGuardianSignature")?.setAttribute('required', '');

        if (sigLabel) sigLabel.innerText = "Guardian Electronic Signature (Signing on behalf of minor)";
        document.getElementById("registerSignature")?.setAttribute('required', '');
    } else if (age !== null) {
        // 成年人：允许填写独立邮箱（如果之前自动填入的是监护人邮箱，则清空以便输入）
        if (emailInput.value === guardianEmail) {
            emailInput.value = "";
        }
        emailInput.disabled = false;
        if (typeSelect.value === "minor_athlete") {
            typeSelect.value = "adult_athlete";
        }
        if (consentSection) consentSection.style.display = "none";
        // 非未成年人移除必填校验
        document.getElementById("minorAgreeCheckbox")?.removeAttribute('required');
        document.getElementById("minorGuardianSignature")?.removeAttribute('required');

        if (sigLabel) sigLabel.innerText = "New Member Electronic Signature (Type your Full Name)";
        if (isAddMode) document.getElementById("registerSignature")?.setAttribute('required', '');
    }
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
    for (let y = currentYear; y >= 1940; y--) {
        let opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }

    for (let d = 1; d <= 31; d++) {
        let opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        daySelect.appendChild(opt);
    }
}

// 计算年龄助手函数
function calculateAge(year, month, day) {
    if (!year || !month || !day) return null;
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// 加载用户资料
async function loadUserProfile(uid) {
    populateBirthDateDropdowns();
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        if (error) throw error;
        if (!profile) {
            showNotification("User profile not found.", "error");
            return;
        }

        // 填充基本字段
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
        };

        setVal("firstName", profile.first_name);
        setVal("lastName", profile.last_name);
        setVal("email", profile.email);

        let displayType = profile.user_type;
        const consentSection = document.getElementById("minorGuardianConsentSection");
        
        if (profile.date_of_birth) {
            const [y, m, d] = profile.date_of_birth.split('-');
            const year = parseInt(y);
            const month = parseInt(m);
            const day = parseInt(d);
            setVal("birthYear", year);
            setVal("birthMonth", month);
            setVal("birthDay", day);

            // 核心改进：根据年龄动态判定身份
            const age = calculateAge(year, month, day);
            if (age !== null && age < 18) {
                displayType = 'minor_athlete';
                if (consentSection) consentSection.style.display = "block";

                // 加载资料时，若是未成年人则确保必填校验开启
                document.getElementById("minorAgreeCheckbox")?.setAttribute('required', '');
                document.getElementById("minorGuardianSignature")?.setAttribute('required', '');
                
                // 补签逻辑：如果数据库中已有签署记录，在 UI 上反映出来
                if (profile.guardian_consent_at) {
                    const cb = document.getElementById("minorAgreeCheckbox");
                    if (cb) cb.checked = true;
                    
                    const sig = document.getElementById("minorGuardianSignature");
                    if (sig) sig.value = profile.guardian_signature_name || "";

                    const gEmail = document.getElementById("minorGuardianEmail");
                    if (gEmail) gEmail.value = profile.guardian_email || "";

                    const gPhone = document.getElementById("minorGuardianPhone");
                    if (gPhone) gPhone.value = profile.guardian_phone || "";
                }
            } else if (displayType === 'participant') {
                // 兼容逻辑：将注册时的 'participant' 映射到 Profile 页的 'adult_athlete'
                displayType = 'adult_athlete';
            }
        }

        // 处理 Membership Type 显示
        const typeSelect = document.getElementById("memberType");
        if (typeSelect) {
            const exists = Array.from(typeSelect.options).some(opt => opt.value === displayType);
            
            if (exists) {
                typeSelect.value = displayType;
            } else if (displayType) {
                const readableLabel = displayType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                const opt = new Option(readableLabel, displayType);
                typeSelect.add(opt);
                typeSelect.value = displayType;
            }
            typeSelect.disabled = true; 
        }

        // 锁定生日字段，防止用户在 Profile 页面自行更改
        document.getElementById("birthYear").disabled = true;
        document.getElementById("birthMonth").disabled = true;
        document.getElementById("birthDay").disabled = true;

        setVal("school_name", profile.school_name);
        setVal("phone", profile.phone);
        setVal("medical_conditions", profile.medical_conditions);

        console.log("Profile loaded:", profile);

    } catch (error) {
        console.error("Error loading profile:", error);
        showNotification("Failed to load profile.", "error");
    }
}

// 保存资料
async function saveProfile() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session?.user) return;

    const saveBtn = document.querySelector(".primary.btn");
    const form = saveBtn ? saveBtn.closest('form') : null;

    // 触发浏览器原生验证
    if (form && !form.checkValidity()) {
        form.classList.add('was-validated');
        form.reportValidity(); // 显示气泡提示
        return;
    }

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const bYear = document.getElementById("birthYear").value;
    const bMonth = document.getElementById("birthMonth").value;
    const bDay = document.getElementById("birthDay").value;

    const dob = `${bYear}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;

    const profileData = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        school_name: document.getElementById("school_name").value,
        phone: document.getElementById("phone").value,
        medical_conditions: document.getElementById("medical_conditions").value
    };

    // 如果是未成年人且勾选了同意书，记录当前时间戳
    const age = calculateAge(bYear, bMonth, bDay);
    const consentCheckbox = document.getElementById("minorAgreeCheckbox");
    
    if (age !== null && age < 18 && consentCheckbox && consentCheckbox.checked) {
        // 只有在勾选的情况下才更新/发送签署信息
        profileData.guardian_consent_at = new Date().toISOString();
        profileData.guardian_signature_name = document.getElementById("minorGuardianSignature")?.value;
        profileData.guardian_email = document.getElementById("minorGuardianEmail")?.value;
        profileData.guardian_phone = document.getElementById("minorGuardianPhone")?.value;
    }

    try {
        let result;

        if (isAddMode) {
            // 执行新增逻辑
            profileData.id = crypto.randomUUID();
            profileData.email = document.getElementById("email").value;
            profileData.user_type = document.getElementById("memberType").value;
            profileData.family_id = familyIdToAdd;
            profileData.added_by_id = session.user.id;

            result = await window.supabase.from('profiles').insert([profileData]);
        } else {
            // 执行更新逻辑
            result = await window.supabase
                .from('profiles')
                .update(profileData)
                .eq('id', currentProfileUid);
        }

        const { error } = result;
        if (error) throw error;

        showNotification(isAddMode ? "Family member added successfully!" : "Profile updated successfully!");

        if (isAddMode) {
            setTimeout(() => window.location.href = "dashboard.html", 1500);
        }


    } catch (error) {
        console.error("Error saving profile:", error);
        showNotification("Failed to save profile: " + error.message, "error");
    }
}

// 绑定按钮事件
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.querySelector(".primary.btn");
    const copyGuardianBtn = document.getElementById("copyCurrentGuardianNameBtn");
    const profileCopyNameBtn = document.getElementById("profileCopyNameBtn");

    if (saveBtn) {
        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();
            saveProfile();
        });
    }

    // 复制监护人姓名按钮
    if (copyGuardianBtn) {
        copyGuardianBtn.addEventListener("click", () => {
            if (guardianName) document.getElementById("minorGuardianSignature").value = guardianName;
        });
    }

    // 协议区域复制姓名按钮 (根据模式和年龄自动判定)
    if (profileCopyNameBtn) {
        profileCopyNameBtn.addEventListener("click", () => {
            const age = calculateAge(document.getElementById("birthYear").value, document.getElementById("birthMonth").value, document.getElementById("birthDay").value);
            
            if (isAddMode && age !== null && age < 18) {
                // 添加未成年人模式：复制当前监护人姓名（代签）
                document.getElementById("registerSignature").value = guardianName || "";
            } else {
                // 添加成年人或编辑模式：复制本页输入框中的姓名
                const first = document.getElementById("firstName").value;
                const last = document.getElementById("lastName").value;
                document.getElementById("registerSignature").value = `${first} ${last}`.trim();
            }
        });
    }
});
