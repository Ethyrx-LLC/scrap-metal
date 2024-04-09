const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { faker } = require("@faker-js/faker");

const app = express();
const port = 3000;

app.use(bodyParser.json());

async function createUser() {
    try {
        const username = faker.internet.userName();
        const email = faker.internet.email();
        const password = faker.internet.password();
        const confirmPassword = password;

        const user = {
            username: username,
            email: email,
            password: password,
            confirm_password: confirmPassword,
        };

        const response = await axios.post("https://backend.kameelist.com/users/create", user);

        if (response.data.errors !== undefined) {
            return response.data.errors;
        } else {
            return response.data;
        }
    } catch (error) {
        throw error;
    }
}

async function createMultipleUsers(count) {
    const users = [];
    for (let i = 0; i < count; i++) {
        console.log(`Creating user ${i + 1} out of ${count}...`);
        try {
            const user = await createUser();
            users.push(user);
        } catch (error) {
            console.error(`Failed to create user ${i + 1}:`, error);
        }
    }
    return users;
}

// Specify the number of users to create
const numberOfUsers = 250;

// Create 250 users
createMultipleUsers(numberOfUsers)
    .then((users) => {
        console.log(`Created ${users.length} users successfully:`);
        console.log(users);
    })
    .catch((error) => {
        console.error("Failed to create users:", error);
    });
