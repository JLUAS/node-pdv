const epxress = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const app = epxress()
const pool = require('./app/config/mysql');
dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 3030
app.use(cors())
app.use(epxress.json())

app.use('/', require('./app/routes'))
app.use(epxress.urlencoded({ extended: true }));

pool.getConnection((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
    } else {
      console.log('Conexión a MySQL establecida correctamente');
    }
  });

app.listen(PORT, () => {
    console.log('API lista por el puerto ', PORT)
})