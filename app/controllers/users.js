const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const pool = require('../config/mysql');


const register = async (req, res) => {
  const { firstName, middleName, lastName, password, authCode, rol, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ isRegistered: false, message: 'Error al conectar con la base de datos', error: err });
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        console.error(err);
        return res.status(500).json({ isRegistered: false, message: 'Error al iniciar la transacción', error: err });
      }

      connection.query(
        'INSERT INTO Users ( firstName, middleName, lastName, password, authCode, authenticated, rol, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [firstName, middleName, lastName, hashedPassword, authCode, false, rol, email],
        (err, result) => {
          if (err) {
            connection.rollback(() => {
              connection.release();
              console.error(err);
              return res.status(500).json({ isRegistered: false, message: 'Error al insertar el usuario', error: err });
            });
          } else {
            connection.commit(err => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  console.error(err);
                  return res.status(500).json({ isRegistered: false, message: 'Error al confirmar la transacción', error: err });
                });
              } else {
                connection.release();
                return res.status(200).json({ isRegistered: true });
              }
            });
          }
        }
      );
    });
  });
};


const login = async (req, res) => {
    const { email, password } = req.body;
    pool.getConnection((err, connection) => {
        if (err) return res.status(500).send(err);
        connection.query('SELECT * FROM Users WHERE email = ?', [email], async (err, results) => {
        connection.release();
        if (err) return res.status(500).send(err);
        if (!results.length || !(await bcrypt.compare(password, results[0].password))) {
            return res.status(401).send('Nombre de usuario o contraseña incorrecta');
        }
        const token = jwt.sign({ id: results[0].id, role: results[0].rol }, 'secretkey', { expiresIn: '74h' });
        res.status(200).send({ token,
            rol: results[0].rol
        });
        });
    });
}

const isAuthenticated = async(req, res) => {
  const { email } = req.body;
  // Validar que se haya enviado el email
  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error obtaining database connection:", err);
      return res.status(500).send({ message: "Internal server error" });
    }

    connection.query(
      'SELECT authenticated FROM Users WHERE email = ?',
      [email],
      (err, results) => {
        connection.release();

        if (err) {
          console.error("Error executing query:", err);
          return res.status(500).send({ message: "Internal server error" });
        }

        // Validar si se encontró un usuario con el email proporcionado
        if (results.length === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        // Revisar el valor de "auth"
        const isAuthenticated = results[0].authenticated;
        if (isAuthenticated) {
          return res.status(200).send({ isAuthenticated: true });
        } else {
          return res.status(200).send({ isAuthenticated: false });
        }
      }
    );
  });
}

const authenticateUser = async (req, res) => {
    const { email, authCode } = req.body;
    // Verificar que los datos están presentes
    if (!email || !authCode) {
      return res.status(400).send('Faltan datos obligatorios');
    }
  
    pool.getConnection((err, connection) => {
      if (err) return res.status(500).send('Error al conectar con la base de datos');
  
      connection.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
        if (err) {
          connection.release();
          return res.status(500).send('Error en la consulta');
        }
  
        // Verificar si el usuario fue encontrado
        if (results.length === 0) {
          connection.release();
          return res.status(404).send('Usuario no encontrado');
        }
  
        // Comparar el código de autenticación
        if (authCode === results[0].authCode) {
          // Actualizar el valor de authCode a TRUE
          connection.query(
            'UPDATE Users SET authenticated = TRUE WHERE email = ?',
            [email],
            (err) => {
              connection.release();
              if (err) {
                return res.status(500).send('Error al actualizar authCode');
              }
              return res.status(200).send({ isAuthenticated: true });
            }
          );
        } else {
          connection.release();
          return res.status(401).send('Código de autenticación incorrecto');
        }
      });
    });   
}

const getUsersAdmin = async (req, res) => {
    const root = "root"
    const query = 'SELECT * FROM Users where rol != ?'; // Consulta para obtener todos los usuarios
  
    pool.query(query, root,(err, Users) => {
      if (err) {
        console.error('Error al recuperar los usuarios de la base de datos:', err);
        return res.status(500).send('Error al obtener los usuarios');
      }
  
      if (Users.length === 0) {
        return res.status(404).send('No se encontraron usuarios');
      }
  
      // Enviar los datos de los usuarios como respuesta en formato JSON
      res.json(Users);
    });
}

const editUserAdmin = async (req, res) => {
    const { email, rol } = req.body;
    // Verificar que los datos están presentes
    if (!email || !rol) {
      return res.status(400).send('Faltan datos obligatorios');
    }
  
    pool.getConnection((err, connection) => {
      if (err) return res.status(500).send('Error al conectar con la base de datos');
  
      // Verificar si el usuario existe en la base de datos
      connection.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
        if (err) {
          connection.release();
          return res.status(500).send('Error en la consulta');
        }
  
        if (results.length === 0) {
          connection.release();
          return res.status(404).send('Usuario no encontrado');
        }
  
        // Actualizar todos los valores en la base de datos
        const updateQuery = `
          UPDATE Users 
          SET email = ?, rol = ?
          WHERE email = ?
        `;
        const updateValues = [email, rol, email];
  
        connection.query(updateQuery, updateValues, (err) => {
          connection.release();
          if (err) {
            return res.status(500).send('Error al actualizar los datos del usuario');
          }
          return res.status(200).send({ isAuthenticated: true, message: 'Usuario actualizado correctamente' });
        });
      });
    });
}
 
const deleteAdmin = async (req, res) => {
  const { id } = req.body;
  const query = `DELETE FROM Users WHERE id = ?`;

  pool.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error borrando usuario:', err);
      return res.status(500).send('Error borrando usuario');
    }else{
      res.status(200).send('Usuario eliminado');
    }
  });
}

module.exports = { register, login, isAuthenticated, authenticateUser, getUsersAdmin, editUserAdmin, deleteAdmin}