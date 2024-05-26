// controllers/userController.js
const User = require('../models/user');
const bcrypt = require('bcrypt');

exports.registerUser = async (req, res) => {
  const { username, password, pin, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);
    const newUser = new User({ username, password: hashedPassword, pin: hashedPin, role });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.authenticateUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    res.status(200).json({ message: 'Authentication successful', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.authenticateUserByPin = async (req, res) => {
  const { username, pin } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }
    res.status(200).json({ message: 'Authentication successful', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
