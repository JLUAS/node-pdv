const express = require('express')
const router = express.Router()
const { register, login, isAuthenticated, authenticateUser, getUsersAdmin, editUserAdmin, deleteAdmin} = require('../controllers/users')
const { validateCreateUser } = require('../validators/users')

router.post('/register', validateCreateUser, register)

router.post('/login', login)

router.post('/isAuthenticated', isAuthenticated)

router.post('/authenticateUser', authenticateUser)

router.get('/getUsers/admin', getUsersAdmin)

router.post('/editUser/admin', editUserAdmin)

router.delete('/deleteUser/admin', deleteAdmin)

module.exports = router