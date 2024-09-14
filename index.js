import express from 'express'
import dotenv from 'dotenv'
import {connectToDb} from './db/db.connection.js'
import {bootstrap} from'./src/bootstrap.js'


dotenv.config()

const PORT = +process.env.PORT || 3000;

const app = express()




bootstrap(app)

connectToDb()
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})