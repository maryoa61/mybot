const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// اتصال به دیتابیس (کلیدها بعداً از طریق Environment Variables ست می‌شوند)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_AN_KEY);

// ۱. دریافت یا ساخت کاربر
app.post('/api/user', async (req, res) => {
    const { telegram_id, username } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'آی‌دی تلگرام الزامی است' });

    try {
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegram_id)
            .single();

        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ telegram_id, username: username || 'Guest', clicks: 0 }])
                .select()
                .single();
            
            if (createError) return res.status(400).json({ error: createError.message });
            return res.json(newUser);
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ۲. آپدیت امتیاز
app.post('/api/click', async (req, res) => {
    const { telegram_id, clicks } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ clicks: clicks })
            .eq('telegram_id', telegram_id)
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// مسیر تستی برای اطمینان از سلامت سرور
app.get('/', (req, res) => {
    res.send('بک‌اِند مینی‌اپ با موفقیت در حال اجراست! 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
