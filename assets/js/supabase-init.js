// assets/js/supabase-init.js

// 从 Supabase Dashboard -> Project Settings -> API 获取以下信息
 const SUPABASE_URL = 'SUPABASE_URL_PLACEHOLDER';
 const SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY_PLACEHOLDER';

// 初始化全局 supabase 客户端，并配置 Auth 持久化
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,   // 自动刷新令牌
    persistSession: true,     // 将会话持久化到 localStorage
    detectSessionInUrl: true  // 自动检测 URL 中的 hash（用于邮件登录/重置密码后的重定向）
  }
});