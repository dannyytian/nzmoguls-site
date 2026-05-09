// profile.js
// 依赖：firebase-init.js + auth.js 已经加载

// 保护页面：未登录自动跳回 membership.html
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "../membership.html";
        return;
    }

    console.log("User logged in:", user.uid);
    loadUserProfile(user.uid);
});

// 自动填充年月下拉框（与 signup.html 逻辑一致）
function populateBirthDateDropdowns() {
    const yearSelect = document.getElementById("birthYear");
    const monthSelect = document.getElementById("birthMonth");
    if (!yearSelect || !monthSelect) return;

    // 清空现有选项以免重复
    monthSelect.innerHTML = '<option value="">- Month -</option>';
    yearSelect.innerHTML = '<option value="">- Year -</option>';

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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
}

// 加载用户资料
async function loadUserProfile(uid) {
    populateBirthDateDropdowns();
    try {
        const doc = await db.collection("users").doc(uid).get();

        if (!doc.exists) {
            console.warn("User profile not found, creating empty profile...");
            return;
        }

        const data = doc.data();

        document.getElementById("firstName").value = data.firstName || "";
        document.getElementById("lastName").value = data.lastName || "";
        document.getElementById("email").value = data.email || "";
        document.getElementById("birthYear").value = data.birthYear || "";
        document.getElementById("birthMonth").value = data.birthMonth || "";
        document.getElementById("memberType").value = data.memberType || "";
        document.getElementById("guardian").value = data.guardian || "";
        document.getElementById("phone").value = data.phone || "";
        document.getElementById("bio").value = data.bio || "";

        console.log("Profile loaded:", data);

    } catch (error) {
        console.error("Error loading profile:", error);
        alert("Failed to load profile.");
    }
}

// 保存资料
async function saveProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const birthYear = document.getElementById("birthYear").value;
    const birthMonth = document.getElementById("birthMonth").value;
    const memberType = document.getElementById("memberType").value;
    const guardian = document.getElementById("guardian").value;
    const phone = document.getElementById("phone").value;
    const bio = document.getElementById("bio").value;

    try {
        await db.collection("users").doc(uid).update({
            firstName,
            lastName,
            birthYear,
            birthMonth,
            memberType,
            guardian,
            phone,
            bio
        });

        alert("Profile updated successfully!");
        console.log("Profile saved");

    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile.");
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
