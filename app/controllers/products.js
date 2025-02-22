const pool = require('../config/mysql');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// 1) Definir el algoritmo, clave e IV
const algorithm = 'aes-256-cbc';
const cloudinary = require('cloudinary').v2;
// Deben ser EXACTAMENTE 32 bytes (key) y 16 bytes (iv).
// Aquí sólo es un ejemplo; en prod, usa variables de entorno (process.env.KEY, etc.).
const secretKey = '12345678901234567890123456789012'; 
// 16 caracteres ASCII para el IV
const ivString  = '1234567890123456';

const dotenv = require('dotenv')
dotenv.config({ path: './.env' });

const stripeSecretKey = process.env.stripe
const stripe = require('stripe')(stripeSecretKey)

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.APIKEY,
  api_secret: process.env.APISECRET
});

/**
 * Cifra un texto plano (p.e. nombre del archivo) con AES-256-CBC
 * @param {string} plainText
 * @returns {string} texto cifrado en Base64
 */
function encryptAES(plainText) {
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey, 'utf8'), 
    Buffer.from(ivString,    'utf8')
  );

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * Descifra un texto cifrado con AES-256-CBC (Base64 → UTF8)
 * @param {string} encryptedText
 * @returns {string} texto descifrado
 */
function decryptAES(encryptedText) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey, 'utf8'),
    Buffer.from(ivString,  'utf8')
  );

  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const addColumn = async (req, res) => {
    const { column } = req.body;
    pool.getConnection((err, connection) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ isEdited: false, message: 'Error al conectar con la base de datos', error: err });
      }
  
      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          console.error(err);
          return res.status(500).json({ isEdited: false, message: 'Error al iniciar la transacción', error: err });
        }
  
        connection.query(
          'ALTER TABLE Products ADD COLUMN ? VARCHAR(255)', 
          [column],
          (err, result) => {
            if (err) {
              connection.rollback(() => {
                connection.release();
                console.error(err);
                return res.status(500).json({ isEdited: false, message: 'Error al insertar la columna', error: err });
              });
            } else {
              connection.commit(err => {
                if (err) {
                  connection.rollback(() => {
                    connection.release();
                    console.error(err);
                    return res.status(500).json({ isEdited: false, message: 'Error al confirmar la transacción', error: err });
                  });
                } else {
                  connection.release();
                  return res.status(200).json({ isEdited: true });
                }
              });
            }
          }
        );
      });
    });
};

const addProduct = async (req, res) => {
  let product = req.body;

  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'products' });
    product.imageUrl = result.secure_url;
  }

  // Si se envió accidentalmente un id, se elimina
  if ('id' in product) {
    delete product.id;
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error al obtener conexión:", err);
      return res.status(500).json({ isAdded: false, message: 'Error al conectar con la base de datos', error: err });
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        console.error("Error al iniciar transacción:", err);
        return res.status(500).json({ isAdded: false, message: 'Error al iniciar la transacción', error: err });
      }

      // Insertamos el producto con el newFileName como imageUrl
      const query = 'INSERT INTO Products SET ?';
      connection.query(query, product, (err, result) => {
        if (err) {
          connection.rollback(() => {
            connection.release();
            console.error("Error al insertar el producto:", err);
            return res.status(500).json({ isAdded: false, message: 'Error al insertar el producto', error: err });
          });
        } else {
          connection.commit(err => {
            if (err) {
              connection.rollback(() => {
                connection.release();
                console.error("Error al confirmar la transacción:", err);
                return res.status(500).json({
                  isAdded: false,
                  message: 'Error al confirmar la transacción',
                  error: err
                });
              });
            } else {
              connection.release();
              return res.status(200).json({ isAdded: true, productId: result.insertId });
            }
          });
        }
      });
    });
  });
};

const editProduct = async (req, res) => {
    const { column, value, id } = req.body;
    pool.getConnection((err, connection) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ isEdited: false, message: 'Error al conectar con la base de datos', error: err });
      }
  
      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          console.error(err);
          return res.status(500).json({ isEdited: false, message: 'Error al iniciar la transacción', error: err });
        }
  
        connection.query(
          'UPDATE Products SET ? = ? WHERE id = ?', 
          [column, value, id],
          (err, result) => {
            if (err) {
              connection.rollback(() => {
                connection.release();
                console.error(err);
                return res.status(500).json({ isEdited: false, message: 'Error al editar el producto', error: err });
              });
            } else {
              connection.commit(err => {
                if (err) {
                  connection.rollback(() => {
                    connection.release();
                    console.error(err);
                    return res.status(500).json({ isEdited: false, message: 'Error al confirmar la transacción', error: err });
                  });
                } else {
                  connection.release();
                  return res.status(200).json({ isEdited: true });
                }
              });
            }
          }
        );
      });
    });
};

const deleteColumn = async (req, res) => {
    const { column } = req.body;
    const query = `UPDATE Products SET ? = NULL`;

    pool.query(query, [column], (err, result) => {
        if (err) {
        console.error('Error borrando producto:', err);
        return res.status(500).json({ isDeleted: false, message: 'Error al cambiar la columna a null', error: err });
        }else{
            const dropQuery = `ALTER TABLE Products DROP COLUMN ?`;
            pool.query(dropQuery, [column], (err, result) => {
                if (err) {
                console.error('Error borrando producto:', err);
                return res.status(500).json({ isDeleted: false, message: 'Error al eliminar la columna', error: err });
                }else{
                    return res.status(200).json({ isDeleted: true });
                }
            });
        }
    });
}

const deleteProduct = async (req, res) => {
    const { id } = req.body;
    const query = `DELETE FROM Products WHERE id = ?`;

    pool.query(query, [id], (err, result) => {
        if (err) {
        console.error('Error borrando producto:', err);
        return res.status(500).json({ isDeleted: false, message: 'Error al eliminar el producto', error: err });
        }else{
            return res.status(200).json({ isDeleted: true });
        }
    });
}

const getProducts = async (req, res) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error al conectar con la base de datos:", err);
        return res.status(500).json({ isFetched: false, message: "Error al conectar con la base de datos", error: err });
      }
  
      const query = "SELECT * FROM Products";
  
      connection.query(query, (err, results) => {
        connection.release();
        if (err) {
          console.error("Error al obtener los productos:", err);
          return res.status(500).json({ isFetched: false, message: "Error al obtener los productos", error: err });
        }
        return res.status(200).json({ isFetched: true, products: results });
      });
    });
};

const getHeaders = (req, res) => {
    const query = `
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'chamoyav_pdv' 
        AND TABLE_NAME = 'Products'
    `;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error al obtener los headers:', err);
        return res.status(500).json({ isFetched: false, message: 'Error al obtener los headers', error: err });
      }
  
      // Opcional: mapear cada resultado para incluir el tipo de input sugerido
      const headers = results.map(item => ({
        columnName: item.COLUMN_NAME,
        dataType: item.DATA_TYPE,
        inputType: mapInputType(item.DATA_TYPE)
      }));
  
      return res.status(200).json(headers);
    });
};

const getImage = (req, res) => {
  const name = req.params.name; // "Jose Luis Urquieta"
  console.log("name", name);
  
  const query = 'SELECT imageUrl FROM Products WHERE name = ?';
  pool.query(query, [name], (err, results) => {
    if (err) {
      console.error('Error al buscar la imagen en la base de datos:', err);
      return res.status(500).send('Error al obtener el archivo');
    }

    if (results.length === 0) {
      return res.status(404).send('No se encontró una imagen para ese nombre');
    }

    const fileName = results[0].imageUrl;
    const filePath = path.join(__dirname, '../uploads', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Archivo no encontrado en el servidor');
    }

    console.log("Path", filePath);
    // Si quieres devolver el archivo en binario (como imagen):
    // res.sendFile(filePath) // o pipe con FS
    return res.download(filePath); // fuerza descarga, por ejemplo
  });
};

const createCheckoutSession = async (req, res) => {
  console.log(req.body)
  try {
    // Intentar extraer products del cuerpo de la solicitud
    let { products } = req.body;
    // Si no es un array, se considera que se envió un solo producto
    if (!Array.isArray(products)) {
      products = [req.body];
    }
    
    // Stripe espera el monto en centavos
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: products.map(product => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            images: [product.image]            // Opcional: description, images, etc.
          },
          unit_amount: product.price * 100,
        },
        quantity: product.quantity || 1, // Por defecto, cantidad 1 si no se especifica
      })),
      mode: 'payment',
      success_url: 'https://tusitio.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://tusitio.com/cancel',
    });
    
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creando la sesión de checkout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}



// Función para mapear el tipo de dato a un tipo de input
const mapInputType = (dataType) => {
  switch (dataType) {
    case 'int':
    case 'decimal':
    case 'float':
      return 'number';
    case 'longblob':
    case 'blob':
      return 'file';
    default:
      return 'text';
  }
};
  
  

module.exports = { addColumn, addProduct, editProduct, deleteProduct, deleteColumn, getProducts, getHeaders, getImage, createCheckoutSession }