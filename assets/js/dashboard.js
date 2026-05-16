// dashboard.js
// 负责加载并显示会员仪表盘的数据
// 依赖：supabase-init.js + auth.js 已经加载

supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
        const user = session.user;
        const memberNameEl = document.getElementById("memberName");
        if (!memberNameEl) return;

        try {
            // 从 Supabase 的 profiles 表中获取当前用户资料
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;

            if (profile) {
                const firstName = profile.first_name || "";
                const lastName = profile.last_name || "";
                
                // 合并姓名并显示
                const fullName = `${firstName} ${lastName}`.trim();
                memberNameEl.innerText = fullName || "Member";
            }
        } catch (error) {
            console.error("加载仪表盘数据出错:", error);
            memberNameEl.innerText = "Member";
        }
    }
});