const express = require('express');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require("swagger-ui-express");
const path = require('path');
const fileupload = require('express-fileupload');
//routes
const {
    clientRoutes
} = require("./routes/clients/clients.routes");
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

//image upload
app.use(fileupload());
//documentation
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            version: '1.0.0',
            title: 'Bus booking APIs',
            description: 'Documantaion of all bus booking APIs',
            termsOfService: "http://swagger.io/terms/",
            contact: {
                name: "Querty group",
                email: "quertygroup0@gmail.com"
            },
            servers: ['http://localhost:2500', 'https://bookinga.herokuapp.com/']
        },
        schemes: [process.env.NODE_ENV === "production" ? "https" : "http"],
        securityDefinitions: {
            bearerAuth: {
                type: "apiKey",
                name: "Authorization",
                scheme: "bearer",
                in: "header",
            }
        }
    },
    apis: ['./routes/**/*.js']
}
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocs, false, {
    docExpansion: "none"
}));

//routes
app.use('/api/v1/client', clientRoutes);
app.get('/', (req, res) => {
    return res.status(200).json({
        message: 'Welcome to Bookinga'
    })
})
//defining public folder
app.use(express.static(path.join(__dirname, 'public')))
//creating server
app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
//including database
require('./models/database');