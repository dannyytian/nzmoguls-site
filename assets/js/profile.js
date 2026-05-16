// profile.js
// 依赖：supabase-init.js + auth.js 已经加载

// 保护页面：未登录自动跳回 membership.html
supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
        window.location.href = "../membership.html";
        return;
    }

    console.log("User logged in:", session.user.id);
    loadUserProfile(session.user.id);
});

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

// 加载用户资料
async function loadUserProfile(uid) {
    populateBirthDateDropdowns();
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        if (error || !profile) {
            console.warn("User profile not found");
            return;
        }

        document.getElementById("firstName").value = profile.first_name || "";
        document.getElementById("lastName").value = profile.last_name || "";
        document.getElementById("email").value = profile.email || "";
        
        if (profile.date_of_birth) {
            const [y, m, d] = profile.date_of_birth.split('-');
            document.getElementById("birthYear").value = parseInt(y);
            document.getElementById("birthMonth").value = parseInt(m);
            document.getElementById("birthDay").value = parseInt(d);
        }

        document.getElementById("memberType").value = profile.user_type || "";
        document.getElementById("school_name").value = profile.school_name || "";
        document.getElementById("phone").value = profile.phone || "";
        document.getElementById("medical_conditions").value = profile.medical_conditions || "";

        console.log("Profile loaded:", profile);

    } catch (error) {
        console.error("Error loading profile:", error);
        alert("Failed to load profile.");
    }
}

// 保存资料
async function saveProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const uid = session.user.id;

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const birthYear = document.getElementById("birthYear").value;
    const birthMonth = document.getElementById("birthMonth").value;
    const birthDay = document.getElementById("birthDay").value;

    // 将年月日组合成 Supabase 的 date 格式 (YYYY-MM-DD)
    const dob = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dob,
                school_name: document.getElementById("school_name").value,
                phone: document.getElementById("phone").value,
                medical_conditions: document.getElementById("medical_conditions").value
            })
            .eq('id', uid);

        if (error) throw error;

        alert("Profile updated successfully!");
        console.log("Profile saved");

    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile: " + error.message);
    }
}

// 绑定按钮事件
window.addEventListener("load", () => {
    const saveBtn = document.querySelector(".btn:not(.logout-btn)");
    const logoutBtn = document.querySelector(".logout-btn");

    if (saveBtn) {
        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();
            saveProfile();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});
