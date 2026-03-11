const jwt = require('jsonwebtoken');
const User = require('../model/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const passport = require('passport');

const JWT_SECRET = 'agency-os-super-secret-key-2026-secure';

const signToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '90d' });
};

const serializeUser = (user) => {
    const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete userObj.password;
    return userObj;
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });
    const token = signToken(newUser._id);
    res.status(201).json({ status: 'success', token, data: { user: serializeUser(newUser) } });
});

exports.login = (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) return next(err);

        // Guard against missing 'info' object
        if (!user) {
            return next(new AppError(info ? info.message : 'Login failed', 401));
        }

        const token = signToken(user._id);
        res.status(200).json({ status: 'success', token, data: { user: serializeUser(user) } });

    })(req, res, next);
};

exports.completeOnboarding = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { onboardingCompleted: true },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: serializeUser(updatedUser)
        }
    });
});
