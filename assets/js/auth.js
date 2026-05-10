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
        const isMemberDir = window.location.pathname.includes("/members/");
        window.location.href = isMemberDir ? "../membership.html" : "membership.html";
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

// 动态更新菜单登录/登出按钮
auth.onAuthStateChanged((user) => {
    const authLink = document.getElementById("menu-auth-link");
    const membershipLink = document.getElementById("menu-membership-link");
    const bannerActions = document.getElementById("banner-actions");

    if (!authLink && !membershipLink && !bannerActions) return;

    const isMemberDir = window.location.pathname.includes("/members/");
    
    if (user) {
        // 已登录状态
        if (bannerActions) {
            bannerActions.style.display = "none";
        }
        if (authLink) {
            authLink.innerText = "Log Out";
            authLink.href = "#";
            authLink.className = "button small fit logout-btn";
            authLink.onclick = (e) => {
                e.preventDefault();
                handleLogout();
            };
        }
        if (membershipLink) {
            membershipLink.href = isMemberDir ? "dashboard.html" : "members/dashboard.html";
        }
    } else {
        // 未登录状态
        if (bannerActions) {
            bannerActions.style.display = "";
        }
        if (authLink) {
            authLink.innerText = "Member Login";
            authLink.href = isMemberDir ? "../login.html" : "login.html";
            authLink.className = "button small fit";
            authLink.onclick = null; // 恢复正常链接跳转
        }
        if (membershipLink) {
            membershipLink.href = isMemberDir ? "../membership.html" : "membership.html";
        }
    }
});

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
