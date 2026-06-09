document.addEventListener('DOMContentLoaded', async () => {
    const coachesContainer = document.getElementById('coaches-container');
    const volunteersContainer = document.getElementById('volunteers-container');

    // 获取教练数据 (联表查询 profiles)
    async function fetchCoaches() {
        const { data, error } = await window.supabase
            .from('coaches')
            .select(`
                *,
                profiles (first_name, last_name, gender)
            `)
            .eq('is_active', true); // 仅获取状态为 active 的教练

        if (error) {
            console.error('Error fetching coaches:', error);
            coachesContainer.innerHTML = '<p>Unable to load coaching team.</p>';
            return;
        }

        if (data.length === 0) {
            coachesContainer.innerHTML = '<p>No active coaches found.</p>';
            return;
        }

        coachesContainer.innerHTML = data.map(coach => {
            const defaultAvatar = coach.profiles.gender === 'female' ? 'images/default-female.webp' : 'images/default-male.webp';
            
            return `
            <div class="col-6 col-12-medium">
                <div class="box alt staff-card">
                    <div class="staff-image-container">
                        <img src="${coach.image_url || defaultAvatar}" alt="${coach.profiles.first_name}" />
                    </div>
                    <div class="staff-info">
                        <span class="badge">${coach.certification_level || 'Coach'}</span>
                        <h4>${coach.profiles.first_name} ${coach.profiles.last_name}</h4>
                        <p><strong>Specialties:</strong> ${coach.specialties ? coach.specialties.join(', ') : 'Mogul Skiing'}</p>
                        <p>${coach.bio || ''}</p>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    // 获取志愿者数据
    async function fetchVolunteers() {
        const { data, error } = await window.supabase
            .from('volunteer_profiles')
            .select(`
                *,
                profiles (first_name, last_name, gender)
            `)
            .eq('status', 'active'); // 仅获取状态为 active 的志愿者

        if (error) {
            console.error('Error fetching volunteers:', error);
            volunteersContainer.innerHTML = '<p>Unable to load volunteer community.</p>';
            return;
        }

        if (data.length === 0) {
            volunteersContainer.innerHTML = '<p>No active volunteers found.</p>';
            return;
        }

        volunteersContainer.innerHTML = data.map(vol => {
            const defaultAvatar = vol.profiles.gender === 'female' ? 'images/default-female.webp' : 'images/default-male.webp';

            return `
            <div class="col-4 col-12-medium">
                <div class="box alt staff-card">
                    <div class="staff-image-container" style="height: 200px;">
                        <img src="${vol.image_url || defaultAvatar}" alt="${vol.profiles.first_name}" />
                    </div>
                    <div class="staff-info">
                        <h4>${vol.profiles.first_name} ${vol.profiles.last_name}</h4>
                        <p><strong>Skills:</strong> ${vol.skills ? vol.skills.join(', ') : 'Club Supporter'}</p>
                        <p style="font-size: 0.9em italic;">${vol.notes || ''}</p>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    // 执行加载
    await Promise.all([
        fetchCoaches(),
        fetchVolunteers()
    ]);
});