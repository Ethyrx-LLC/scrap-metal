const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { faker } = require("@faker-js/faker");

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Define a route for creating users
app.post("/users/create", async (req, res) => {
    try {
        // Generate fake user data
        const username = faker.internet.userName();
        const email = faker.internet.email();
        const password = faker.internet.password();
        const confirmPassword = password; // For simplicity, setting confirmPassword same as password

        // Construct the user object
        const user = {
            username: username,
            email: email,
            password: password,
            confirmPassword: confirmPassword,
        };

        // Send a POST request to the backend URL with the generated user data
        const response = await axios.post("https://backend.kameelist.com/users/create", user);

        // Return the response from the backend
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.response.data);
        res.status(error.response.status).json({ error: error.response.data });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`User generator server is running at http://localhost:${port}`);
});
