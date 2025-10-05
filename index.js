// import express from "express";
// import bodyParser from "body-parser";
// import axios from "axios";
// import dotenv from "dotenv";
// import lodash from "lodash";
// import bcrypt from "bcrypt";
// import session from "express-session";
// import passport from "passport";
// import cors from "cors";

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 9000;
// const rapidApiKey = process.env.RAPIDAPIKEY
// const rapidApiHost = process.env.RAPIDAPIHOST

// app.use(bodyParser.json());
// app.use(cors());

// const options = {
//   method: 'GET',
//   url: `https://${rapidApiHost}/trims`,
//   params: {
//     year: '2019',
//     make: 'toyota',
//     model: 'Camry'
//   },
//   headers: {
//     'x-rapidapi-key': rapidApiKey,
//     'x-rapidapi-host': rapidApiHost
//   }
// };

// // async function fetchData() {
// // 	try {
// // 		const response = await axios.request(options);
// // 		console.log(response.data);
// // 	} catch (error) {
// // 		console.error(error);
// // 	}
// // }

// // fetchData();

// app.get("/", (req, res) => {
//     res.send("Hello World!");
// });

// app.get("/carData", async (req, res) => {
//     try {
//       const response = await axios.request(options);
//       console.log(JSON.stringify(response.data.data.Trims, null, 2));
//       console.log('Type of Data: ', typeof response.data);
//       console.log(Object.keys(response.data));


//       res.json(response.data.data.Trims);
//     } catch (error) {
//         console.error(error);
//     }
// });

// app.listen(port, () => {
//     console.log(`Server listening on port ${port}`);
// });


import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import lodash from "lodash";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT || 9000;
const rapidApiKey = process.env.RAPIDAPIKEY
const rapidApiHost = process.env.RAPIDAPIHOST

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

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