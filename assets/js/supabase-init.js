// assets/js/supabase-init.js

// 占位符：由 GitHub Actions 在部署时自动替换成真实的值
// const SUPABASE_URL = '{{SUPABASE_URL}}';
// const SUPABASE_ANON_KEY = '{{SUPABASE_ANON_KEY}}';
 const SUPABASE_URL = 'https://zgjtpgnkxiaaxicezwte.supabase.co';
 const SUPABASE_ANON_KEY = 'sb_publishable_E8GkM8xtAT03-SW3Y87tnQ_iwDltrcb';
 
// 加上一层安全卫士：防止没有成功注入时导致后续代码崩溃
if (!SUPABASE_URL || SUPABASE_URL.includes('{{')) {
    console.error("❌ 严重错误: Supabase 配置未能成功注入! 请检查 GitHub Actions 日志和 Variables 配置。");
}
 
// 初始化全局 supabase 客户端，并配置 Auth 持久化
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,   // 自动刷新令牌
    persistSession: true,     // 将会话持久化到 localStorage
    detectSessionInUrl: true  // 自动检测 URL 中的 hash（用于邮件登录/重置密码后的重定向）
  }
});