const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Password must be at least 8 characters long'],
        validate: {
            // ⚡ THE FIX: Regex enforces 1 Lowercase, 1 Uppercase, and 1 Number
            validator: function (val) {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(val);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
        }
    }, // Hashed (Bcrypt)
    role: {
        type: String,
        enum: ['user', 'superadmin'],
        default: 'user'
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    lastActiveAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', UserSchema);
