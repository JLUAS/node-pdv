const { validationResult } = require('express-validator');

const validateResult = (req, res, next) => {
    try {
        // Valida los resultados de las validaciones
        validationResult(req).throw(); 
        return next(); // Si no hay errores, pasa al siguiente middleware
    } catch (err) {
        // Devuelve una respuesta clara con un código de error adecuado
        return res.status(400).json({
            success: false,
            message: "Validation error",
            errors: err.array(), // Lista detallada de errores
        });
    }
};

module.exports = { validateResult };
