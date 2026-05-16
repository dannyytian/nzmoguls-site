// assets/js/supabase-init.js

// 从 Supabase Dashboard -> Project Settings -> API 获取以下信息
 const SUPABASE_URL = 'https://zgjtpgnkxiaaxicezwte.supabase.co';
 const SUPABASE_ANON_KEY = 'sb_publishable_E8GkM8xtAT03-SW3Y87tnQ_iwDltrcb';

// 初始化全局 supabase 客户端，并配置 Auth 持久化
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,   // 自动刷新令牌
    persistSession: true,     // 将会话持久化到 localStorage
    detectSessionInUrl: true  // 自动检测 URL 中的 hash（用于邮件登录/重置密码后的重定向）
  }
});