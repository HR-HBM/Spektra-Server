import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import lodash from "lodash";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import pool from "./dbConfig.js"
import jwt from "jsonwebtoken"


dotenv.config();

const app = express();
const port = process.env.PORT || 9000;
const rapidApiKey = process.env.RAPIDAPIKEY
const rapidApiHost = process.env.RAPIDAPIHOST

app.use(bodyParser.json());
app.use(cors());

//login
app.post('/login', async (req, res) => {
    const {email, password} = req.body
    try {
        const users =  await pool.query('SELECT * FROM users WHERE email = $1', [email])

        if (!users.rows.length) return res.json({detail: 'User does not exist!'})

        const success = await bcrypt.compare(password, users.rows[0].hashed_password)
        const token = jwt.sign({email}, 'secret', {expiresIn: '1hr'})

        if  (success) {
            res.json({'email': users.rows[0].email, token})    
        } else {
            res.json({detail: "Login Failed"})
        } 

    } catch (err) {
        console.error(err)
    }
})





//signup
app.post('/signup', async (req, res) => {
    const {email, password, username} = req.body
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(password, salt)

    try {
        await pool.query(`INSERT INTO users (email, hashed_password, user_name) VALUES($1, $2, $3)`,
            [email, hashedPassword, username])

            const token = jwt.sign({email}, 'secret', {expiresIn: '1hr'})

            res.json ({email, token})

    } catch (err) {
        console.error(err)
        if (err) {
            res.json({detail: err.detail})
        }
    }
})


app.get("/carData", async (req, res) => {
    try {
      // Get parameters from query string, with defaults
      const { year = '2019', make = 'toyota', model = 'camry' } = req.query;
      
      console.log('Received search params:', { year, make, model });
      
      // Build options with dynamic parameters
      const options = {
        method: 'GET',
        url: `https://${rapidApiHost}/trims`,
        params: {
          year: year,
          make: make.toLowerCase(),
          model: model.toLowerCase()
        },
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': rapidApiHost
        }
      };

      const response = await axios.request(options);
      
      console.log('API returned:', response.data.data.Trims.length, 'trims');
      
      res.json(response.data.data.Trims);
    } catch (error) {
        console.error('Error fetching car data:', error.message);
        res.status(500).json({ 
          error: 'Failed to fetch car data',
          message: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});