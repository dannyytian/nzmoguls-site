// assets/js/supabase-init.js

// 从 Supabase Dashboard -> Project Settings -> API 获取以下信息
const SUPABASE_URL = '{{SUPABASE_URL}}';
const SUPABASE_ANON_KEY = '{{SUPABASE_ANON_KEY}}';

// 辅助检查函数：判断是否为占位符或空值
const isInvalid = (val, name) => val === '{{' + name + '}}' || val === '' || val === null;

if (isInvalid(SUPABASE_URL, 'SUPABASE_URL') || isInvalid(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY')) {
    const msg = "Supabase configuration is missing or invalid! \n" +
                "URL: " + (SUPABASE_URL || '(empty)') + "\n" +
                "Please check GitHub Repository Secrets and Actions logs.";
    console.error(msg);
    
    // 为了防止页面彻底崩溃，我们可以提供一个虚拟对象，
    // 这样后续脚本调用 window.supabase 时不会报错，但所有数据库操作都会失效。
    window.supabase = { 
        auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getSession: async () => ({ data: { session: null } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) })
    };
} else {
    try {
        // 初始化全局 supabase 客户端，并配置 Auth 持久化
        window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            autoRefreshToken: true,   // 自动刷新令牌
            persistSession: true,     // 将会话持久化到 localStorage
            detectSessionInUrl: true  // 自动检测 URL 中的 hash
          }
        });
    } catch (e) {
        console.error("Supabase initialization failed:", e);
        window.supabase = { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } };
    }
}