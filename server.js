'use strict';
const express = require('express');
const superagent = require('superagent')
const server = express();
const pg = require('pg');


const cors = require('cors');
server.use(cors());

require('dotenv').config();

const PORT = process.env.PORT;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
const EVENTFUL_API_KEY = process.env.EVENTFUL_API_KEY;

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error=>{throw error;})



server.get('/', (request, response) => {
    response.status(200).send('Okay its found');
});
// ///////////////////////////

server.get('/people', (request,response)=>{
    let sql = `SELECT * FROM people`;
    client.query(sql)
    .then((data)=>{
        console.log(data.rows)
        response.status(200).json(data.rows);
    });
});

server.get('/add', (request,response)=>{
    let first = request.query[`first`];
    let last = request.query[`last`];
    
    let sql = `INSERT INTO people(first_name, last_name) VALUES ($1, $2) RETURNING*`
    let queryData = [first, last];
    client.query(sql,queryData)
    .then((data)=>{
        response.status(200).json("worked");
    });
});

// ///////////////////////////

server.get('/location', locationRndering);

function Location(city, locationData) {
    this.formatted_query = locationData[0].display_name;
    this.latitude = locationData[0].lat;
    this.longitude = locationData[0].lon;
    this.search_query = city;
}

function locationRndering(request, response) {
    let city = request.query['city'];
    let sql = `SELECT * FROM location`;
    let newSql = `INSERT INTO location(city) VALUES ($1) RETURNING*`
    let queryData = [city];
    if (!queryData.include(city)) client.query(sql,queryData);
    else client.query(sql,queryData);

    getLocationData(city)
        .then((data) => {
            response.status(200).send(data);
        });
}
function getLocationData(city) {
    const locationUrl = `https://us1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;
    return superagent.get(locationUrl)
        .then((data) => {
            // console.log(data.body)
            const location = new Location(city, data.body);
            return location;
        });
}
// //////////////////////
server.get('/weather', weatherrenderring);

function Weather(day) {
    this.time = new Date(day.time * 1000).toDateString()
    this.forecast = day.summary;
}
function weatherrenderring(request,response){
    let lat = request.query['latitude'];
    let lng = request.query['longitude'];
    getWeatherData(lat,lng)
    .then((data) =>{
        response.status(200).send(data);
    });
    }
function getWeatherData(lat,lng){
    const weatherUrl = `https://api.darksky.net/forecast/${DARKSKY_API_KEY}/${lat},${lng}`;
    return superagent.get(weatherUrl)
    .then((weatherData) =>{
        let weather = weatherData.body.daily.data.map((day) => new Weather(day));
        return weather;
    });
}
// ///////////////////////////

//     {
    //       "link": "http://seattle.eventful.com/events/seattle-code-101-explore-software-development-/E0-001-126675997-3?utm_source=apis&utm_medium=apim&utm_campaign=apic",
    //       "name": "Seattle Code 101: Explore Software Development",
    //       "event_date": "Sat Dec 7 2019",
    //       "summary": "Thinking about a new career in software development? Start here! In this one-day workshop, you&#39;ll get a taste of a day in the life of a software developer. Code 101 helps you learn what it’s like to be a software developer through a day-long immersive course for beginners that focuses on front-end web development technologies. "
    //     },
    server.get('/events', eventfulRndering);

function Eventful(eventData) {
    this.link  = eventData[0].url;                                                                                                                                               
    this.name = eventData[0].title;
    this.event_date = eventData[0].start_time;
    this.summary = eventData[0].description;
}

function eventfulRndering(request, response) {
    let city = request.query.formatted_query;
    getEventfulData(city)
        .then((data) => {
            response.status(200).send(data);
        });
}

function getEventfulData(city) {
    const eventfulUrl = `http://api.eventful.com/json/events/search?app_key=${EVENTFUL_API_KEY}&location=${city}`;
    // console.log(eventfulUrl)
    return superagent.get(eventfulUrl)
    .then((eventfulData) => {
        let jsonData = JSON.parse(eventfulData.text).events.event;
        console.log(jsonData);
        const eventful = jsonData.map((day) => new Eventful(jsonData));

            return eventful;
        });
}

server.use('*', (request, response) => {
    response.status(404).send('its not found ')
});
// //////////////////////////////////
server.use((error, request, response) => {
    response.status(500).send("Sorry, something went wrong");
});

client.connect()
.then (()=>{
    server.listen(PORT, ()=>console.log('its work'));
})
.catch(err => {
    throw `Error happend ${err}`;
})