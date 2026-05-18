/**
 * Contact Form Handler
 * 处理联系表单提交到 Supabase contact_messages 表
 */
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    const submitBtn = contactForm.querySelector('input[type="submit"]');

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 防止重复提交
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        const originalBtnValue = submitBtn.value;
        submitBtn.value = "Sending...";

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();

        try {
            if (!window.supabase) throw new Error("Supabase client not initialized.");

            const { error } = await window.supabase
                .from('contact_messages')
                .insert([{ name, email, message }]);

            if (error) throw error;

            // 使用 auth.js 中定义的全局通知助手
            if (window.showNotification) {
                window.showNotification("Thank you! Your message has been sent. We will get back to you soon.", 'success');
            } else {
                alert("Thank you! Your message has been sent. We will get back to you soon.");
            }

            contactForm.reset();
        } catch (err) {
            console.error('Error sending message:', err);
            if (window.showNotification) {
                window.showNotification("Failed to send message: " + err.message, 'error');
            } else {
                alert("Failed to send message. Please try again later.");
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.value = originalBtnValue;
        }
    });
});