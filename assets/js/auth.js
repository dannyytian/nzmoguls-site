// auth.js
// 依赖：firebase-init.js 已经初始化 firebase

// 登录
async function handleLogin(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log("Login success");
        window.location.href = "members/dashboard.html";
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

// 注册
async function handleRegister(email, password, firstName, lastName, memberType, birthYear, birthMonth) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // 创建用户 Firestore 文档（可扩展）
        await db.collection("users").doc(uid).set({
            email: email,
            firstName: firstName,
            lastName: lastName,
            memberType: memberType,
            birthYear: birthYear,
            birthMonth: birthMonth,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("Register success");
        window.location.href = "members/dashboard.html";
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

// 登出
async function handleLogout() {
    try {
        await auth.signOut();
        window.location.href = "../membership.html";
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

// 保护会员页面（未登录自动跳回 membership.html）
function protectMemberPage() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "../membership.html";
        }
    });
}

// 自动填充年月下拉框
function populateBirthDateDropdowns() {
    const yearSelect = document.getElementById("registerBirthYear");
    const monthSelect = document.getElementById("registerBirthMonth");
    if (!yearSelect || !monthSelect) return;

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

// 初始化 membership.html
function initMembershipPage() {
    populateBirthDateDropdowns();
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;
            handleLogin(email, password);
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener("click", () => {
            const email = document.getElementById("registerEmail").value;
            const password = document.getElementById("registerPassword").value;
            const firstName = document.getElementById("registerFirstName").value;
            const lastName = document.getElementById("registerLastName").value;
            const memberType = document.getElementById("registerMemberType").value;
            const birthYear = document.getElementById("registerBirthYear").value;
            const birthMonth = document.getElementById("registerBirthMonth").value;

            if (!email || !password || !firstName || !lastName || !memberType || !birthYear || !birthMonth) {
                alert("Please fill in all fields.");
                return;
            }

            handleRegister(email, password, firstName, lastName, memberType, birthYear, birthMonth);
        });
    }
}

// 初始化会员页面（dashboard / profile / my-events）
function initMemberPages() {
    protectMemberPage();

    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            handleLogout();
        });
    }
}

// 自动检测当前页面并初始化
window.addEventListener("load", () => {
    const path = window.location.pathname;

    if (path.endsWith("membership.html") || path.endsWith("login.html") || path.endsWith("signup.html")) {
        initMembershipPage();
    }

    if (
        path.includes("/members/dashboard.html") ||
        path.includes("/members/profile.html") ||
        path.includes("/members/my-events.html")
    ) {
        initMemberPages();
    }
});
