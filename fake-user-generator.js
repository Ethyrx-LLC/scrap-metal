const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { faker } = require("@faker-js/faker");

const app = express();
const port = 3000;

app.use(bodyParser.json());

async function createUser() {
    try {
        console.log("Generating fake user data...");

        const username = faker.internet.userName();
        const email = faker.internet.email();
        const password = faker.internet.password();

        // Set confirmPassword to the same value as password
        const confirmPassword = password;

        const user = {
            username: username,
            email: email,
            password: password,
            confirm_password: confirmPassword, // Update the key to match backend's expectations
        };

        console.log("Generated user data:", user);

        console.log("Sending request to backend...");

        const response = await axios.post("https://backend.kameelist.com/users/create", user);

        console.log("Received response from backend:", response.data);

        // Check if errors property exists in the response
        if (response.data.errors !== undefined) {
            console.error("Failed to create user:", response.data.errors);
            return response.data.errors;
        } else {
            console.log("User created successfully");
            return response.data;
        }
    } catch (error) {
        console.error("Error:", error.response.data);
        throw error;
    }
}

// Example usage:
createUser()
    .then((response) => {
        // Handle the response here
        console.log("Response:", response);
    })
    .catch((error) => {
        console.error("Failed to create user:", error);
    });
app.listen(port, () => {
    console.log(`User generator server is running at http://localhost:${port}`);
});
