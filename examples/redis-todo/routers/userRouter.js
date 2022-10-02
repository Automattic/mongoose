'use strict';

const Router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Password } = require('../db/models/userModel');
const Todo = require('../db/models/todoModel');
const auth = require('../middleware/auth');

/* @public
 * @func: create new user
 * @input: username,name,email and password
 * @return: auth token
 */
Router.post('/create', async function({ body }, res) {
  try {
    // storing password
    const password = new Password({ password: body.password });
    const user = new User({
      name: body.name,
      username: body.username,
      email: body.email,
      passwordId: password._id
    }); // body = user data

    // gen auth token
    const token = await user.genAuthToken();

    // hashing password
    await password.save();
    await user.save();
    res.status(201).json({ token });
  } catch (err) {
    console.log(err);
    res.status(501).send('Server Error');
  }
});

/* @public
 * @func: login user
 * @input: user/email, password
 * @return: auth token
 */
Router.post('/login', async function({ body }, res) {
  try {
    const user = await User.findOne(
      { $or: [{ email: body.email }, { username: body.username }] }
    ).populate('passwordId');
    if (!user) return res.status(404).send({ msg: 'Invalid credential' });

    const isPassword = await bcrypt.compare(body.password, user.passwordId.password);
    if (!isPassword) return res.status(404).send({ msg: 'Invalid credential' });

    const token = user.genAuthToken();
    res.status(201).json({ token });
  } catch (err) {
    res.status(501).send('Server Error');
  }
});

/* @api private
 * @func: edit user
 * @input: username, name or password
 * @return: edited user
 */
Router.post('/update', auth, async function({ userId, body }, res) {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      { _id: userId },
      { ...body },
      { new: true });

    // if password then hash it
    if (body.password) {
      const password = await Password.findById({ _id: updatedUser.passwordId });
      password.password = body.password;
      password.save(); // hashing password
    }

    res.status(200).json({ user: updatedUser });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

/* @api private
 * @func: delete user
 */
Router.delete('/delete', auth, async function({ userId }, res) {
  try {
    await User.findByIdAndRemove({ _id: userId });
    await Todo.deleteMany({ userId });
    res.status(200).send({ msg: 'User deleted' });
  } catch (err) {
    res.status(501).send('Server Error');
  }
});

module.exports = Router;
