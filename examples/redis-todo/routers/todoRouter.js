'use strict';

const Router = require('express').Router();
const Todo = require('../db/models/todoModel');
const auth = require('../middleware/auth');
const clearCache = require('../middleware/clearCache');

/* @api private
 * @func: fetch all user todos
 * @input: user id
 * @return: todos
 */
Router.get('/all', auth, async function({ userId }, res) {
  try {
    res.status(200).json({ todos: await Todo.find({ userId }).sort({ createdAt: -1 }).cache({ key: userId }) });
  } catch (err) {
    console.log(err);
    res.status(501).send('Server Error');
  }
});

/* @api private
 * @func: create todo
 * @input: todo data, userid
 * @return: todo
 */
Router.post('/create', auth, clearCache, async function({ userId, body }, res) {
  try {
    const todo = new Todo({
      text: body.text,
      completed: body.completed,
      userId
    });
    await todo.save();
    res.status(201).json({ todo });
  } catch (err) {
    res.status(501).send('Server Error');
  }
});

/* @api private
 * @func: update todo
 * @input: todo data, todoId, userid
 * @return: updated todo
 */
Router.post('/update', auth, async function({ userId, body }, res) {
  try {
    const updatedTodo = await Todo.findOneAndUpdate({ $and: [{ userId }, { _id: body.todoId }] },
      { ...body }, { new: true, sanitizeFilter: true }
    );
    if (!updatedTodo) return res.status(404).send({ msg: 'Todo not found' });

    await updatedTodo.save();
    res.status(200).json({ todo: updatedTodo });
  } catch (err) {
    res.status(501).send('Server Error');
  }
});

/* @api private
 * @func: delete todo
 * @input: todoId, userid
 */
Router.delete('/delete', auth, async function({ userId, body: { todoId } }, res) {
  try {
    await Todo.findOneAndDelete({ $and: [{ userId }, { _id: todoId }] });
    res.status(200).send({ msg: 'Todo deleted' });
  } catch (err) {
    res.status(501).send('Server Error');
  }
});

module.exports = Router;
