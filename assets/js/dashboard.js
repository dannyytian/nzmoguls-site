// dashboard.js
// 负责加载并显示会员仪表盘的数据

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const memberNameEl = document.getElementById("memberName");
        if (!memberNameEl) return;

        try {
            // 从 Firestore 的 users 集合中获取当前用户文档
            const userDoc = await db.collection("users").doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const firstName = userData.firstName || "";
                const lastName = userData.lastName || "";
                
                // 合并姓名并显示
                const fullName = `${firstName} ${lastName}`.trim();
                memberNameEl.innerText = fullName || "Member";
            } else {
                console.warn("未找到用户信息文档");
                memberNameEl.innerText = "Member";
            }
        } catch (error) {
            console.error("加载仪表盘数据出错:", error);
            memberNameEl.innerText = "Member";
        }
    }
});