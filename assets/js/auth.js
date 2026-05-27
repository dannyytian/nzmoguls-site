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
        const { error } = await window.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log("Login success");
        window.location.href = "members/dashboard.html";
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// 注册
async function handleRegister(email, password, firstName, lastName, userType, dob, gender, agreements, signatureName, ipAddress, userAgent, isConfirmed) {
    try {
        // 验证电子签名：确保输入的签名与填写的姓名完全一致（含空格处理）
        const fullName = `${firstName} ${lastName}`.trim();
        if (signatureName !== fullName) {
            throw new Error("The electronic signature must match your full name exactly.");
        }

        // 拦截并验证协议勾选情况：确保所有必需的协议都已在数组中
        if (!agreements || agreements.length < 2) {
            throw new Error("You must accept all legal agreements and waivers to proceed with registration.");
        }

        const { data, error } = await window.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    user_type: userType,
                    date_of_birth: dob,
                    gender: gender,
                    accepted_agreements: agreements,
                    member_signature_name: signatureName, // 对应 profiles 表的字段名
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    is_confirmed: isConfirmed // 邮箱是否已确认或数据是否已确认
                }
            }
        });

        if (error) throw error;

        // 法律存证：将注册时签署的协议存入 legal_agreements 表
        if (data.user) {
            const uid = data.user.id;
            const agreementEntries = [];

            // 为勾选的每一项协议创建记录
            if (agreements.includes("general_agreement")) {
                agreementEntries.push({
                    profile_id: uid,
                    signer_id: uid,
                    signature_name: signatureName,
                    agreement_type: 'membership_general',
                    is_accepted: true
                });
            }
            if (agreements.includes("liability_waiver")) {
                agreementEntries.push({
                    profile_id: uid,
                    signer_id: uid,
                    signature_name: signatureName,
                    agreement_type: 'membership_waiver',
                    is_accepted: true
                });
            }

            if (agreementEntries.length > 0) {
                await window.supabase.from('legal_agreements').insert(agreementEntries);
            }
        }

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
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
        const isMemberDir = window.location.pathname.includes("/members/");
        window.location.href = isMemberDir ? "../membership.html" : "membership.html";
    } catch (error) {
        console.error(error);
    }
}

// 动态更新菜单登录/登出按钮
window.supabase.auth.onAuthStateChange((event, session) => {
    if (window.supabase && window.supabase.auth) {
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
    }
});

// 保护会员页面（未登录自动跳回 membership.html）
async function protectMemberPage() {
    const { data: { session } } = await window.supabase.auth.getSession();
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

    // 强制大写转换：First Name, Last Name, Signature
    ['registerFirstName', 'registerLastName', 'registerSignature'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                e.target.value = e.target.value.toUpperCase();
                // 恢复光标位置，防止输入时跳动
                if (start !== null) {
                    e.target.setSelectionRange(start, end);
                }
            });
        }
    });

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
        loginBtn.addEventListener("click", async () => {
            const form = loginBtn.closest('form');
            if (form && !form.checkValidity()) {
                form.classList.add('was-validated');
                form.reportValidity();
                return;
            }

            // 禁用按钮并显示加载状态
            loginBtn.disabled = true;
            const originalText = loginBtn.value;
            loginBtn.value = "Logging in...";

            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;

            try {
                await handleLogin(email, password);
            } finally {
                // 如果没有跳转（比如登录失败），恢复按钮
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.value = originalText;
                }
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener("click", async () => {
            const form = registerBtn.closest('form');
            
            // 触发浏览器原生验证并显示错误提示（气泡）
            if (form && !form.checkValidity()) {
                form.classList.add('was-validated');
                form.reportValidity();
                return;
            }

            // 防止重复点击：禁用按钮并显示加载动画文字
            registerBtn.disabled = true;
            const originalText = registerBtn.value;
            registerBtn.value = "Registering...";

            const email = document.getElementById("registerEmail").value;
            const password = document.getElementById("registerPassword").value;
            const firstName = document.getElementById("registerFirstName").value;
            const lastName = document.getElementById("registerLastName").value;
            const memberType = document.getElementById("registerMemberType").value;
            const birthYear = document.getElementById("registerBirthYear")?.value || "";
            const birthMonth = document.getElementById("registerBirthMonth")?.value || "";
            const birthDay = document.getElementById("registerBirthDay")?.value || "";
            const gender = document.getElementById("registerGender")?.value || "";
            const signatureName = document.getElementById("registerSignature").value;

            // 验证签名是否一致
            const fullName = `${firstName} ${lastName}`.trim();
            if (signatureName !== fullName) {
                showNotification("Signature must match your name exactly.", 'error');
                document.getElementById("registerSignature").focus();
                registerBtn.disabled = false;
                registerBtn.value = originalText;
                return;
            }

            // 年龄再次校验
            const age = calculateAge(birthYear, birthMonth, birthDay);
            if (age !== null && age < 18) {
                showNotification("Minors cannot register directly. Please have a guardian register first.", 'error');
                registerBtn.disabled = false;
                registerBtn.value = originalText;
                return;
            }

            // 协议勾选处理
            const agreements = [];
            if (document.getElementById("registerAgreeGeneral")?.checked) agreements.push("general_agreement");
            if (document.getElementById("registerAgreeWaiver")?.checked) agreements.push("liability_waiver");
            const isConfirmed = document.getElementById("registerAccuracyConfirm")?.checked || false;

            const userAgent = navigator.userAgent;
            
            // 确保日期合法，避免生成 2024-00-00 导致数据库 500 错误
            if (!birthYear || !birthMonth || !birthDay) {
                showNotification("Please select your full date of birth.", 'error');
                registerBtn.disabled = false;
                registerBtn.value = originalText;
                return;
            }
            const dob = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

            try {
                // 获取 IP 地址 (使用外部 API)
                let ipAddress = "Unknown";
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    const data = await res.json();
                    ipAddress = data.ip;
                } catch (e) {
                    console.warn("Could not fetch IP, proceeding with 'Unknown'");
                }

                // 调用注册逻辑并等待结果
                await handleRegister(email, password, firstName, lastName, memberType, dob, gender, agreements, signatureName, ipAddress, userAgent, isConfirmed);
                
            } finally {
                // 无论成功失败，恢复按钮状态（成功通常会跳转页面）
                registerBtn.disabled = false;
                registerBtn.value = originalText;
            }
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
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // 全局登出按钮监听（使用 capture: true 绕过模板的 stopPropagation）
    document.addEventListener("click", (e) => {
        const logoutBtn = e.target.classList.contains("logout-btn") ? e.target : e.target.closest(".logout-btn");
        if (logoutBtn) {
            e.preventDefault();
            handleLogout();
        }
    }, true);

    // 登录/注册页面初始化
    if (path.endsWith("membership.html") || path.endsWith("signup.html")) {
        initMembershipPage();
    }

    if (path.includes("/members/")) {
        initMemberPages();
    }
});
