const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// فعال‌سازی CORS برای اتصال بی‌دردسر فرانت‌اِند گیت‌هاب به بک‌اِند
app.use(cors());
app.use(express.json());

// اتصال به دیتابیس سوپابیس با متغیرهای محیطی
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Environment Variables!");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ۱. متد دریافت اطلاعات کاربر یا ساخت کاربر جدید (GET /api/user)
app.get('/api/user', async (req, res) => {
  try {
    const { telegram_id, username } = req.query;

    if (!telegram_id) {
      return res.status(400).json({ success: false, error: 'telegram_id is required' });
    }

    // بررسی وجود کاربر در جدول users
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    // اگر کاربر وجود نداشت، او را بساز
    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ telegram_id: parseInt(telegram_id), username: username || `user_${telegram_id}`, clicks: 0 }])
        .select()
        .single();

      if (createError) throw createError;
      return res.json({ success: true, data: newUser });
    } else if (error) {
      throw error;
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ۲. متد ثبت کلیک‌ها و افزایش امتیاز (POST /api/click)
app.post('/api/click', async (req, res) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ success: false, error: 'telegram_id is required' });
    }

    // دریافت امتیاز فعلی کاربر برای افزایش امن (اطمینان از عدم تداخل همزمانی)
    let { data: user, error: fetchError } = await supabase
      .from('users')
      .select('clicks')
      .eq('telegram_id', telegram_id)
      .single();

    if (fetchError) throw fetchError;

    const newClicks = (user.clicks || 0) + 1;

    // به‌روزرسانی امتیاز در دیتابیس
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ clicks: newClicks })
      .eq('telegram_id', telegram_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({ success: true, clicks: updatedUser.clicks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ۳. متد ذخیره و آپدیت آدرس ولت تون کاربر (POST /api/wallet)
app.post('/api/wallet', async (req, res) => {
  try {
    const { telegram_id, wallet } = req.body;

    if (!telegram_id || !wallet) {
      return res.status(400).json({ success: false, error: 'telegram_id and wallet address are required' });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ wallet: wallet })
      .eq('telegram_id', telegram_id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data: updatedUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// شروع کار سرور
app.listen(PORT, () => {
  console.log(`CyberCore backend engine running on port ${PORT}`);
});
