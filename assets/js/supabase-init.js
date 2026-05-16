// assets/js/supabase-init.js

// 占位符：由 GitHub Actions 在部署时替换
const _URL = 'https://zgjtpgnkxiaaxicezwte.supabase.co';
const _KEY = 'sb_publishable_E8GkM8xtAT03-SW3Y87tnQ_iwDltrcb';

// 辅助检查函数：判断是否为占位符或空值
const isInvalid = (val, name) => !val || val === '{{' + name + '}}' || val.includes('PLACEHOLDER');

if (isInvalid(_URL, 'SUPABASE_URL') || isInvalid(_KEY, 'SUPABASE_ANON_KEY')) {
    const msg = "Supabase configuration is missing or invalid! \n" +
                "URL: " + (_URL || '(empty)') + "\n" +
                "Please check GitHub Repository Secrets and Actions logs.";
    console.error(msg);
    
    // 为了防止页面彻底崩溃，我们可以提供一个虚拟对象，
    // 这样后续脚本调用 window.supabase 时不会报错，但所有数据库操作都会失效。
    window.supabase = { 
        auth: { 
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), 
            getSession: async () => ({ data: { session: null }, error: null }),
            signInWithPassword: async () => ({ error: { message: "Supabase not configured" } }),
            signOut: async () => ({ error: null })
        },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), maybeSingle: async () => ({ data: null }) }) }) }),
        functions: { invoke: async () => ({ data: null, error: { message: "Supabase not configured" } }) }
    };
} else {
    try {
        // 初始化全局 supabase 客户端，并配置 Auth 持久化
        window.supabase = supabase.createClient(_URL, _KEY, {
          auth: {
            autoRefreshToken: true,   // 自动刷新令牌
            persistSession: true,     // 将会话持久化到 localStorage
            detectSessionInUrl: true  // 自动检测 URL 中的 hash
          }
        });
    } catch (e) {
        console.error("Supabase initialization failed:", e);
        // 回退到虚拟对象，防止 auth.js 报错
        window.supabase = { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } };
    }
}