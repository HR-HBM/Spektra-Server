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
import { authenticateToken } from './middleware/authenticateToken.js';
import { v4 as uuidv4 } from 'uuid';


dotenv.config();

const app = express();
const port = process.env.PORT || 9000;
const rapidApiKey = process.env.RAPIDAPIKEY
const rapidApiHost = process.env.RAPIDAPIHOST

app.use(bodyParser.json());
app.use(cors());



// get current month's API call count
app.get('/api-calls/status', authenticateToken, async (req, res) => {
  const user_email = req.user.email;

  try {
    const now = new Date();
    const monthYear = now.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });

    const result = await pool.query(
      'SELECT api_calls FROM api_calls_tracker WHERE user_email=$1 AND month=$2',
      [user_email, monthYear]
    );

    const count = result.rows.length ? result.rows[0].api_calls : 0;
    const CALL_LIMIT = 20 
    
    // Calculate days remaining in current month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((lastDayOfMonth - now) / (1000 * 60 * 60 * 24));

    res.json({
      user_email,
      month_year: monthYear,
      callsUsed: count,
      callLimit: CALL_LIMIT,
      daysRemaining: daysRemaining

    });

  } catch (err) {
    console.error('Error in /api-calls/status:', err)
    res.status(500).json({ error: 'Failed to fetch API call status' });
  }
});




// get previous searches
app.get('/api-data', authenticateToken, async (req, res) => {
  const user_email = req.user.email;

  try {
    const data = await pool.query(
      'SELECT * FROM api_data WHERE user_email=$1 ORDER BY fetched_at DESC',
      [user_email]
    );
    res.json(data.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch API data' });
  }
});




//save new API data
app.post('/api-data', authenticateToken, async (req, res) => {
  const { query_id, search_term, fetched_data } = req.body;
  const user_email = req.user.email;

  try {
    const search_id = uuidv4();
    const now = new Date();

    // insert into api_data
    await pool.query(
      'INSERT INTO api_data(search_id, query_id, user_email, search_term, fetched_data, fetched_at) VALUES($1,$2,$3,$4,$5,$6)',
      [search_id, query_id, user_email, search_term, fetched_data, now]
    );

    // Track API calls
    const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const existing = await pool.query(
      'SELECT * FROM api_calls_tracker WHERE user_email=$1 AND month=$2',
      [user_email, monthYear]
    );

    if (existing.rows.length) {
      await pool.query(
        'UPDATE api_calls_tracker SET api_calls = api_calls + 1 WHERE user_email=$1 AND month=$2',
        [user_email, monthYear]
      );
    } else {
      await pool.query(
        'INSERT INTO api_calls_tracker(user_email, month, api_calls) VALUES($1,$2,1)',
        [user_email, monthYear]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save API data' });
  }
});

// Delete all search history for a user
app.delete('/api-data', authenticateToken, async (req, res) => {
  const user_email = req.user.email;

  try {
    await pool.query(
      'DELETE FROM api_data WHERE user_email=$1',
      [user_email]
    );

    await pool.query(
      'DELETE FROM search_queries WHERE user_email=$1',
      [user_email]
    );

    res.json({ success: true, message: 'History cleared successfully' });
  } catch (err) {
    console.error('Error clearing history:', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});



app.post('/search-term', authenticateToken, async (req, res) => {
  const { search_term } = req.body;
  const user_email = req.user.email;

  try {
    // check duplicate search term
    const existing = await pool.query(
      'SELECT * FROM search_queries WHERE search_term=$1 AND user_email=$2',
      [search_term, user_email]
    );

    if (existing.rows.length) {
      const query_id = existing.rows[0].query_id;
      const countRes = await pool.query(
        'SELECT COUNT(*) FROM api_data WHERE query_id=$1 AND user_email=$2',
        [query_id, user_email]
      );

      return res.json({
        duplicate: true,
        count: parseInt(countRes.rows[0].count),
        query_id
      });
    }

    // insert new search term
    const query_id = uuidv4();
    const newSearch = await pool.query(
      'INSERT INTO search_queries(query_id, search_term, user_email) VALUES($1, $2, $3) RETURNING *',
      [query_id, search_term, user_email]
    );

    res.json({ duplicate: false, query_id: newSearch.rows[0].query_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process search term' });
  }
});


//login
app.post('/login', async (req, res) => {
    const {email, password} = req.body
    try {
        const users =  await pool.query('SELECT * FROM users WHERE email = $1', [email])

        if (!users.rows.length) return res.json({detail: 'User does not exist!'})

        const success = await bcrypt.compare(password, users.rows[0].hashed_password)

        const token = jwt.sign({email}, 'secret', { expiresIn: '12h' })

        if  (success) {
            res.json({'email': users.rows[0].email, token})    
        } else {
            res.json({detail: "Login Failed! Please enter the correct password."})
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

            const token = jwt.sign({email}, 'secret', { expiresIn: '12h' })

            res.json ({email, token})

    } catch (err) {
        console.error(err)
        if (err.code === '23505') {
            return res.json({ detail: "This email is already registered. Please log in instead." });
        }
    }
})


app.get("/carData", async (req, res) => {
    try {
      // Get parameters from query string, with defaults
      const { year = '2019', make = 'toyota', model = 'camry' } = req.query;
            
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