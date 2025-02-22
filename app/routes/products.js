const express = require('express')
const router = express.Router()
const { addColumn, addProduct, editProduct, deleteProduct, deleteColumn, getProducts, getHeaders, getImage, createCheckoutSession } = require('../controllers/products')
const { validateCreateUser } = require('../validators/users')
const path = require('path');
const multer = require('multer');

// Define la ruta absoluta de la carpeta uploads, relativa al archivo actual
const uploadPath = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null,file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/addProduct', upload.single('image'), addProduct);

router.post('/addColumn', addColumn)

router.post('/create-checkout-session', createCheckoutSession)

router.get('/getProducts', getProducts)

router.get('/getHeaders', getHeaders)

router.get('/getImage/:name', getImage);

module.exports = router