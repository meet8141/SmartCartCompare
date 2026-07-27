const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const UserLog = require('../models/UserLog');

// Setup Nodemailer Transport
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || username.length < 6 || username.length > 10) {
      return res.status(400).json({ error: 'Username must be between 6 and 10 characters' });
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters, and include one uppercase letter, one lowercase letter, one number, and one special character' });
    }

    // Check if user exists
    let existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP (Valid for 10 minutes)
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let user;

    if (existingUser) {
      if (!existingUser.isVerified && existingUser.email === email) {
        // Overwrite the unverified user with new details and send a new OTP
        existingUser.username = username;
        existingUser.password = hashedPassword;
        existingUser.verificationCode = otp;
        existingUser.verificationCodeExpires = otpExpires;
        await existingUser.save();
        user = existingUser;
      } else {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
    } else {
      user = new User({
        username,
        email,
        password: hashedPassword,
        verificationCode: otp,
        verificationCodeExpires: otpExpires,
        isVerified: false
      });
      await user.save();
    }

    // Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your SmartCart Compare Account',
      html: `
        <div style="font-family: 'Arial Black', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0a0a0a; border: 2px solid #d4ff00; border-radius: 12px;">
          <h2 style="color: #d4ff00; text-align: center; text-transform: uppercase; letter-spacing: -1px; font-size: 28px; margin-bottom: 30px;">
            SMART<span style="color: #ff2d78;">CART</span> COMPARE
          </h2>
          <div style="font-family: Arial, sans-serif; color: #f4f1ea; padding: 20px; background: rgba(244, 241, 234, 0.05); border-radius: 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hey <strong style="color: #d4ff00;">${username}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6;">You're almost in. Use the verification code below to activate your account and start comparing prices.</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <span style="display: inline-block; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0a0a0a; background: #d4ff00; padding: 15px 30px; border-radius: 8px; border: 4px solid #ff2d78; box-shadow: 6px 6px 0 #ff2d78;">
                ${otp}
              </span>
            </div>
            
            <p style="font-size: 14px; text-align: center; color: rgba(244, 241, 234, 0.6);">
              This code expires in <strong>10 minutes</strong>.
            </p>
          </div>
          <p style="font-size: 12px; color: rgba(244, 241, 234, 0.4); text-align: center; margin-top: 30px;">
            If you didn't request this, ignore this email.
          </p>
        </div>
      `
    };

    try {
      console.log(`Attempting to send OTP email to ${email}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', info.response);
    } catch (emailError) {
      console.error('CRITICAL ERROR sending OTP email:', emailError);
      // We still return success but maybe warn if email fails (in a real app you might handle this differently)
    }

    res.status(201).json({ message: 'User registered. Please check your email for the verification code.' });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Account verified successfully. You can now log in.' });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in', requiresVerification: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' },
      async (err, token) => {
        if (err) throw err;
        
        // Log the login event
        await UserLog.create({
          user: user._id,
          action: 'LOGIN'
        });

        res.status(200).json({ token, user: payload.user });
      }
    );

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
