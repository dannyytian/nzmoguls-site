// auth.js
// 依赖：supabase-init.js 已经初始化 supabase

// 全局通知助手
window.showNotification = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    container.appendChild(toast);
    
    // 4秒后自动移除（匹配 CSS 动画时间）
    setTimeout(() => {
        toast.remove();
    }, 4000);
};

// 全局确认弹窗助手 (替代原生 confirm)
window.showConfirm = function(title, message) {
    return new Promise((resolve) => {
        let container = document.getElementById('modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <div class="modal-box">
                <div class="modal-header"><h3>${title}</h3></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer">
                    <button id="modal-cancel" class="button small">Cancel</button>
                    <button id="modal-confirm" class="button primary small">Confirm</button>
                </div>
            </div>
        `;

        // 触发动画
        setTimeout(() => container.classList.add('visible'), 10);

        const cleanup = (result) => {
            container.classList.remove('visible');
            setTimeout(() => {
                container.innerHTML = '';
                resolve(result);
            }, 300); // 等待淡出动画结束
        };

        container.querySelector('#modal-confirm').onclick = () => cleanup(true);
        container.querySelector('#modal-cancel').onclick = () => cleanup(false);
        
        // 点击遮罩层取消
        container.onclick = (e) => {
            if (e.target === container) cleanup(false);
        };
    });
};

// 登录
async function handleLogin(email, password) {
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log("Login success");
        window.location.href = "members/dashboard.html";
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// 注册
async function handleRegister(email, password, firstName, lastName, userType, dob, agreements, signatureName, ipAddress, userAgent) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    user_type: userType,
                    date_of_birth: dob,
                    accepted_agreements: agreements,
                    signature_name: signatureName,
                    ip_address: ipAddress,
                    user_agent: userAgent
                }
            }
        });

        if (error) throw error;

        console.log("Register success");
        if (data.session) {
            // 如果禁用了邮箱验证，注册后会自动登录，直接跳转到仪表盘或个人资料页
            window.location.href = "members/dashboard.html";
        } else {
            // 如果启用了邮箱验证，必须先确认邮件
            showNotification("Registration successful! Please check your email for confirmation.", 'success');
            window.location.href = "membership.html"; // 引导用户去会员页等待
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// 登出
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        const isMemberDir = window.location.pathname.includes("/members/");
        window.location.href = isMemberDir ? "../membership.html" : "membership.html";
    } catch (error) {
        console.error(error);
    }
}

// 动态更新菜单登录/登出按钮
supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
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
            authLink.href = isMemberDir ? "../membership.html" : "membership.html";
            authLink.className = "button small fit";
            authLink.onclick = null; // 恢复正常链接跳转
        }
        if (membershipLink) {
            membershipLink.href = isMemberDir ? "../membership.html" : "membership.html";
        }
    }
});

// 保护会员页面（未登录自动跳回 membership.html）
async function protectMemberPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "../membership.html";
    }
}

// 自动填充年月下拉框
function populateBirthDateDropdowns() {
    const yearSelect = document.getElementById("registerBirthYear");
    const monthSelect = document.getElementById("registerBirthMonth");
    const daySelect = document.getElementById("registerBirthDay");
    if (!yearSelect || !monthSelect || !daySelect) return;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m, i) => {
        let opt = document.createElement("option");
        opt.value = i + 1;
        opt.textContent = m;
        monthSelect.appendChild(opt);
    });

    // 年份默认从 2000 开始显示，向上到当前年，向下到 1940
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
        yearSelect.insertBefore(opt, yearSelect.children[1]); // 插入在 placeholder 之后
    }

    for (let d = 1; d <= 31; d++) {
        let opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        daySelect.appendChild(opt);
    }
}

// 计算年龄逻辑
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

// 根据年龄更新监护人区域
function updateGuardianVisibility() {
    const year = document.getElementById("registerBirthYear")?.value;
    const month = document.getElementById("registerBirthMonth")?.value;
    const day = document.getElementById("registerBirthDay")?.value;

    const age = calculateAge(year, month, day);
    if (age !== null && age < 18) {
        showNotification("Notice: Minors must be registered by a parent/guardian via their profile.", 'info');
    }
}

// 初始化 membership.html
function initMembershipPage() {
    populateBirthDateDropdowns();
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");

    // 监听出生日期变化
    ['registerBirthYear', 'registerBirthMonth', 'registerBirthDay'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateGuardianVisibility);
    });

    // 复制姓名到签名
    document.getElementById("copyNameBtn")?.addEventListener("click", () => {
        const first = document.getElementById("registerFirstName").value;
        const last = document.getElementById("registerLastName").value;
        const sig = document.getElementById("registerSignature");
        if (sig) sig.value = `${first} ${last}`.trim();
    });

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const form = loginBtn.closest('form');
            if (form && !form.checkValidity()) {
                form.classList.add('was-validated');
                form.reportValidity();
                return;
            }
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;
            handleLogin(email, password);
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener("click", () => {
            const form = registerBtn.closest('form');
            
            // 触发浏览器原生验证并显示错误提示（气泡）
            if (form && !form.checkValidity()) {
                form.classList.add('was-validated');
                form.reportValidity();
                return;
            }

            const email = document.getElementById("registerEmail").value;
            const password = document.getElementById("registerPassword").value;
            const firstName = document.getElementById("registerFirstName").value;
            const lastName = document.getElementById("registerLastName").value;
            const memberType = document.getElementById("registerMemberType").value;
            const birthYear = document.getElementById("registerBirthYear").value;
            const birthMonth = document.getElementById("registerBirthMonth").value;
            const birthDay = document.getElementById("registerBirthDay").value;
            const signatureName = document.getElementById("registerSignature").value;

            // 验证签名是否一致
            const fullName = `${firstName} ${lastName}`.trim();
            if (signatureName !== fullName) {
                showNotification("Signature must match your name exactly.", 'error');
                document.getElementById("registerSignature").focus();
                return;
            }

            // 年龄再次校验
            const age = calculateAge(birthYear, birthMonth, birthDay);
            if (age !== null && age < 18) {
                showNotification("Minors cannot register directly. Please have a guardian register first.", 'error');
                return;
            }

            // 协议勾选处理
            const agreements = [];
            if (document.getElementById("registerAgreeGeneral")?.checked) agreements.push("general_agreement");
            if (document.getElementById("registerAgreeWaiver")?.checked) agreements.push("liability_waiver");
            
            const userAgent = navigator.userAgent;
            const dob = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

            // 获取 IP 地址 (使用外部 API)
            fetch('https://api.ipify.org?format=json')
                .then(res => res.json())
                .then(data => {
                    handleRegister(email, password, firstName, lastName, memberType, dob, agreements, signatureName, data.ip, userAgent);
                })
                .catch(() => {
                    handleRegister(email, password, firstName, lastName, memberType, dob, agreements, signatureName, "Unknown", userAgent);
                });
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

    if (path.endsWith("membership.html") || path.endsWith("signup.html")) {
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
