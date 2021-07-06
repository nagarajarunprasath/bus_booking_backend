const express = require('express');

//routes
const {
    clientRoutes
} = require("./routes/clients.routes");
//for security
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");

//cors
const cors = require("cors");
//enabling cookie
const cookieParser = require('cookie-parser');
if (process.env.NODE_ENV !== 'production') {
    const dotenv = require('dotenv');
    dotenv.config();
}
const port = process.env.PORT || 4000;
const app = express();
app.use(express.json());

//enabling cookie
app.use(cookieParser());

//cors
app.use(cors());

//set security headers
app.use(helmet());

//prevent xss scripting attacks
app.use(xss());

//prevent http param pollution
app.use(hpp());

//routes
app.use('/api/v1/client', clientRoutes);
app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
require('./models/database');