// assets/js/supabase-init.js

// 从 Supabase Dashboard -> Project Settings -> API 获取以下信息
const SUPABASE_URL = '{{SUPABASE_URL}}';
const SUPABASE_ANON_KEY = '{{SUPABASE_ANON_KEY}}';

// 检查占位符是否已被 GitHub Actions 成功替换
if (SUPABASE_URL === '{{' + 'SUPABASE_URL' + '}}' || SUPABASE_ANON_KEY === '{{' + 'SUPABASE_ANON_KEY' + '}}') {
    console.error(
        "Supabase configuration is missing! \n" +
        "If you are developing locally, please put your real URL/Key in supabase-init.js. \n" +
        "If this is on production, check your GitHub Actions Secrets and deploy log."
    );
}

// 初始化全局 supabase 客户端，并配置 Auth 持久化
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,   // 自动刷新令牌
    persistSession: true,     // 将会话持久化到 localStorage
    detectSessionInUrl: true  // 自动检测 URL 中的 hash（用于邮件登录/重置密码后的重定向）
  }
});