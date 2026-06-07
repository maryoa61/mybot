const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// تنظیمات دقیق CORS برای رفع مشکل صفحه سیاه در تلگرام
app.use(cors({
    origin: '*', // برای تست فعلاً اجازه به همه، تا قفل تلگرام باز شود
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_AN_KEY);

// ۱. دریافت یا ساخت کاربر (تغییر از POST به GET برای هماهنگی با فرانت‌اِند)
app.get('/api/user', async (req, res) => {
    // در متد GET، اطلاعات از query گرفته می‌شود
    const { telegram_id, username } = req.query;
    
    if (!telegram_id) return res.status(400).json({ error: 'آی‌دی تلگرام الزامی است' });

    try {
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegram_id)
            .single();

        if (error && error.code !== 'PGRST116') { // خطای پیدا نشدن رکورد را نادیده بگیر
            return res.status(400).json({ error: error.message });
        }

        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ telegram_id: parseInt(telegram_id), username: username || 'Guest', clicks: 0 }])
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

// ۲. آپدیت امتیاز (POST)
app.post('/api/click', async (req, res) => {
    const { telegram_id } = req.body;

    try {
        // اول امتیاز فعلی را می‌گیریم و یکی اضافه می‌کنیم (امن‌تر از فرستادن عدد از کلاینت)
        let { data: user } = await supabase
            .from('users')
            .select('clicks')
            .eq('telegram_id', telegram_id)
            .single();

        const newScore = (user ? user.clicks : 0) + 1;

        const { data, error } = await supabase
            .from('users')
            .update({ clicks: newScore })
            .eq('telegram_id', telegram_id)
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('بک‌اِند مینی‌اپ با موفقیت در حال اجراست! 🚀');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
