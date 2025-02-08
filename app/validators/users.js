const { check } = require('express-validator'); // Importación correcta
const { validateResult } = require('../helpers/validateHelper');

const validateCreateUser = [
    check('firstName')
        .exists().withMessage('First name is required') // Verifica que el campo exista
        .isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'), // Longitud mínima
    check('middleName')
        .optional() // Campo opcional
        .isLength({ min: 3 }).withMessage('Middle name must be at least 3 characters long'),
    check('lastName')
        .exists().withMessage('Last name is required')
        .isLength({ min: 3 }).withMessage('Last name must be at least 3 characters long'),
    check('password')
        .exists().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    check('authCode')
        .exists().withMessage('Auth code is required')
        .isLength({ min: 8 }).withMessage('Auth code must be at least 8 characters long'),
    check('rol')
        .exists().withMessage('Role is required')
        .isLength({ min: 3 }).withMessage('Role must be at least 3 characters long'),
    check('email')
        .exists().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),
    (req, res, next) => {
        validateResult(req, res, next); // Llama al helper para procesar resultados
    }
];

const validateUserRoleAdmin = (roles) => async (req, res, next) => {
    try {
        // Suponiendo que el rol del usuario está en `req.user.role`
        const role = req.query.role; // Captura el parámetro de consulta

        // Convertir `roles` a un array y verificar si incluye el rol del usuario
        if ([].concat(roles).includes(role)) {
            return next(); // Continuar con la siguiente función si el rol es válido
        }

        // Si el rol no es válido, devolver error
        res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' });
    } catch (e) {
        console.error('Error en validateUserRole:', e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const validateUserRoleUser = (roles) => async (req, res, next) => {
    try {
        // Suponiendo que el rol del usuario está en `req.user.role`
        const role = req.query.role; // Captura el parámetro de consulta

        // Convertir `roles` a un array y verificar si incluye el rol del usuario
        if ([].concat(roles).includes(role)) {
            return next(); // Continuar con la siguiente función si el rol es válido
        }

        // Si el rol no es válido, devolver error
        res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' });
    } catch (e) {
        console.error('Error en validateUserRole:', e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { validateCreateUser, validateUserRoleAdmin, validateUserRoleUser };
